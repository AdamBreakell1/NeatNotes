const assert = require("node:assert/strict");
const { test } = require("node:test");
const recoveryModule = import("./cloudflare/recovery.mjs");
const objectId = "a".repeat(64);
const bookmark = "00000001-00000001-00000001-00000000000000000000000000000000";
const undoBookmark = "00000002-00000002-00000002-00000000000000000000000000000000";

function fixture(environment = {}) {
  const calls = [];
  const ctx = { id: objectId, storage: { sql: { databaseSize: 16384 },
    getCurrentBookmark: async () => { calls.push("read"); return bookmark; },
    getBookmarkForTime: async (timestamp) => { calls.push(timestamp); return bookmark; },
    onNextSessionRestoreBookmark: async (value) => { calls.push(value); return undoBookmark; } },
    abort: (message) => { calls.push("abort"); throw new Error(message); } };
  return { ctx, calls, env: { RECOVERY_MODE: "true", MIGRATION_MODE: "true", ...environment } };
}

test("recovery returns metadata only and resolves only dates inside the retained window", async () => {
  const { createRecoveryController, RECOVERY_WINDOW_MS } = await recoveryModule;
  const { ctx, env, calls } = fixture();
  const recovery = createRecoveryController(ctx, env);
  assert.deepEqual(await recovery.info(), { objectId, bookmark, databaseBytes: 16384, retentionDays: 30, maintenance: true, nativeRecovery: true });
  assert.equal((await recovery.bookmarkForTime({ objectId, timestamp: new Date(Date.now() - 60000).toISOString() })).bookmark, bookmark);
  const count = calls.length;
  await assert.rejects(recovery.bookmarkForTime({ objectId, timestamp: new Date(Date.now() + 60000).toISOString() }), /past 30 days/);
  await assert.rejects(recovery.bookmarkForTime({ objectId, timestamp: new Date(Date.now() - RECOVERY_WINDOW_MS - 60000).toISOString() }), /past 30 days/);
  await assert.rejects(recovery.bookmarkForTime({ objectId: "b".repeat(64), timestamp: new Date().toISOString() }), /does not match/);
  assert.equal(calls.length, count, "Invalid recovery requests must not reach Cloudflare storage.");
});

test("restoration requires explicit operator mode, maintenance and exact object confirmation", async () => {
  const { createRecoveryController } = await recoveryModule;
  const input = { objectId, bookmark, confirmRestoreObject: objectId };
  for (const [environment, message] of [[{ RECOVERY_MODE: "false" }, /RECOVERY_MODE/], [{ MIGRATION_MODE: "false" }, /maintenance/]]) {
    const { ctx, env, calls } = fixture(environment);
    await assert.rejects(createRecoveryController(ctx, env).prepare(input), message);
    assert.deepEqual(calls, []);
  }
  const { ctx, env, calls } = fixture();
  const recovery = createRecoveryController(ctx, env);
  await assert.rejects(recovery.prepare({ ...input, confirmRestoreObject: undefined }), /Explicit confirmation/);
  await assert.rejects(recovery.prepare({ ...input, objectId: "b".repeat(64) }), /does not match/);
  await assert.rejects(recovery.prepare({ ...input, bookmark: "bad" }), /Invalid recovery/);
  assert.deepEqual(calls, []);
});

test("restore preparation records its undo point before a separately confirmed restart", async () => {
  const { createRecoveryController, RECOVERY_RESTART_MESSAGE } = await recoveryModule;
  const { ctx, env, calls } = fixture();
  const recovery = createRecoveryController(ctx, env);
  const input = { objectId, bookmark, confirmRestoreObject: objectId };
  const prepared = await recovery.prepare(input);
  assert.equal(prepared.undoBookmark, undoBookmark);
  assert.equal(prepared.restoreBookmark, bookmark);
  assert.equal(prepared.status, "restore_on_next_restart");
  assert.deepEqual(calls, [bookmark], "Preparation must not restart before the operator saves the undo bookmark.");
  assert.throws(() => recovery.restart({ objectId, confirmRestoreObject: "b".repeat(64) }), /Explicit confirmation/);
  assert.throws(() => recovery.restart(input), new RegExp(RECOVERY_RESTART_MESSAGE));
  assert.deepEqual(calls, [bookmark, "abort"]);
});

test("temporary recovery endpoint authenticates every method and propagates guard failures", async () => {
  const { default: worker } = await import("./cloudflare/recovery-worker.mjs");
  const secret = "synthetic-recovery-token-0123456789abcdef";
  let requested = false;
  const env = { RECOVERY_SECRET: secret, RECALLSTRIDE_DB: { getByName: (name) => {
    requested = true;
    assert.equal(name, "recallstride-production");
    return { recoveryInfo: async () => ({ objectId }), restartRecovery: async () => { throw new Error("Put the application in maintenance before restoring its database."); } };
  } } };
  assert.equal((await worker.fetch(new Request("https://recovery.example/status"), env)).status, 404);
  assert.equal(requested, false);
  const headers = { Authorization: `Bearer ${secret}` };
  assert.deepEqual(await (await worker.fetch(new Request("https://recovery.example/status", { headers }), env)).json(), { objectId });
  const rejected = await worker.fetch(new Request("https://recovery.example/restart", { method: "POST", headers, body: JSON.stringify({ objectId }) }), env);
  assert.equal(rejected.status, 409);
  assert.match((await rejected.json()).error, /maintenance/);
});

test("operator cleanup refuses the production Worker before loading authentication or sending a request", async () => {
  const { deleteTemporaryWorker } = await import("../scripts/cloudflare-operator.mjs");
  await assert.rejects(deleteTemporaryWorker("recallstride"), /Only a temporary recovery Worker/);
  await assert.rejects(deleteTemporaryWorker("unrelated-worker"), /Only a temporary recovery Worker/);
});
