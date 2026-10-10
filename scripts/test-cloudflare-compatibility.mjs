import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { scryptSync } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = mkdtempSync(path.join(os.tmpdir(), "recallstride-cloudflare-compatibility-"));
const schema = readFileSync(path.join(root, "server.js"), "utf8").match(/db\.exec\(`([\s\S]+?)`\);/)?.[1];
assert.ok(schema?.includes("CREATE TABLE IF NOT EXISTS users"), "Could not locate the current application schema.");

// Use an unused local port and a completely separate synthetic persistence path.
const listener = net.createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const baseUrl = `http://127.0.0.1:${port}`;
const configPath = path.join(scratch, "wrangler.jsonc");
const config = JSON.parse(readFileSync(path.join(root, "backend/cloudflare/feasibility-wrangler.jsonc"), "utf8"));
config.main = path.join(root, "backend/cloudflare/feasibility-worker.mjs");
config.vars = { SYNTHETIC_APP_SCHEMA: schema };
writeFileSync(configPath, JSON.stringify(config));

const localWrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const wranglerArguments = ["dev", "--config", configPath, "--port", String(port), "--local", "--persist-to", path.join(scratch, "storage"), "--show-interactive-dev-session=false"];
const command = existsSync(localWrangler) ? process.execPath : "npm";
const argumentsList = existsSync(localWrangler)
  ? [localWrangler, ...wranglerArguments]
  : ["exec", "--yes", "--package=wrangler@4.148.0", "--", "wrangler", ...wranglerArguments];

// Provider credentials are deliberately not inherited, and Wrangler's config
// directory is the fixture directory, so it cannot load the project's .env.
const child = spawn(command, argumentsList, {
  cwd: scratch,
  detached: process.platform !== "win32",
  env: {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR || os.tmpdir(),
    CI: "true",
    NO_COLOR: "1",
    WRANGLER_SEND_METRICS: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { output = (output + chunk).slice(-16000); });
let childError;
child.on("error", (error) => { childError = error; });

try {
  const deadline = Date.now() + 45000;
  let first;
  while (Date.now() < deadline) {
    if (childError) throw childError;
    if (child.exitCode !== null) throw new Error(`Workerd exited before the fixture became healthy.\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/probe`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) { first = await response.json(); break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.ok(first, `Local Durable Object did not become healthy.\n${output}`);
  const expectedHash = scryptSync("synthetic-password", "synthetic-fixed-salt", 64).toString("hex");
  assert.equal(first.hash, expectedHash, "Workerd must preserve existing Node scrypt password hashes.");
  assert.equal(first.express, true);
  assert.equal(first.rolledBack, true);
  assert.equal(first.runResult.changes, 1, "Affected rows must exclude index writes.");
  assert.deepEqual(first.boundValues, { nullable: null, text: "synthetic", number: 37 });
  assert.equal(first.getMissing, true);
  assert.equal(first.invalidBindingRejected, true);
  assert.equal(first.foreignKeyEnforced, true);
  assert.equal(first.asyncTransactionRejected, true);
  assert.deepEqual(first.spreadBindings, { first_value: "first", second_value: "second" });
  assert.ok(first.tableCount >= 30, "The whole application schema must be accepted by SQLite-backed storage.");
  assert.equal(first.pragmas.foreign_keys[0].foreign_keys, 1);
  assert.equal(first.pragmas["table_info(synthetic_probe)"].length, 2);
  assert.match(first.pragmas.journal_mode.error, /not authorized/);

  const secondResponse = await fetch(`${baseUrl}/probe`);
  assert.equal(secondResponse.status, 200);
  const second = await secondResponse.json();
  assert.equal(second.result.value, first.result.value + 1, "DO database writes must persist across requests.");
  const postResponse = await fetch(`${baseUrl}/probe`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ synthetic: true }),
  });
  assert.equal(postResponse.status, 201);
  assert.deepEqual(await postResponse.json(), { body: { synthetic: true } });
  const confirmationAction = async action => {
    const response = await fetch(`${baseUrl}/confirmation/probe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    assert.equal(response.status, 200);
    return response.json();
  };
  const confirmationSeed = await confirmationAction("seed");
  assert.equal(confirmationSeed.contracts, 1);
  assert.equal(confirmationSeed.confirmations, 1);
  assert.equal(confirmationSeed.rollbackVerified, true);
  assert.equal(confirmationSeed.queue.status, "delivery_failed");
  assert.equal(confirmationSeed.queue.last_error_code, "ETIMEDOUT");
  assert.equal(confirmationSeed.sent, 1);
  assert.ok(Date.parse(confirmationSeed.queue.next_attempt_at) - Date.parse(confirmationSeed.queue.created_at) >= 600000);
  assert.match(confirmationSeed.contract.termsHtml, /Synthetic Operator/);
  const persistedConfirmation = await fetch(`${baseUrl}/confirmation/probe`).then(response => response.json());
  assert.equal(persistedConfirmation.contract.sha256, confirmationSeed.contract.sha256);
  assert.deepEqual(persistedConfirmation.queue, confirmationSeed.queue);
  const confirmationDelivered = await confirmationAction("deliver");
  assert.equal(confirmationDelivered.queue.status, "delivered");
  assert.equal(confirmationDelivered.queue.attempts, 2);
  assert.equal(confirmationDelivered.sent, 2);
  assert.equal(confirmationDelivered.stableMessageId, true);
  assert.equal(confirmationDelivered.attachmentCount, 3);
  const confirmationErased = await confirmationAction("erase");
  assert.equal(confirmationErased.contracts, 0);
  assert.equal(confirmationErased.confirmations, 0);
  console.log(JSON.stringify({
    passed: true,
    measuredAt: new Date().toISOString(),
    runtime: "Wrangler/workerd local SQLite-backed Durable Object",
    applicationTables: first.tableCount - 3,
    checks: ["Express GET/JSON POST", "full application schema", "multi-statement SQL", "bound strings/numbers/null", "spread array bindings", "undefined/missing row semantics", "indexed affected-row count", "foreign keys", "transaction rollback", "async transaction rejection", "native scrypt hash compatibility", "database persistence across requests", "immutable subscription contract and unique outbox SQL", "atomic contract/outbox rollback", "persisted ten-minute confirmation retry", "leased delivery and stable Message-ID", "subscription document account-erasure cascade"],
    limitations: "Synthetic local fixtures only. No Cloudflare account, provider credentials, .env, production database, email delivery or hosting capacity was tested.",
  }, null, 2));
} finally {
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {}
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);
  rmSync(scratch, { recursive: true, force: true });
}
