// One complete transfer through the actual local production/private Workers.
// All accounts, password records and SQLite files below are synthetic fixtures.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { once } from "node:events";
import { scryptSync } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { createMigrationExport } from "../backend/cloudflare/data-transfer.mjs";

const require = createRequire(import.meta.url);
const { createApplication } = require("../server.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-workerd-migration-"));
const persist = path.join(scratch, "persistence");
const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const token = "synthetic-migration-secret-0123456789abcdef";
const ownerId = "synthetic-migrated-student";
const email = "migration-student@school.example.test";
const password = "SyntheticMigrationPass123";
const salt = "synthetic-migration-fixed-salt";
const expectedHash = scryptSync(password, salt, 64).toString("hex");
const noteBody = "Synthetic migration note 🧠\nSelection, iteration and accurate recall.";
const binary = Buffer.from([0, 1, 127, 128, 255]);
const timestamp = new Date().toISOString();
const retainedTimestamp = "2000-01-01T00:00:00.000Z";
const source = new DatabaseSync(":memory:");
let snapshot;
let child;
let workerOutput = "";
let passed = 0;
let base;
const cleanEnvironment = {
  PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR || os.tmpdir(),
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false", CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
  WRANGLER_SEND_METRICS: "false", CI: "true", NO_COLOR: "1",
};

const checked = (label) => { passed += 1; console.log(`PASS ${label}`); };
async function freePort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function stop() {
  if (!child) return;
  const previous = child;
  child = null;
  if (previous.exitCode !== null) return;
  try { process.kill(-previous.pid, "SIGTERM"); } catch { previous.kill("SIGTERM"); }
  await Promise.race([once(previous, "exit"), new Promise((resolve) => setTimeout(resolve, 2000))]);
}

async function request(endpoint, { privateService = false, authorization = `Bearer ${token}`, method = "GET", body, cookie } = {}) {
  return fetch(`${base}${privateService ? "/transfer" : ""}${endpoint}`, {
    method, redirect: "manual", signal: AbortSignal.timeout(20000),
    headers: { ...(privateService && authorization ? { Authorization: authorization } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function json(response, expected = 200) {
  const text = await response.text();
  assert.equal(response.status, expected, `Unexpected local HTTP response: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function start(migrationMode) {
  await stop();
  const application = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"));
  application.name = "recallstride-migration-fixture";
  application.main = path.join(root, application.main);
  application.assets.directory = path.join(root, application.assets.directory);
  application.vars = {
    NODE_ENV: "development", MIGRATION_MODE: migrationMode, BASE_URL: base, CORS_ORIGIN: base,
    AUTH_RATE_LIMIT: "150", CONTACT_RETRY_INTERVAL_MS: "0", ALLOW_MOCK_BILLING: "false",
    SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", EMAIL_FROM: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", RELEASE_SHA: "synthetic-workerd-transfer",
  };
  const privateService = JSON.parse(fs.readFileSync(path.join(root, "backend/cloudflare/migration-wrangler.jsonc"), "utf8"));
  privateService.name = "recallstride-transfer-fixture";
  privateService.main = path.join(root, "backend/cloudflare/migration-worker.mjs");
  privateService.vars = { MIGRATION_SECRET: token };
  privateService.durable_objects.bindings[0].script_name = application.name;

  // A local-only gateway exposes both unchanged production services through
  // service bindings; the test adds no route to either deployed application.
  const gatewayFile = path.join(scratch, "gateway.mjs");
  fs.writeFileSync(gatewayFile, `export default { fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/transfer/')) {
      url.pathname = url.pathname.slice('/transfer'.length);
      return env.TRANSFER.fetch(new Request(url, request));
    }
    return env.APPLICATION.fetch(request);
  } };`);
  const gateway = { name: "recallstride-local-transfer-gateway", main: gatewayFile, compatibility_date: "2026-10-09",
    services: [{ binding: "APPLICATION", service: application.name }, { binding: "TRANSFER", service: privateService.name }] };
  const configs = [["gateway.jsonc", gateway], ["application.jsonc", application], ["transfer.jsonc", privateService]];
  for (const [name, value] of configs) fs.writeFileSync(path.join(scratch, name), JSON.stringify(value));
  const argumentsList = [wrangler, "dev", "--local", "--persist-to", persist, "--port", new URL(base).port, "--ip", "127.0.0.1", "--show-interactive-dev-session=false"];
  for (const [name] of configs) argumentsList.push("--config", path.join(scratch, name));
  workerOutput = "";
  child = spawn(process.execPath, argumentsList, { cwd: scratch, detached: true, env: cleanEnvironment, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (part) => { workerOutput = (workerOutput + part).slice(-20000); });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    assert.equal(child.exitCode, null, `Local Wrangler exited unexpectedly:\n${workerOutput}`);
    try {
      const ready = await request("/");
      if (ready.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`The local multi-Worker fixture did not start.\n${workerOutput}`);
}

function* sqliteFiles(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* sqliteFiles(filename);
    else if (entry.name.endsWith(".sqlite")) yield filename;
  }
}

try {
  assert.ok(fs.existsSync(wrangler), "Install locked development dependencies before this test.");
  const build = spawn(process.execPath, [path.join(root, "scripts/build-cloudflare.js")], { cwd: root, env: cleanEnvironment, stdio: ["ignore", "pipe", "pipe"] });
  let buildOutput = "";
  for (const stream of [build.stdout, build.stderr]) stream.on("data", (part) => { buildOutput += part; });
  assert.equal((await once(build, "exit"))[0], 0, buildOutput);
  base = `http://127.0.0.1:${await freePort()}`;
  createApplication({ db: source, staticAssets: false, environment: { NODE_ENV: "development", BASE_URL: base, CONTACT_RETRY_INTERVAL_MS: "0" }, runtime: { scheduleCleanup: false } });
  source.prepare(`INSERT INTO users(id,email,name,password_hash,password_salt,email_verified,plan,plan_status,stripe_customer_id,created_at,updated_at)
    VALUES(?,?,?,?,?,1,'pro','active',?,?,?)`).run(ownerId, email, "Synthetic migrated student", expectedHash, salt, "cus_synthetic_migrated", timestamp, timestamp);
  source.prepare("INSERT INTO workspaces(id,name,owner_id,created_at,updated_at,kind) VALUES(?,?,?,?,?,'personal')").run("migration-workspace", "Synthetic migrated workspace", ownerId, timestamp, timestamp);
  source.prepare("INSERT INTO workspace_members VALUES(?,?,?,?)").run("migration-workspace", ownerId, "owner", timestamp);
  source.prepare("INSERT INTO notes VALUES(?,?,?,?,?,?,?,?,?)").run("migration-note", "migration-workspace", ownerId, noteBody, "synthetic", "Migration fixture", "Synthetic summary", timestamp, timestamp);
  source.prepare("INSERT INTO student_profiles(user_id,notification_preferences,created_at,updated_at) VALUES(?,?,?,?)").run(ownerId, '{"usageAnalytics":true}', timestamp, timestamp);
  source.prepare("INSERT INTO coding_practice_attempts VALUES(?,?,?,?,?)").run(ownerId, "synthetic-migration-attempt", "synthetic-hash", JSON.stringify({ id: "synthetic-migration-attempt", taskId: "synthetic-task", trusted: false, createdAt: timestamp }), timestamp);
  source.prepare("INSERT INTO pilot_events VALUES(?,?,?,?,?,?,?)").run("synthetic-migration-event", ownerId, "coding_session_started", "synthetic-migration-session", null, "learn", timestamp);
  source.prepare("INSERT INTO coding_practice_attempts VALUES(?,?,?,?,?)").run(ownerId, "synthetic-retained-attempt", "synthetic-retained-hash", JSON.stringify({ id: "synthetic-retained-attempt", taskId: "synthetic-task", trusted: false, createdAt: retainedTimestamp }), retainedTimestamp);
  source.prepare("INSERT INTO pilot_events VALUES(?,?,?,?,?,?,?)").run("synthetic-retained-event", ownerId, "coding_session_started", "synthetic-retained-session", null, "learn", retainedTimestamp);
  const card = source.prepare("SELECT * FROM flashcards ORDER BY id LIMIT 1").get();
  source.prepare("INSERT INTO learning_evidence(id,user_id,concept_id,deck_id,card_id,activity_type,score,difficulty,created_at) VALUES(?,?,?,?,?,'flashcard_recall',0.75,5,?)").run("synthetic-learning-evidence", ownerId, card.card_key, card.deck_id, card.id, timestamp);
  source.prepare("INSERT INTO audit_logs(id,user_id,action,metadata,created_at) VALUES(?,?,'synthetic_fixture',?,?)").run("synthetic-binary-audit", ownerId, binary, timestamp);
  snapshot = createMigrationExport(source, { rowsPerChunk: 100 });
  const chunks = [...snapshot.chunks()];
  const pauseChunk = chunks.find((chunk) => chunk.table === "flashcard_decks");
  assert.ok(pauseChunk);
  assert.ok(!chunks.slice(0, pauseChunk.index + 1).some((chunk) => chunk.table === "runtime_metadata"));

  await start("true");
  assert.equal((await request("/status", { privateService: true, authorization: null })).status, 404);
  assert.equal((await request("/status", { privateService: true, authorization: "Bearer wrong-synthetic-secret" })).status, 404);
  assert.equal((await request("/status", { privateService: true, authorization: `Bearer ${"é".repeat(token.length)}` })).status, 404);
  const initial = await json(await request("/status", { privateService: true }));
  assert.equal(initial.status, "not_started");
  assert.equal((await request("/__migration/begin", { method: "POST", body: snapshot.manifest })).status, 404);
  assert.equal((await request("/api/health")).status, 503);
  assert.equal((await request("/api/auth/signup", { method: "POST", body: { email, password } })).status, 503);
  checked("Private transfer authentication and public route isolation; migration mode blocks API writes");

  const begun = await json(await request("/begin", { privateService: true, method: "POST", body: snapshot.manifest }));
  assert.equal(begun.status, "importing");
  for (const chunk of chunks.slice(0, pauseChunk.index + 1)) {
    await json(await request("/chunk", { privateService: true, method: "POST", body: chunk }));
  }
  const paused = await json(await request("/status", { privateService: true }));
  assert.equal(paused.nextChunk, pauseChunk.index + 1);
  await start("false");
  assert.equal((await request("/api/health")).status, 503, "Persisted partial import must block access even if migration mode is accidentally disabled.");
  assert.equal((await request("/status", { privateService: true })).status, 409, "RPC must be disabled outside migration mode.");
  await start("true");
  const resumed = await json(await request("/status", { privateService: true }));
  assert.equal(resumed.nextChunk, paused.nextChunk);
  const replay = await json(await request("/chunk", { privateService: true, method: "POST", body: pauseChunk }));
  assert.equal(replay.duplicate, true);
  assert.equal(replay.nextChunk, paused.nextChunk);
  checked("Partial seed-table import survives workerd restarts and matching chunk replay");

  const retainedChunkIndex = Math.max(...chunks.filter((chunk) => ["coding_practice_attempts", "pilot_events"].includes(chunk.table)).map((chunk) => chunk.index));
  for (const chunk of chunks.slice(resumed.nextChunk, retainedChunkIndex + 1)) {
    await json(await request("/chunk", { privateService: true, method: "POST", body: chunk }));
  }
  await start("true");
  const retainedResume = await json(await request("/status", { privateService: true }));
  assert.equal(retainedResume.nextChunk, retainedChunkIndex + 1);
  for (const chunk of chunks.slice(retainedResume.nextChunk)) {
    await json(await request("/chunk", { privateService: true, method: "POST", body: chunk }));
  }
  const completed = await json(await request("/finish", { privateService: true, method: "POST", body: {} }));
  assert.equal(completed.status, "complete");
  assert.equal(completed.importedRows, completed.totalRows);
  assert.equal(completed.nextChunk, completed.totalChunks);
  checked("Real Durable Object verifies table hashes and foreign keys, including pre-2000 records retained across restart");

  await start("false");
  assert.equal((await request("/api/health")).status, 200);
  const loginResponse = await request("/api/auth/login", { method: "POST", body: { email, password } });
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
  const login = await json(loginResponse);
  assert.equal(login.user.id, ownerId);
  assert.equal(login.user.plan, "pro");
  assert.match(cookie, /^nn_session=/);
  const notes = await json(await request("/api/notes?workspaceId=migration-workspace", { cookie }));
  assert.equal(notes.notes[0].body, noteBody);
  const exported = await json(await request("/api/account/export", { cookie }));
  assert.equal(exported.revisionEvidence[0].score, 0.75);
  assert.equal(exported.codingPractice[0].id, "synthetic-migration-attempt");
  assert.equal(exported.pilotEvents.length, 1);
  assert.equal((await request("/__migration/status")).status, 404);
  assert.equal((await request("/status", { privateService: true })).status, 409);
  checked("Migrated password login, Pro access, Unicode notes, coding and learning progress remain usable");

  await stop();
  let found = false;
  for (const filename of sqliteFiles(persist)) {
    let restored;
    try {
      restored = new DatabaseSync(filename, { readOnly: true });
      const user = restored.prepare("SELECT * FROM users WHERE id=?").get(ownerId);
      if (!user) continue;
      assert.equal(user.password_hash, expectedHash);
      assert.equal(user.password_salt, salt);
      assert.equal(user.stripe_customer_id, "cus_synthetic_migrated");
      const record = restored.prepare("SELECT metadata FROM audit_logs WHERE id='synthetic-binary-audit'").get();
      assert.deepEqual([...record.metadata], [...binary]);
      assert.equal(restored.prepare("PRAGMA foreign_key_check").all().length, 0);
      found = true;
      break;
    } catch (error) {
      if (!/no such table/.test(error.message)) throw error;
    } finally { restored?.close(); }
  }
  assert.equal(found, true, "The synthetic Durable Object SQLite store must persist the transferred account.");
  checked("Persisted local SQLite retains original password records, billing identity and exact BLOB bytes");
  console.log(`Cloudflare migration round trip: ${passed} checks passed. Only disposable synthetic data and blank providers were used.`);
} catch (error) {
  console.error(error.stack || error.message);
  if (workerOutput) console.error(workerOutput.slice(-6000));
  await stop();
  for (const filename of sqliteFiles(persist)) {
    let diagnostic;
    try {
      diagnostic = new DatabaseSync(filename, { readOnly: true });
      const tables = diagnostic.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
      console.error("Synthetic target table counts:", tables.map(({ name }) => ({ name, count: diagnostic.prepare(`SELECT COUNT(*) AS n FROM "${name.replaceAll('"', '""')}"`).get().n })));
    } catch (inspectionError) { console.error("Synthetic diagnostic:", inspectionError.message); }
    finally { diagnostic?.close(); }
  }
  process.exitCode = 1;
} finally {
  await stop();
  snapshot?.close();
  source.close();
  fs.rmSync(scratch, { recursive: true, force: true });
}
