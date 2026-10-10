import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function main(args = process.argv.slice(2)) {
  const options = new Map();
  const keys = ["--url", "--token-file", "--command", "--output", "--object-id", "--timestamp", "--bookmark", "--confirm-restore-object"];
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(keys.includes(args[i]) && args[i + 1], `Supported options: ${keys.join(", ")}.`);
    options.set(args[i], args[i + 1]);
  }
  const command = options.get("--command");
  assert.ok(["status", "bookmark", "prepare", "restart"].includes(command), "Choose status, bookmark, prepare or restart.");
  const url = new URL(options.get("--url"));
  assert.ok((url.protocol === "https:" && /^recallstride-recovery(?:-[a-z0-9-]+)?\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname))
    || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)), "Use the temporary RecallStride recovery Worker or a local fixture.");
  assert.ok(!url.username && !url.password && !url.search && !url.hash && url.pathname === "/", "Recovery URL must be an origin without credentials or query parameters.");
  const tokenFile = options.get("--token-file");
  assert.ok(tokenFile && (fs.statSync(tokenFile).mode & 0o077) === 0, "Recovery token file must be private (0600).");
  const token = fs.readFileSync(tokenFile, "utf8").trim();
  assert.ok(token.length >= 32 && !/[\r\n]/.test(token), "The private recovery token is invalid.");
  const output = options.get("--output");
  assert.ok(output, "Provide a private output path; prepare records the undo bookmark there before restart.");
  const input = { objectId: options.get("--object-id"), timestamp: options.get("--timestamp"),
    bookmark: options.get("--bookmark"), confirmRestoreObject: options.get("--confirm-restore-object") };
  if (command !== "status") assert.match(input.objectId || "", /^[a-f0-9]{64}$/, "A recorded database object ID is required.");
  if (["prepare", "restart"].includes(command)) assert.equal(input.confirmRestoreObject, input.objectId, "Explicit --confirm-restore-object must match --object-id.");
  // Refuse overwriting a saved undo point and prove the destination is writable
  // before any remote mutation. No secret is written to the result artifact.
  const fd = fs.openSync(path.resolve(output), "wx", 0o600);
  try {
    const response = await fetch(new URL(`/${command}`, url), { method: command === "status" ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, ...(command === "status" ? {} : { "Content-Type": "application/json" }) },
      ...(command === "status" ? {} : { body: JSON.stringify(input) }), redirect: "error", signal: AbortSignal.timeout(30_000) });
    const result = await response.json();
    assert.ok(response.ok, `Recovery request failed (HTTP ${response.status}): ${result.error || "Unexpected response"}`);
    fs.writeFileSync(fd, JSON.stringify({ ...result, operatorUrl: url.origin, recordedAt: new Date().toISOString() }, null, 2) + "\n");
    fs.fsyncSync(fd);
    console.log(`Saved recovery ${command} metadata privately. ${command === "prepare" ? "Preserve the undo bookmark before requesting restart." : "No customer records were exported."}`);
  } finally { fs.closeSync(fd); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
