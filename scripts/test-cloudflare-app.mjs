// Exercise the real local Cloudflare runtime, with disposable synthetic data.
// No account credentials, .env files or real email/payment providers are loaded.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-cloudflare-app-"));
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const config = path.join(temporary, "wrangler.jsonc");
const persist = path.join(temporary, "persistence");
const cleanEnvironment = {
  PATH: process.env.PATH,
  ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
  ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
  CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
  WRANGLER_SEND_METRICS: "false",
  WRANGLER_LOG_SANITIZE: "true",
  CI: "true",
};
let worker;
let workerOutput = "";
let passed = 0;
let base;

function checked(label) {
  passed++;
  console.log(`PASS ${label}`);
}

async function buildAssets() {
  const child = spawn("npm", ["run", "build:cloudflare"], { cwd: root, env: cleanEnvironment, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, `Cloudflare asset build failed: ${output}`);
}

function isolatedConfiguration() {
  let source = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
  for (const field of ["main", "directory"]) {
    const matcher = new RegExp(`("${field}"\\s*:\\s*")([^"\\n]+)(")`);
    assert.match(source, matcher, `Root Cloudflare config needs ${field}`);
    source = source.replace(matcher, (_, prefix, relative, suffix) => prefix + path.resolve(root, relative).replaceAll("\\", "/") + suffix);
  }
  // A copied config prevents Wrangler from discovering repository .dev.vars.
  // Its main and assets paths still point to the actual prepared application.
  fs.writeFileSync(config, source);
}

async function freePort() {
  const reserved = net.createServer();
  reserved.listen(0, "127.0.0.1");
  await once(reserved, "listening");
  const port = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  return port;
}

async function stopWorker() {
  if (!worker) return;
  const current = worker;
  worker = null;
  if (current.exitCode !== null) return;
  current.kill("SIGTERM");
  let timer;
  try {
    await Promise.race([
      once(current, "exit"),
      new Promise(resolve => { timer = setTimeout(() => { current.kill("SIGKILL"); resolve(); }, 5_000); timer.unref(); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function startWorker(mode, allowMock = "false", authLimit = "150") {
  await stopWorker();
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  const variables = {
    NODE_ENV: mode, BASE_URL: base, CORS_ORIGIN: base, AUTH_RATE_LIMIT: authLimit,
    POLICY_OPERATOR_NAME: "Fixture Operator", POLICY_POSTAL_ADDRESS: "1 Example Street, Leeds, LS1 1AA",
    REVISION_RATE_LIMIT: "300", CONTACT_RETRY_INTERVAL_MS: "0",
    ALLOW_MOCK_BILLING: allowMock, SMTP_HOST: "", SMTP_PORT: "587", SMTP_SECURE: "false",
    SMTP_USER: "", SMTP_PASS: "", EMAIL_FROM: "", CONTACT_TO: "support@fixture.test",
    STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", STRIPE_PRICE_PRO: "", STRIPE_PRICE_PRO_ANNUAL: "",
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", RELEASE_SHA: "synthetic-local-cloudflare",
  };
  const args = [wrangler, "dev", "--local", "--config", config, "--persist-to", persist, "--port", String(port), "--ip", "127.0.0.1"];
  for (const [name, value] of Object.entries(variables)) args.push("--var", `${name}:${value}`);
  workerOutput = "";
  worker = spawn(process.execPath, args, { cwd: temporary, env: cleanEnvironment, stdio: ["ignore", "pipe", "pipe"] });
  worker.stdout.on("data", chunk => { workerOutput = (workerOutput + chunk).slice(-20_000); });
  worker.stderr.on("data", chunk => { workerOutput = (workerOutput + chunk).slice(-20_000); });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    assert.equal(worker.exitCode, null, `Local Wrangler exited: ${workerOutput}`);
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Local Cloudflare application did not become healthy: ${workerOutput}`);
}

async function request(endpoint, { method = "GET", cookie, body, headers = {} } = {}) {
  return fetch(base + endpoint, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
}

async function json(response, expected) {
  const text = await response.text();
  assert.equal(response.status, expected, `Unexpected HTTP response: ${text.slice(0, 700)}`);
  return JSON.parse(text);
}

async function account(email) {
  const details = { name: "Synthetic Migration Student", email, password: "MigrationPass123", ageConfirmed: true, termsAccepted: true, policyVersion: "2026-10-10" };
  const signup = await json(await request("/api/auth/signup", { method: "POST", body: details }), 201);
  const link = new URL(signup.devVerificationUrl);
  assert.equal(link.origin, base, "Synthetic verification must remain on the local fixture");
  assert.equal(link.pathname, "/api/auth/verify");
  assert.equal((await request("/api/auth/login", { method: "POST", body: details })).status, 403);
  assert.equal((await request(link.pathname + link.search)).status, 302);
  assert.equal((await request(link.pathname + link.search)).status, 400);
  const response = await request("/api/auth/login", { method: "POST", body: details });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  const login = await json(response, 200);
  assert.match(cookie, /^nn_session=/);
  assert.equal(login.user.role, "student");
  return { cookie, details, id: login.user.id };
}

try {
  assert.ok(fs.existsSync(wrangler), "Install the locked development dependencies before running this test");
  await buildAssets();
  isolatedConfiguration();
  await startWorker("development");

  const health = await json(await request("/api/health"), 200);
  assert.equal(health.ok, true);
  assert.equal(health.databasePersistent, true);
  assert.equal(health.databaseFallbackActive, false);
  assert.equal(health.deckCount, 24);
  assert.equal(health.emailConfigured, false);
  assert.equal(health.stripeConfigured, false);
  checked("Real workerd Express API initializes the complete Durable Object database");

  for (const [endpoint, content] of [["/", /RecallStride/], ["/app-relaunch.js", /setAppSection/], ["/styles-relaunch.css", /\{/], ["/workspace-navigation.js", /WorkspaceNavigation/]]) {
    const response = await request(endpoint);
    assert.equal(response.status, 200, endpoint);
    assert.match(await response.text(), content, endpoint);
  }
  const topics = await request("/revision-topics.js");
  assert.equal(topics.status, 200);
  assert.match(await topics.text(), /REVISION_TOPICS/);
  const topicPage = await request("/ocr-h446/1.1.1");
  assert.equal(topicPage.status, 200);
  assert.match(await topicPage.text(), /Structure of the processor/);
  const codingWorker = await request("/pseudocode-worker.js");
  assert.equal(codingWorker.status, 200);
  assert.match(codingWorker.headers.get("content-security-policy"), /connect-src 'none'/);
  checked("Prepared static assets, release aliases and dynamic topic routes are served");

  for (const endpoint of ["/.env", "/.dev.vars", "/server.js", "/backend/services/pseudocodeTasks.js", "/backend/services/authEmail.js", "/data/neat-notes.sqlite", "/.git/config"]) {
    const response = await request(endpoint);
    const text = await response.text();
    assert.doesNotMatch(text, /SQLite format 3|function createApplication|module\.exports|const TASKS\s*=|SMTP_PASS\s*=|\[remote "origin"\]/, endpoint);
    assert.ok([403, 404].includes(response.status) || (response.status === 200 && /text\/html/.test(response.headers.get("content-type") || "") && /RecallStride/.test(text)), `Private path unexpectedly served: ${endpoint}`);
  }
  checked("Source modules, secret files, repository metadata and databases stay private");

  const first = await account("first@fixture.test");
  const second = await account("second@fixture.test");
  assert.notEqual(first.id, second.id);
  checked("Signup, verification, single-use links and password login work in workerd");

  const firstWorkspace = (await json(await request("/api/workspaces", { cookie: first.cookie }), 200)).workspaces[0];
  const secondWorkspace = (await json(await request("/api/workspaces", { cookie: second.cookie }), 200)).workspaces[0];
  assert.ok(firstWorkspace.id);
  assert.notEqual(firstWorkspace.id, secondWorkspace.id);
  const note = (await json(await request("/api/notes", { method: "POST", cookie: first.cookie, body: { workspaceId: firstWorkspace.id, body: "Synthetic original note", tag: "migration" } }), 201)).note;
  const edited = (await json(await request(`/api/notes/${note.id}`, { method: "PATCH", cookie: first.cookie, body: { body: "Synthetic edited note" } }), 200)).note;
  assert.equal(edited.body, "Synthetic edited note");
  assert.equal((await json(await request(`/api/notes?workspaceId=${firstWorkspace.id}`, { cookie: first.cookie }), 200)).notes[0].body, edited.body);
  assert.equal((await request(`/api/notes?workspaceId=${firstWorkspace.id}`, { cookie: second.cookie })).status, 403);
  assert.equal((await request(`/api/notes/${note.id}`, { method: "PATCH", cookie: second.cookie, body: { body: "Unwanted synthetic edit" } })).status, 404);
  assert.equal((await request(`/api/notes/${note.id}`, { method: "DELETE", cookie: second.cookie })).status, 404);
  assert.equal((await request(`/api/notes/${note.id}`, { method: "DELETE", cookie: first.cookie })).status, 200);
  assert.equal((await json(await request(`/api/notes?workspaceId=${firstWorkspace.id}`, { cookie: first.cookie }), 200)).notes.length, 0);
  const persistedNote = (await json(await request("/api/notes", { method: "POST", cookie: first.cookie, body: { workspaceId: firstWorkspace.id, body: "Synthetic persistence marker" } }), 201)).note;
  checked("Notes CRUD and cross-account workspace access controls survive the runtime migration");

  const decks = (await json(await request("/api/revision/decks", { cookie: first.cookie }), 200)).decks;
  assert.equal(decks.length, 24);
  assert.equal(decks.filter(deck => !deck.locked).length, 0);
  await json(await request("/api/revision/free-deck", { method: "POST", cookie: first.cookie, body: { deckId: decks[0].id } }), 200);
  await json(await request(`/api/revision/decks/${decks[0].id}`, { cookie: first.cookie }), 200);
  assert.equal((await request(`/api/revision/decks/${decks[1].id}`, { cookie: first.cookie })).status, 402);
  assert.equal((await request(`/api/revision/decks/${decks[0].id}`)).status, 401);
  assert.equal((await request("/api/billing/mock-upgrade", { method: "POST", cookie: first.cookie, body: { plan: "pro" } })).status, 403);
  assert.equal((await request("/api/billing/checkout-session", { method: "POST", cookie: first.cookie, body: { plan: "pro", termsAccepted: true, adultPermissionConfirmed: true, policyVersion: "2026-10-10" } })).status, 503);
  checked("Free revision entitlements and disabled payment-provider actions remain enforced");

  const revisionDeck = (await json(await request(`/api/revision/decks/${decks[0].id}`, { cookie: first.cookie }), 200)).deck;
  const revisionPayload = { deckId: revisionDeck.id, cardId: revisionDeck.cards[0].id, confidence: "confident", rating: "good", source: "flashcard", clientAttemptId: "migration-revision-123456789" };
  const revision = await json(await request("/api/revision/attempts", { method: "POST", cookie: first.cookie, body: revisionPayload }), 201);
  const revisionRetry = await json(await request("/api/revision/attempts", { method: "POST", cookie: first.cookie, body: revisionPayload }), 200);
  assert.deepEqual(revisionRetry, revision);
  checked("Revision progress is transactional and network retries reuse the original attempt");

  const sqlDeck = decks.find(deck => deck.topicId === "cs-1-3-2" || deck.id === "cs-1-3-2");
  assert.ok(sqlDeck);
  await json(await request("/api/revision/free-deck", { method: "POST", cookie: second.cookie, body: { deckId: sqlDeck.id } }), 200);
  const sqlResult = await json(await request("/api/labs/attempts", { method: "POST", cookie: second.cookie, body: { labId: "lab-sql-query", response: "SELECT Name FROM Student WHERE Score > 69 ORDER BY Name" } }), 201);
  assert.equal(sqlResult.assessment.correct, true);
  assert.deepEqual(sqlResult.assessment.rows, ["Asha", "Leo", "Mina", "Zara"]);
  const hostileSql = await json(await request("/api/labs/attempts", { method: "POST", cookie: second.cookie, body: { labId: "lab-sql-query", response: "SELECT email FROM users" } }), 201);
  assert.equal(hostileSql.assessment.correct, false);
  assert.equal(hostileSql.assessment.rows, undefined);
  checked("SQL lab executes on synthetic boundary data and rejects access to application tables");

  const bank = await json(await request("/api/coding/tasks"), 200);
  assert.equal(bank.tasks.length, 60);
  assert.equal(bank.tasks[0].solutions, undefined);
  const interpreterResponse = await request("/pseudocode-engine.js");
  assert.equal(interpreterResponse.status, 200);
  const interpreterContext = vm.createContext({});
  new vm.Script(await interpreterResponse.text()).runInContext(interpreterContext, { timeout: 2_000 });
  const engine = interpreterContext.RecallPseudocode;
  assert.equal(engine.VERSION, bank.interpreterVersion);
  const execution = engine.execute('minutes=int(input("Minutes"))\nprint(minutes*60)', ["5"]);
  assert.equal(execution.ok, true);
  assert.deepEqual(Array.from(execution.output), ["300"]);
  const task = bank.tasks[0];
  const payload = {
    id: "migration-attempt-123456789", taskId: task.id, taskVersion: task.version, interpreterVersion: bank.interpreterVersion,
    mode: "independent", firstCheck: true, assistance: { runs: 1, hints: 0, checks: 1, solution: false },
    outcomes: task.cases.map(item => ({ id: item.id, outcome: "diagnostic" })),
  };
  const attemptEndpoint = `/api/coding/tasks/${task.id}/attempts`;
  assert.equal((await request(attemptEndpoint, { method: "POST", body: payload })).status, 401);
  const saved = await json(await request(attemptEndpoint, { method: "POST", cookie: first.cookie, body: payload }), 201);
  assert.equal(saved.record.masteryEligible, false);
  assert.equal(saved.record.trusted, false);
  await json(await request(attemptEndpoint, { method: "POST", cookie: first.cookie, body: payload }), 200);
  assert.equal((await request(attemptEndpoint, { method: "POST", cookie: first.cookie, body: { ...payload, source: "Must not upload source" } })).status, 400);
  assert.equal((await json(await request("/api/coding/attempts", { cookie: second.cookie }), 200)).attempts.length, 0);
  assert.equal((await json(await request("/api/coding/attempts", { cookie: first.cookie }), 200)).attempts.length, 1);
  checked("Published interpreter executes and coding attempts retain privacy, ownership and retry identity");

  const pilotEvent = { id: "migration-event-123456789", name: "coding_session_started", sessionId: "migration-session-123456789", taskId: task.id, mode: "learn" };
  assert.equal((await request("/api/pilot/events", { method: "POST", cookie: first.cookie, body: pilotEvent })).status, 204);
  await json(await request("/api/profile", { method: "PATCH", cookie: first.cookie, body: { notificationPreferences: { usageAnalytics: true } } }), 200);
  assert.equal((await request("/api/pilot/events", { method: "POST", cookie: first.cookie, body: pilotEvent })).status, 202);
  const exported = await json(await request("/api/account/export", { cookie: first.cookie }), 200);
  assert.equal(exported.codingPractice.length, 1);
  assert.equal(exported.pilotEvents.length, 1);
  assert.equal(exported.notes[0].id, persistedNote.id);
  checked("Consent-aware telemetry and account export work without background cleanup timers");

  assert.equal((await request("/api/profile", { method: "PATCH", cookie: first.cookie, body: { name: "Synthetic student" }, headers: { Origin: "https://attacker.fixture.test" } })).status, 403);
  checked("Foreign-origin mutations remain rejected behind the Worker proxy");

  await startWorker("production", "true");
  const persisted = await json(await request(`/api/notes?workspaceId=${firstWorkspace.id}`, { cookie: first.cookie }), 200);
  assert.equal(persisted.notes[0].id, persistedNote.id);
  assert.equal((await json(await request("/api/coding/attempts", { cookie: first.cookie }), 200)).attempts.length, 1);
  assert.equal((await request("/api/billing/mock-upgrade", { method: "POST", cookie: first.cookie, body: { plan: "pro" } })).status, 403);
  checked("Durable Object accounts, sessions, notes and coding records survive a workerd restart");

  const noMailDetails = { name: "Synthetic Mail Unavailable", email: "no-mail@fixture.test", password: "MigrationPass123", ageConfirmed: true, termsAccepted: true, policyVersion: "2026-10-10" };
  const blocked = await json(await request("/api/auth/signup", { method: "POST", body: noMailDetails }), 503);
  assert.equal(blocked.code, "AUTH_EMAIL_UNAVAILABLE");
  assert.equal(blocked.devVerificationUrl, undefined);
  assert.equal((await request("/api/auth/forgot-password", { method: "POST", body: { email: first.details.email } })).status, 503);
  checked("Production cannot bypass email verification or claim delivery with missing configuration");

  await startWorker("development");
  const newAccount = await json(await request("/api/auth/signup", { method: "POST", body: noMailDetails }), 201);
  assert.ok(newAccount.devVerificationUrl, "Missing production email must not have created an unusable account");
  await json(await request("/api/auth/logout", { method: "POST", cookie: first.cookie }), 200);
  assert.equal((await request("/api/profile", { cookie: first.cookie })).status, 401);
  checked("Failed production signup leaves no stranded account; logout revokes persisted sessions");

  await startWorker("production", "false", "2");
  for (let number = 0; number < 2; number++) {
    assert.equal((await request("/api/auth/reset-password", { method: "POST", body: { token: "synthetic-invalid", password: "short" } })).status, 400);
  }
  await startWorker("production", "false", "2");
  const limited = await request("/api/auth/reset-password", { method: "POST", body: { token: "synthetic-invalid", password: "short" } });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  checked("Authentication rate limits survive database hibernation and runtime restarts");

  console.log(`Cloudflare local application: ${passed} checks passed. No real email or payment delivery was tested.`);
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await stopWorker();
  fs.rmSync(temporary, { recursive: true, force: true });
}
