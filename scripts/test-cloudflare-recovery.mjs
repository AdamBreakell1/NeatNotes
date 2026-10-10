// Native PITR is not implemented by local workerd. This explicit remote drill
// uses a new namespace containing synthetic records, then deletes that namespace.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { deleteTemporaryWorker } from "./cloudflare-operator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const account = "7656ff3b3eaa33f5eb0e17d1b026f7f0";
const workerName = `recallstride-recovery-rehearsal-${randomBytes(4).toString("hex")}`;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-recovery-drill-"));
const configFile = path.join(temporary, "wrangler.jsonc");
const token = randomBytes(32).toString("hex");
const environment = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR || os.tmpdir(),
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false", CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
  WRANGLER_SEND_METRICS: "false", WRANGLER_WRITE_LOGS: "false", WRANGLER_LOG_SANITIZE: "true", NO_COLOR: "1", CI: "true" };
let deployed = false;
let drillError;
let evidence = { workerName, account, syntheticOnly: true, productionDatabaseAccessed: false, checks: [] };

async function wrangler(args, stdin = "") {
  const child = spawn(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"), ...args, "--config", configFile],
    { cwd: temporary, env: environment, stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(stdin);
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (part) => { output = (output + part).slice(-12000); });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  assert.equal(code, 0, `Wrangler ${args[0]} failed: ${output.replaceAll(token, "[redacted]")}`);
  return output;
}

const config = { name: workerName, account_id: account, main: path.join(root, "backend/cloudflare/recovery-rehearsal-worker.mjs"),
  compatibility_date: "2026-10-09", compatibility_flags: ["nodejs_compat"], workers_dev: true,
  durable_objects: { bindings: [{ name: "REHEARSAL_DB", class_name: "RecallStrideRecoveryRehearsal" }] },
  migrations: [{ tag: "v1", new_sqlite_classes: ["RecallStrideRecoveryRehearsal"] }],
  vars: { NODE_ENV: "production", MIGRATION_MODE: "true", RECOVERY_MODE: "true", BASE_URL: "https://synthetic-recovery.invalid",
    CORS_ORIGIN: "https://synthetic-recovery.invalid", CONTACT_RETRY_INTERVAL_MS: "0", ALLOW_MOCK_BILLING: "false",
    SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", EMAIL_FROM: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" } };
fs.writeFileSync(configFile, JSON.stringify(config));

function checked(label) { evidence.checks.push(label); console.log(`PASS ${label}`); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  assert.ok(process.argv.includes("--remote"), "Use --remote to authorize an isolated native recovery drill. No production namespace is ever bound.");
  assert.match(workerName, /^recallstride-recovery-rehearsal-[a-f0-9]{8}$/);
  const output = await wrangler(["deploy"]);
  deployed = true;
  const origin = output.match(new RegExp(`https://${workerName}\\.[a-z0-9-]+\\.workers\\.dev`))?.[0];
  assert.ok(origin, "The isolated rehearsal Worker URL was not returned.");
  await wrangler(["secret", "put", "RECOVERY_SECRET"], token);
  // New workers.dev routes and a subsequent secret upload can take time to
  // propagate. Allow the bounded readiness checks to observe the final script.
  await sleep(5000);
  async function request(endpoint, input, expected = 200) {
    const response = await fetch(origin + endpoint, { method: input === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, ...(input === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }), redirect: "error", signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    let result;
    try { result = JSON.parse(body); } catch {
      const platformDetail = body.match(/<title>([^<]{0,200})<\/title>/i)?.[1]
        || body.match(/Error\s+(?:code\s*:\s*)?\d{3,5}/i)?.[0] || "Non-JSON platform response";
      throw new Error(`Synthetic recovery ${endpoint} failed (HTTP ${response.status}): ${platformDetail}`);
    }
    assert.equal(response.status, expected, `Synthetic recovery ${endpoint} failed: ${JSON.stringify(result)}`);
    return result;
  }
  let ready;
  for (let i = 0; i < 15; i++) {
    try { ready = await request("/status"); break; } catch (error) { if (i === 14) throw error; await sleep(2000); }
  }
  assert.equal(ready.nativeRecovery, true);
  assert.equal((await fetch(origin + "/status", { signal: AbortSignal.timeout(10000) })).status, 404);
  checked("Native SQLite recovery available on an isolated authenticated Durable Object");
  let original;
  for (let attempt = 0; attempt < 4; attempt++) {
    try { original = await request("/seed", {}); break; }
    catch (error) {
      if (!String(error.message).includes("HTTP 404") || attempt === 3) throw error;
      await sleep(5000);
    }
  }
  assert.equal(original.users, 1);
  assert.equal(original.notes, 1);
  assert.equal(original.plan, "pro");
  assert.equal(original.foreignKeyErrors, 0);
  assert.ok(original.databaseTables >= 39, "Rehearsal must initialize the actual RecallStride schema.");
  const point = await request("/status");
  // Fresh remote databases may not have a durable history entry immediately.
  // Wait using metadata-only calls rather than reseeding/redeploying fixtures.
  let fromTime;
  for (let attempt = 0; attempt < 12; attempt++) {
    try { fromTime = await request("/bookmark", { objectId: point.objectId, timestamp: new Date(Date.now() - 100).toISOString() }); break; }
    catch (error) {
      if (!/no history|HTTP 404/.test(String(error.message))) throw error;
      if (attempt === 11) {
        evidence.timestampLookup = "New namespace timestamp history was not available within the bounded readiness window; restore uses its saved current bookmark.";
        break;
      }
      await sleep(5000);
    }
  }
  if (fromTime) {
    assert.ok(fromTime.bookmark);
    evidence.timestampLookup = "passed";
  }
  checked("Actual application schema, account hash, Pro entitlement, Unicode note and binary data recorded");
  const damaged = await request("/damage", {});
  assert.notEqual(damaged.sha256, original.sha256);
  assert.equal(damaged.plan, "free");
  const mutation = { objectId: point.objectId, bookmark: point.bookmark, confirmRestoreObject: point.objectId };
  const prepared = await request("/prepare", mutation);
  assert.ok(prepared.undoBookmark);
  // Keep undo evidence outside the object before forcing its next session.
  fs.writeFileSync(path.join(temporary, "undo.json"), JSON.stringify(prepared), { mode: 0o600 });
  await request("/restart", mutation, 202);
  const restored = await request("/inspect");
  assert.equal(restored.sha256, original.sha256);
  assert.equal(restored.plan, "pro");
  assert.equal(restored.foreignKeyErrors, 0);
  checked("Native point-in-time restore recovers the original account, entitlement, note and bytes exactly");
  const undoMutation = { ...mutation, bookmark: prepared.undoBookmark };
  await request("/prepare", undoMutation);
  await request("/restart", undoMutation, 202);
  const undone = await request("/inspect");
  assert.equal(undone.sha256, damaged.sha256);
  checked("Saved undo bookmark reverses the restore without loss of intervening synthetic changes");
  evidence = { ...evidence, testedAt: new Date().toISOString(), objectId: point.objectId,
    originalSha256: original.sha256, damagedSha256: damaged.sha256, restoredSha256: restored.sha256,
    restoredForeignKeyErrors: restored.foreignKeyErrors, databaseTables: restored.databaseTables,
    nativeRetentionDays: point.retentionDays };
} catch (error) {
  drillError = error;
  evidence.error = String(error.message).replaceAll(token, "[redacted]").slice(0, 1000);
} finally {
  if (deployed) {
    // Deleting a Worker alone does not delete its Durable Object data. An
    // explicit class-deletion migration removes only this fixture namespace.
    config.durable_objects = { bindings: [] };
    config.migrations.push({ tag: "v2-remove-rehearsal", deleted_classes: ["RecallStrideRecoveryRehearsal"] });
    fs.writeFileSync(configFile, JSON.stringify(config));
    await wrangler(["deploy"]);
    await deleteTemporaryWorker(workerName);
    evidence.syntheticNamespaceDeleted = true;
    evidence.temporaryWorkerDeleted = true;
    evidence.temporarySecretDeleted = true;
    checked("Synthetic namespace, temporary Worker and recovery secret removed");
  }
  fs.writeFileSync(path.join(root, "docs/validation/cloudflare-recovery-rehearsal-2026-10-10.json"), JSON.stringify(evidence, null, 2) + "\n");
  fs.rmSync(temporary, { recursive: true, force: true });
}
if (drillError) throw drillError;
