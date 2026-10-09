const assert = require("node:assert/strict");
const { test } = require("node:test");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createApplication } = require("../server");
const transferModule = import("./cloudflare/data-transfer.mjs");
const root = path.resolve(__dirname, "..");
const timestamp = "2026-10-08T10:00:00.000Z";

function database(file = ":memory:") {
  const db = new DatabaseSync(file);
  createApplication({ db, staticAssets: false, environment: { NODE_ENV: "development", BASE_URL: "http://127.0.0.1:9999",
    SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", EMAIL_FROM: "", STRIPE_SECRET_KEY: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
  runtime: { scheduleCleanup: false } });
  db.exec("CREATE TABLE binary_fixtures(id TEXT PRIMARY KEY, payload BLOB NOT NULL)");
  return db;
}

function seedAccount(db, id = "synthetic-student") {
  const salt = "synthetic-stable-salt";
  const hash = crypto.scryptSync("SyntheticPass123", salt, 64).toString("hex");
  db.prepare(`INSERT INTO users(id,email,name,password_salt,password_hash,email_verified,plan,plan_status,stripe_customer_id,created_at,updated_at)
    VALUES(?,?,?,?,?,1,'pro','active',?,?,?)`).run(id, `${id}@example.test`, "Synthetic student", salt, hash, `cus_fixture_${id}`, timestamp, timestamp);
  db.prepare("INSERT INTO workspaces(id,name,owner_id,kind,created_at,updated_at) VALUES(?,?,?,'personal',?,?)").run(`${id}-workspace`, "Fixture workspace", id, timestamp, timestamp);
  db.prepare("INSERT INTO workspace_members VALUES(?,?,?,?)").run(`${id}-workspace`, id, "owner", timestamp);
  db.prepare("INSERT INTO notes VALUES(?,?,?,?,?,?,?,?,?)").run(`${id}-note`, `${id}-workspace`, id, "Unicode fixture 🧠\nPrivate note preserved exactly.", "fixture", "Fixture title", "Fixture summary", timestamp, timestamp);
  db.prepare("INSERT INTO note_versions VALUES(?,?,?,?,?,?,?,?,?,?)").run(`${id}-version`, `${id}-note`, `${id}-workspace`, id, "Earlier fixture body", "fixture", "Earlier title", "Earlier summary", timestamp, timestamp);
  db.prepare("INSERT INTO student_profiles(user_id,created_at,updated_at) VALUES(?,?,?)").run(id, timestamp, timestamp);
  db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,user_agent,last_used_at,created_at) VALUES(?,?,?,?,?,?)").run(`${id}-session`, id, "2026-11-01T00:00:00.000Z", "Synthetic fixture", timestamp, timestamp);
  db.prepare("INSERT INTO coding_practice_attempts VALUES(?,?,?,?,?)").run(id, "fixture-attempt", "fixture-request-hash", JSON.stringify({ taskId: "fixture", trusted: false }), timestamp);
  db.prepare("INSERT INTO pilot_events VALUES(?,?,?,?,?,?,?)").run("fixture-event", id, "coding_session_started", "fixture-session", null, "learn", timestamp);
  const exam = db.prepare(`INSERT INTO exam_attempts(id,user_id,question_id,topic_id,original_attempt_id,answer,proposed_mark,maximum_mark,rubric_result,created_at)
    VALUES(?,?,?,?,?,?,0,1,'{}',?)`);
  exam.run("z-original", id, "synthetic-question", "cs-1-1-1", null, "Original fixture", timestamp);
  exam.run("a-retry", id, "synthetic-question", "cs-1-1-1", "z-original", "Retry fixture", timestamp);
  db.prepare("INSERT INTO binary_fixtures VALUES(?,?)").run("bytes", Buffer.from([0, 1, 127, 255]));
  return { id, hash, salt };
}

function child(script, args) {
  return new Promise((resolve, reject) => {
    const processHandle = spawn(process.execPath, [path.join(root, script), ...args], {
      cwd: root, env: { PATH: process.env.PATH, HOME: process.env.HOME }, stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "", stderr = "";
    processHandle.stdout.on("data", (chunk) => { stdout = (stdout + chunk).slice(-8000); });
    processHandle.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-8000); });
    processHandle.on("error", reject);
    processHandle.on("exit", (code) => resolve({ code, stdout, stderr }));
  });
}

test("complete migration preserves accounts, hashes, subscriptions, notes, history and foreign keys across resumable chunks", async () => {
  const { createMigrationExport, createDataTransfer } = await transferModule;
  const source = database(), target = database();
  let snapshot;
  try {
    const owner = seedAccount(source);
    snapshot = createMigrationExport(source, { rowsPerChunk: 2 });
    const chunks = [...snapshot.chunks()];
    assert.ok(snapshot.manifest.tables.some((table) => table.name === "runtime_metadata"));
    assert.ok(snapshot.manifest.tables.some((table) => table.name === "coding_practice_attempts"));
    assert.ok(snapshot.manifest.tables.some((table) => table.name === "pilot_events"));
    const exams = chunks.filter((chunk) => chunk.table === "exam_attempts");
    assert.equal(exams[0].rows[0][0], "z-original", "Parent attempt must precede lexically earlier retry.");
    let transfer = createDataTransfer(target);
    assert.equal(transfer.importStatus().status, "not_started");
    transfer.beginImport(snapshot.manifest);
    const midpoint = Math.floor(chunks.length / 2);
    for (const chunk of chunks.slice(0, midpoint)) transfer.appendImport(chunk);
    transfer = createDataTransfer(target); // Simulate a cold object restart.
    assert.equal(transfer.beginImport(snapshot.manifest).nextChunk, midpoint);
    assert.equal(transfer.appendImport(chunks[midpoint - 1]).duplicate, true);
    for (const chunk of chunks.slice(midpoint)) transfer.appendImport(chunk);
    const completed = transfer.finishImport();
    assert.equal(completed.status, "complete");
    assert.equal(completed.importedRows, completed.totalRows);
    assert.equal(transfer.finishImport().status, "complete");
    const user = target.prepare("SELECT * FROM users WHERE id=?").get(owner.id);
    assert.equal(user.password_hash, owner.hash);
    assert.equal(user.password_salt, owner.salt);
    assert.equal(crypto.scryptSync("SyntheticPass123", user.password_salt, 64).toString("hex"), user.password_hash);
    assert.equal(user.plan, "pro");
    assert.equal(user.stripe_customer_id, `cus_fixture_${owner.id}`);
    assert.deepEqual(target.prepare("SELECT * FROM notes").all(), source.prepare("SELECT * FROM notes").all());
    assert.deepEqual(target.prepare("SELECT * FROM sessions").all(), source.prepare("SELECT * FROM sessions").all());
    assert.deepEqual([...target.prepare("SELECT payload FROM binary_fixtures").get().payload], [0, 1, 127, 255]);
    assert.equal(target.prepare("PRAGMA foreign_key_check").all().length, 0);
    assert.equal(transfer.appendImport(chunks[0]).duplicate, true);
  } finally { snapshot?.close(); source.close(); target.close(); }
});

test("migration refuses a live target and changed, incomplete or out-of-order data without duplicate insertion", async () => {
  const { createMigrationExport, createDataTransfer } = await transferModule;
  const source = database(), target = database(), live = database();
  let snapshot;
  try {
    seedAccount(source);
    seedAccount(live, "existing-student");
    snapshot = createMigrationExport(source, { rowsPerChunk: 2 });
    const chunks = [...snapshot.chunks()];
    const liveTransfer = createDataTransfer(live);
    assert.throws(() => liveTransfer.beginImport(snapshot.manifest), /existing account or operational data/);
    assert.equal(live.prepare("SELECT name FROM users WHERE id='existing-student'").get().name, "Synthetic student");
    assert.equal(live.prepare("SELECT COUNT(*) AS n FROM notes").get().n, 1);
    assert.equal(liveTransfer.importStatus().status, "not_started");
    const transfer = createDataTransfer(target);
    transfer.beginImport(snapshot.manifest);
    assert.throws(() => transfer.appendImport(chunks[1]), /in sequence/);
    const changed = structuredClone(chunks[0]);
    changed.rows[0][0] = "tampered";
    assert.throws(() => transfer.appendImport(changed), /checksum/);
    assert.equal(transfer.importStatus().nextChunk, 0);
    transfer.appendImport(chunks[0]);
    assert.equal(transfer.appendImport(chunks[0]).duplicate, true);
    assert.equal(transfer.importStatus().nextChunk, 1);
    assert.throws(() => transfer.finishImport(), /Import all chunks/);
    for (const chunk of chunks.slice(1)) transfer.appendImport(chunk);
    target.prepare("UPDATE notes SET body='corrupted fixture'").run();
    assert.throws(() => transfer.finishImport(), /verification failed for notes/);
    assert.equal(transfer.importStatus().status, "failed");
  } finally { snapshot?.close(); source.close(); target.close(); live.close(); }
});

test("invalid manifest schemas and self-reference cycles are rejected before target seed replacement", async () => {
  const { createMigrationExport, createDataTransfer } = await transferModule;
  const source = database(), target = database();
  let snapshot;
  try {
    seedAccount(source);
    snapshot = createMigrationExport(source);
    const originalCount = target.prepare("SELECT COUNT(*) AS n FROM flashcard_decks").get().n;
    const bad = structuredClone(snapshot.manifest);
    bad.tables[0].name = "not_a_real_table";
    delete bad.sha256;
    bad.sha256 = crypto.createHash("sha256").update(JSON.stringify(bad)).digest("hex");
    assert.throws(() => createDataTransfer(target).beginImport(bad), /not contain|parent-first|chunk/);
    assert.equal(target.prepare("SELECT COUNT(*) AS n FROM flashcard_decks").get().n, originalCount);
    snapshot.close();
    snapshot = null;
    source.transactionSync(() => {
      source.prepare("UPDATE exam_attempts SET original_attempt_id='a-retry' WHERE id='z-original'").run();
    });
    assert.throws(() => createMigrationExport(source), /self-reference cycle/);
  } finally { snapshot?.close(); source.close(); target.close(); }
});

test("private export and import CLIs stream valid JSON, restrict file permissions and resume through an authenticated local transfer service", async () => {
  const { createDataTransfer } = await transferModule;
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-migration-cli-"));
  const source = database(path.join(scratch, "synthetic.sqlite")), target = database();
  let server;
  try {
    seedAccount(source);
    const artifact = path.join(scratch, "fixture.migration-private.json");
    const exported = await child("scripts/export-migration.mjs", ["--source", path.join(scratch, "synthetic.sqlite"), "--output", artifact]);
    assert.equal(exported.code, 0, exported.stderr);
    assert.equal(fs.statSync(artifact).mode & 0o777, 0o600);
    const parsed = JSON.parse(fs.readFileSync(artifact, "utf8"));
    assert.ok(parsed.manifest.tables.length >= 39);
    const overwritten = await child("scripts/export-migration.mjs", ["--source", path.join(scratch, "synthetic.sqlite"), "--output", artifact]);
    assert.equal(overwritten.code, 1);
    assert.equal(JSON.parse(fs.readFileSync(artifact, "utf8")).manifest.importId, parsed.manifest.importId);
    const transfer = createDataTransfer(target);
    transfer.beginImport(parsed.manifest);
    transfer.appendImport(parsed.chunks[0]); // A prior interrupted operator run.
    const token = "synthetic-private-transfer-token-0123456789";
    const tokenFile = path.join(scratch, "fixture.token");
    fs.writeFileSync(tokenFile, token, { mode: 0o600 });
    let requests = 0;
    server = http.createServer(async (req, res) => {
      requests += 1;
      if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(404).end(); return; }
      try {
        const parts = [];
        for await (const part of req) parts.push(part);
        const input = parts.length ? JSON.parse(Buffer.concat(parts)) : null;
        const value = req.url === "/begin" ? transfer.beginImport(input)
          : req.url === "/chunk" ? transfer.appendImport(input)
          : req.url === "/finish" ? transfer.finishImport() : transfer.importStatus();
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(value));
      } catch (error) { res.writeHead(409, { "Content-Type": "application/json" }).end(JSON.stringify({ error: error.message })); }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const imported = await child("scripts/import-migration.mjs", ["--input", artifact, "--url", url, "--token-file", tokenFile]);
    assert.equal(imported.code, 0, imported.stderr);
    assert.equal(transfer.importStatus().status, "complete");
    assert.equal(target.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
    assert.equal(target.prepare("SELECT COUNT(*) AS n FROM notes").get().n, 1);
    const badArtifact = path.join(scratch, "incomplete.migration-private.json");
    fs.writeFileSync(badArtifact, fs.readFileSync(artifact, "utf8").slice(0, -4), { mode: 0o600 });
    const previousRequests = requests;
    const rejected = await child("scripts/import-migration.mjs", ["--input", badArtifact, "--url", url, "--token-file", tokenFile]);
    assert.equal(rejected.code, 1);
    assert.equal(requests, previousRequests, "Invalid files must fail preflight before any remote mutation.");
    assert.ok(!imported.stdout.includes(token));
    assert.ok(!imported.stdout.includes("SyntheticPass123"));
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    source.close(); target.close(); fs.rmSync(scratch, { recursive: true, force: true });
  }
});
