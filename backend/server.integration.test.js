const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { DatabaseSync } = require("node:sqlite");

const port = 4300 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "neat-notes-integration-"));
let serverProcess;
let cookie = "";
let verificationUrl = "";
let secondStudentCookie = "";

before(async () => {
  serverProcess = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      BASE_URL: baseUrl,
      CORS_ORIGIN: baseUrl,
      DATABASE_PATH: path.join(tempDir, "integration.sqlite"),
      NODE_ENV: "development",
      ALLOW_MOCK_BILLING: "true",
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let startupOutput = "";
  serverProcess.stdout.on("data", (chunk) => { startupOutput += chunk; });
  serverProcess.stderr.on("data", (chunk) => { startupOutput += chunk; });

  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`Integration server exited early.\n${startupOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Integration server did not become healthy.\n${startupOutput}`);
});

after(async () => {
  serverProcess?.kill("SIGTERM");
  if (serverProcess?.exitCode === null) await once(serverProcess, "exit");
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("public health and OCR acquisition page are production-readable", async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.ok, true);
  assert.equal(health.databasePersistent, true);
  assert.equal(health.deckCount, 24);

  const topicResponse = await fetch(`${baseUrl}/ocr-h446/1.1.1`);
  const topicPage = await topicResponse.text();
  assert.equal(topicResponse.status, 200);
  assert.match(topicPage, /Structure of the processor/);
  assert.match(topicPage, /not endorsed by OCR/);
});

test("student account verifies, logs in and cannot elevate its role", async () => {
  const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Integration Student", email: "student@example.test", password: "StrongPass123", returnTask: { section: "practice", topicId: "cs-1-1-2", practiceMode: "exam", notes: "Never transfer guest notes" } }),
  });
  const signup = await signupResponse.json();
  assert.equal(signupResponse.status, 201);
  verificationUrl = signup.devVerificationUrl;
  assert.ok(verificationUrl);

  const blockedLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@example.test", password: "StrongPass123" }),
  });
  assert.equal(blockedLogin.status, 403);

  const verifyResponse = await fetch(verificationUrl, { redirect: "manual" });
  assert.equal(verifyResponse.status, 302);

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@example.test", password: "StrongPass123" }),
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(login.user.role, "student");
  assert.deepEqual(Object.keys(login.plans), ["free", "pro"]);
  cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  assert.equal((await fetch(`${baseUrl}/api/auth/continuation`)).status, 401);
  const continuation = await fetch(`${baseUrl}/api/auth/continuation`, { headers: { Cookie: cookie } }).then((r) => r.json());
  assert.deepEqual(continuation.task, { section: "practice", topicId: "cs-1-1-2", componentId: "h446-01", practiceMode: "exam" });
  assert.equal((await fetch(`${baseUrl}/api/auth/continuation`, { method: "DELETE", headers: { Cookie: cookie } })).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/auth/continuation`, { headers: { Cookie: cookie } }).then((r) => r.json())).task, null);

  const profileResponse = await fetch(`${baseUrl}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ role: "admin", learnerType: "year_13", targetGrade: "A" }),
  });
  const profile = await profileResponse.json();
  assert.equal(profileResponse.status, 200);
  assert.equal(profile.user.role, "student");
  assert.equal(profile.studentProfile.learner_type, "year_13");

  const identityResponse = await fetch(`${baseUrl}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: "Ada Student", avatarId: "code" }),
  });
  const identity = await identityResponse.json();
  assert.equal(identityResponse.status, 200);
  assert.equal(identity.user.name, "Ada Student");
  assert.equal(identity.studentProfile.avatar_id, "code");

  const invalidIdentityResponse = await fetch(`${baseUrl}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: "A", avatarId: "untrusted-avatar" }),
  });
  assert.equal(invalidIdentityResponse.status, 400);
});

test("free account cannot bypass deck entitlements or access retired routes", async () => {
  const decksResponse = await fetch(`${baseUrl}/api/revision/decks`, { headers: { Cookie: cookie } });
  const { decks } = await decksResponse.json();
  assert.equal(decksResponse.status, 200);
  assert.equal(decks.filter((deck) => !deck.locked).length, 0);
  assert.ok(decks.every((deck) => deck.freeSelectable));

  const chosen = decks[0];
  const chooseResponse = await fetch(`${baseUrl}/api/revision/free-deck`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ deckId: chosen.id }),
  });
  assert.equal(chooseResponse.status, 200);
  const repairHeaders = { Cookie: cookie, "Content-Type": "application/json" };
  const repairList = await fetch(`${baseUrl}/api/revision/repairs?topicId=cs-1-1-1`, { headers: repairHeaders }).then((r) => r.json());
  assert.equal(repairList.lessons.length, 1);
  assert.equal("checks" in repairList.lessons[0], false);
  assert.equal((await fetch(`${baseUrl}/api/revision/repairs?topicId=cs-1-4-1`, { headers: repairHeaders })).status, 402);
  assert.equal((await fetch(`${baseUrl}/api/revision/repairs/repair-positive-binary/check`, { method: "POST", headers: repairHeaders, body: JSON.stringify({ variant: 0, response: "00100110" }) })).status, 402);

  const refreshedDecks = await fetch(`${baseUrl}/api/revision/decks`, { headers: { Cookie: cookie } }).then((response) => response.json());
  assert.equal(refreshedDecks.decks.filter((deck) => !deck.locked).length, 1);
  assert.equal(refreshedDecks.decks.find((deck) => deck.id === chosen.id).selectedFreeDeck, true);

  const lockedDeck = refreshedDecks.decks.find((deck) => deck.locked);
  const lockedResponse = await fetch(`${baseUrl}/api/revision/decks/${encodeURIComponent(lockedDeck.id)}`, { headers: { Cookie: cookie } });
  assert.equal(lockedResponse.status, 402);

  const classResponse = await fetch(`${baseUrl}/api/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: "Unauthorised class" }),
  });
  assert.equal(classResponse.status, 410);
});

test("mutation origin checks accept the deployed host and reject foreign sites", async () => {
  const deploymentHeaders = {
    "Content-Type": "application/json",
    Cookie: cookie,
    Origin: baseUrl.replace("http://", "https://"),
    "X-Forwarded-Proto": "https",
  };
  const sameHostResponse = await fetch(`${baseUrl}/api/learning/session`, {
    method: "POST",
    headers: deploymentHeaders,
    body: JSON.stringify({ durationMinutes: 5 }),
  });
  assert.equal(sameHostResponse.status, 201);

  const foreignOriginResponse = await fetch(`${baseUrl}/api/learning/session`, {
    method: "POST",
    headers: { ...deploymentHeaders, Origin: "https://attacker.example" },
    body: JSON.stringify({ durationMinutes: 5 }),
  });
  assert.equal(foreignOriginResponse.status, 403);
});

test("revision sync retries count once and mismatched attempt reuse is rejected", async () => {
  const headers = { "Content-Type": "application/json", Cookie: cookie };
  const body = { deckId: "cs-1-1-1", cardId: "cs-1-1-1__cpu-role", confidence: "confident", rating: "good", clientAttemptId: "synthetic-retry-1" };
  const deck = await fetch(`${baseUrl}/api/revision/decks/cs-1-1-1`, { headers }).then((r) => r.json());
  body.cardId = deck.deck.cards[0].id;
  const first = await fetch(`${baseUrl}/api/revision/attempts`, { method: "POST", headers, body: JSON.stringify(body) });
  const firstResult = await first.json();
  assert.equal(first.status, 201);
  const retry = await fetch(`${baseUrl}/api/revision/attempts`, { method: "POST", headers, body: JSON.stringify(body) });
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).attempt.id, firstResult.attempt.id);
  const conflict = await fetch(`${baseUrl}/api/revision/attempts`, { method: "POST", headers, body: JSON.stringify({ ...body, confidence: "needs_practice" }) });
  assert.equal(conflict.status, 409);
  const refreshed = await fetch(`${baseUrl}/api/revision/decks/cs-1-1-1`, { headers }).then((r) => r.json());
  assert.equal(refreshed.deck.confidence.totalAttempts, 1);
});

test("guided written answers do not create validated recall evidence", async () => {
  const headers = { "Content-Type": "application/json", Cookie: cookie };
  const questions = await fetch(`${baseUrl}/api/exam/questions?topicId=cs-1-1-1`, { headers }).then((r) => r.json());
  const response = await fetch(`${baseUrl}/api/exam/attempts`, { method: "POST", headers, body: JSON.stringify({ questionId: questions.questions[0].id, answer: "The MAR does not store the address. The MDR does not store data from memory." }) });
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.result.proposedMark, null);
  assert.equal(result.result.validated, false);
  assert.equal(result.learning.evidenceRecorded, false);
  assert.ok(result.result.checklist.length);
});

test("only Free and Pro are sold and unavailable Google sign-in is disclosed safely", async () => {
  const providers = await fetch(`${baseUrl}/api/auth/providers`).then((r) => r.json());
  assert.equal(providers.google, false);
  const plans = await fetch(`${baseUrl}/api/plans`).then((r) => r.json());
  assert.deepEqual(Object.keys(plans.plans), ["free", "pro"]);
  for (const body of [{ plan: "teacher" }, { plan: "pro", interval: "year" }]) {
    const response = await fetch(`${baseUrl}/api/billing/checkout-session`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body) });
    assert.equal(response.status, 400);
  }
});

async function createVerifiedAccount({ name, email, password }) {
  const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const signup = await signupResponse.json();
  assert.equal(signupResponse.status, 201);
  assert.ok(signup.devVerificationUrl);
  const verificationResponse = await fetch(signup.devVerificationUrl, { redirect: "manual" });
  assert.equal(verificationResponse.status, 302);
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(loginResponse.status, 200);
  return loginResponse.headers.get("set-cookie").split(";")[0];
}

test("retired group routes cannot expose or mutate retained records; legacy billing keeps student access", async () => {
  const legacyCookie = await createVerifiedAccount({
    name: "Legacy Account", email: "legacy@example.test", password: "LegacyPass123",
  });
  secondStudentCookie = await createVerifiedAccount({
    name: "Second Student", email: "second-student@example.test", password: "StudentPass123",
  });
  const upgrade = await fetch(`${baseUrl}/api/billing/mock-upgrade`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: legacyCookie },
    body: JSON.stringify({ plan: "teacher" }),
  });
  assert.equal(upgrade.status, 200);
  const profile = await fetch(`${baseUrl}/api/profile`, { headers: { Cookie: legacyCookie } }).then((r) => r.json());
  assert.equal(profile.user.plan, "pro");
  assert.equal(profile.user.role, "student");
  assert.equal(profile.user.entitlements.features.fullRevisionLibrary, true);
  assert.equal("isTeacher" in profile.user, false);
  assert.equal("teacherProfile" in profile, false);
  assert.equal("teacherDashboard" in profile.user.entitlements.features, false);

  const db = new DatabaseSync(path.join(tempDir, "integration.sqlite"));
  try {
    db.prepare("INSERT INTO class_groups (id, teacher_id, name, subject, exam_board, join_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("retained-class", profile.user.id, "Historical record", "Computer Science", "OCR", "NN-ABCDE", "2026-01-01", "2026-01-01");
    const before = db.prepare("SELECT * FROM class_groups WHERE id = ?").get("retained-class");
    const card = db.prepare("SELECT id, deck_id FROM flashcards WHERE deck_id = 'cs-1-1-1' ORDER BY position LIMIT 1").get();
    db.prepare("INSERT INTO flashcard_attempts (id, user_id, class_id, deck_id, card_id, confidence, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("retained-attempt", profile.user.id, "retained-class", card.deck_id, card.id, "confident", "flashcard", "2026-01-01T12:00:00Z");
    const paths = ["/api/classes", "/api/classes/join", "/api/classes/retained-class/students", "/api/classes/retained-class/insights",
      "/api/classes/retained-class/join-code/regenerate", "/api/classes/retained-class/assignments", "/api/centres",
      "/api/centres/join", "/api/assignments", "/api/assignments/retained/status", "/api/workspaces/retained/dashboard"];
    for (const accountCookie of [cookie, legacyCookie]) {
      for (const endpoint of paths) {
        for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
          const response = await fetch(baseUrl + endpoint, {
            method, headers: { "Content-Type": "application/json", Cookie: accountCookie },
            ...(method === "GET" ? {} : { body: JSON.stringify({ code: "RETAINED", status: "complete" }) }),
          });
          assert.equal(response.status, 410, `${method} ${endpoint}`);
        }
      }
    }
    assert.deepEqual(db.prepare("SELECT * FROM class_groups WHERE id = ?").get("retained-class"), before);
    const personalDeck = await fetch(`${baseUrl}/api/revision/decks/cs-1-1-1`, { headers: { Cookie: legacyCookie } }).then((r) => r.json());
    assert.equal(personalDeck.deck.cards.find((item) => item.id === card.id).latestAttempt.id, "retained-attempt");
    const otherDeck = await fetch(`${baseUrl}/api/revision/decks/cs-1-1-1`, { headers: { Cookie: cookie } }).then((r) => r.json());
    assert.ok(otherDeck.deck.cards.every((item) => item.latestAttempt?.id !== "retained-attempt"));
    const activityResponse = await fetch(`${baseUrl}/api/revision/activity`, { headers: { Cookie: legacyCookie } });
    assert.equal(activityResponse.status, 200);
    const archivedExport = await fetch(`${baseUrl}/api/account/export`, { headers: { Cookie: legacyCookie } }).then((r) => r.json());
    assert.equal(archivedExport.archivedClasses[0].id, "retained-class");
    assert.equal("join_code" in archivedExport.archivedClasses[0], false);
    assert.ok(archivedExport.flashcardAttempts.some((attempt) => attempt.id === "retained-attempt"));
    const unrelatedExport = await fetch(`${baseUrl}/api/account/export`, { headers: { Cookie: cookie } }).then((r) => r.json());
    assert.equal(unrelatedExport.archivedClasses.length, 0);
    assert.ok(unrelatedExport.flashcardAttempts.every((attempt) => attempt.id !== "retained-attempt"));
    db.prepare("UPDATE users SET subscription_status = 'canceled' WHERE id = ?").run(profile.user.id);
    const deletion = await fetch(`${baseUrl}/api/account`, { method: "DELETE", headers: { Cookie: legacyCookie, "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT", password: "LegacyPass123" }) });
    assert.equal(deletion.status, 409);
    assert.match((await deletion.json()).error, /archived classroom records/);
    assert.ok(db.prepare("SELECT id FROM class_groups WHERE id = 'retained-class'").get());
  } finally { db.close(); }

  const contextual = await fetch(`${baseUrl}/api/revision/decks?classId=retained-class`, { headers: { Cookie: legacyCookie } });
  assert.equal(contextual.status, 400);
  const createClassroom = await fetch(`${baseUrl}/api/workspaces`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: legacyCookie },
    body: JSON.stringify({ name: "Unsupported workspace", kind: "classroom" }),
  });
  assert.equal(createClassroom.status, 400);
});

test("downgrade locks paid resources but preserves personal notes and account export", async () => {
  const localCookie = await createVerifiedAccount({ name: "Downgrade Student", email: "downgrade@example.test", password: "StrongPass123" });
  const headers = { "Content-Type": "application/json", Cookie: localCookie };
  const workspaces = await fetch(`${baseUrl}/api/workspaces`, { headers }).then((r) => r.json());
  const note = await fetch(`${baseUrl}/api/notes`, { method: "POST", headers, body: JSON.stringify({ workspaceId: workspaces.workspaces[0].id, body: "Personal material remains mine after cancellation." }) });
  assert.equal(note.status, 201);
  await fetch(`${baseUrl}/api/billing/mock-upgrade`, { method: "POST", headers, body: JSON.stringify({ plan: "pro" }) });
  assert.equal((await fetch(`${baseUrl}/api/revision/decks/cs-2-1-1`, { headers })).status, 200);
  const fixture = new DatabaseSync(path.join(tempDir, "integration.sqlite"));
  fixture.prepare("UPDATE users SET plan = 'free', subscription_status = 'canceled' WHERE email = ?").run("downgrade@example.test");
  fixture.close();
  assert.equal((await fetch(`${baseUrl}/api/revision/decks/cs-2-1-1`, { headers })).status, 402);
  const exported = await fetch(`${baseUrl}/api/account/export`, { headers });
  assert.equal(exported.status, 200);
  assert.ok((await exported.json()).notes.some((item) => item.body.includes("Personal material remains mine")));
});

test("learning history is account-owned and cannot import another learner's attempts", async () => {
  const history = await fetch(`${baseUrl}/api/revision/history`, { headers: { Cookie: cookie } }).then((r) => r.json());
  assert.equal(history.attempts.length, 1);
  assert.equal(history.evidence.some((item) => item.activityType === "exam_response"), false);
  const other = await fetch(`${baseUrl}/api/revision/history`, { headers: { Cookie: secondStudentCookie } }).then((r) => r.json());
  assert.equal(other.attempts.length, 0);
  assert.equal(other.evidence.length, 0);
  assert.equal((await fetch(`${baseUrl}/api/revision/history`)).status, 401);
});

test("expired sessions are denied and password reset revokes old sessions and cannot be reused", async () => {
  const email = "recovery@example.test";
  let recoveryCookie = await createVerifiedAccount({ name: "Recovery Student", email, password: "StrongPass123" });
  const fixture = new DatabaseSync(path.join(tempDir, "integration.sqlite"));
  const user = fixture.prepare("SELECT id FROM users WHERE email = ?").get(email);
  fixture.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z' WHERE user_id = ?").run(user.id);
  assert.equal((await fetch(`${baseUrl}/api/session`, { headers: { Cookie: recoveryCookie } })).status, 401);
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "StrongPass123" }) });
  recoveryCookie = login.headers.get("set-cookie").split(";")[0];
  const forgot = await fetch(`${baseUrl}/api/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  assert.equal(forgot.status, 202);
  assert.equal(fixture.prepare("SELECT count(*) AS n FROM password_reset_tokens WHERE user_id = ?").get(user.id).n, 1);
  // Seed a known synthetic token to exercise the reset route without an email provider.
  const crypto = require("node:crypto");
  const token = "synthetic-reset-token-for-local-test";
  fixture.prepare("UPDATE password_reset_tokens SET token_hash = ? WHERE user_id = ?").run(crypto.createHash("sha256").update(token).digest("hex"), user.id);
  fixture.close();
  const reset = () => fetch(`${baseUrl}/api/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: "ChangedPass123" }) });
  assert.equal((await reset()).status, 200);
  assert.equal((await reset()).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/session`, { headers: { Cookie: recoveryCookie } })).status, 401);
  const newLogin = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "ChangedPass123" }) });
  assert.equal(newLogin.status, 200);
});

test("an isolated SQLite backup restores accounts, evidence and curriculum through a second server", async () => {
  const source = new DatabaseSync(path.join(tempDir, "integration.sqlite"), { readOnly: true });
  const backupPath = path.join(tempDir, "restore.sqlite");
  const expectedUsers = source.prepare("SELECT count(*) AS count FROM users").get().count;
  const expectedEvidence = source.prepare("SELECT count(*) AS count FROM learning_evidence").get().count;
  const expectedClass = source.prepare("SELECT * FROM class_groups WHERE id = ?").get("retained-class");
  const expectedAttempt = source.prepare("SELECT * FROM flashcard_attempts WHERE id = ?").get("retained-attempt");
  source.prepare("VACUUM INTO ?").run(backupPath);
  source.close();
  const restored = new DatabaseSync(backupPath);
  assert.equal(restored.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.deepEqual(restored.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(restored.prepare("SELECT count(*) AS count FROM users").get().count, expectedUsers);
  assert.equal(restored.prepare("SELECT count(*) AS count FROM learning_evidence").get().count, expectedEvidence);
  restored.close();
  const restoreUrl = `http://127.0.0.1:${port + 1000}`;
  const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    cwd: path.join(__dirname, ".."), stdio: "ignore",
    env: { ...process.env, PORT: String(port + 1000), BASE_URL: restoreUrl, CORS_ORIGIN: restoreUrl, DATABASE_PATH: backupPath, NODE_ENV: "development", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
  });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${restoreUrl}/api/health`)).ok) { ready = true; break; } } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(ready, true);
    const session = await fetch(`${restoreUrl}/api/session`, { headers: { Cookie: cookie } });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.name, "Ada Student");
    const decks = await fetch(`${restoreUrl}/api/revision/decks`, { headers: { Cookie: cookie } }).then((r) => r.json());
    assert.equal(decks.decks.length, 24);
    const archive = new DatabaseSync(backupPath, { readOnly: true });
    try {
      assert.deepEqual(archive.prepare("SELECT * FROM class_groups WHERE id = ?").get("retained-class"), expectedClass);
      assert.deepEqual(archive.prepare("SELECT * FROM flashcard_attempts WHERE id = ?").get("retained-attempt"), expectedAttempt);
    } finally {
      archive.close();
    }
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
  }
});

test("production delivery releases authorized C2, preserves C1 draft gates and disables mock billing", async () => {
  const snapshot = path.join(tempDir, "production-mode.sqlite");
  const source = new DatabaseSync(path.join(tempDir, "integration.sqlite"), { readOnly: true });
  source.prepare("VACUUM INTO ?").run(snapshot);
  source.close();
  const fixture = new DatabaseSync(snapshot);
  fixture.prepare("UPDATE users SET plan = 'pro', subscription_status = 'active' WHERE email = ?").run("student@example.test");
  fixture.close();
  const url = `http://127.0.0.1:${port + 1100}`;
  const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    cwd: path.join(__dirname, ".."), stdio: "ignore",
    env: { ...process.env, PORT: String(port + 1100), BASE_URL: url, CORS_ORIGIN: url, DATABASE_PATH: snapshot, NODE_ENV: "production", ALLOW_MOCK_BILLING: "true", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
  });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${url}/api/health`)).ok) { ready = true; break; } } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(ready, true);
    const headers = { Cookie: cookie, "Content-Type": "application/json" };
    assert.equal((await fetch(`${url}/api/revision/decks/cs-1-1-1`, { headers })).status, 200);
    const reviewedBank = await fetch(`${url}/api/revision/decks/cs-1-1-1`, { headers }).then((r) => r.json());
    assert.ok(reviewedBank.deck.cards.every((card) => card.quiz === null));
    const repairs = await fetch(`${url}/api/revision/repairs?topicId=cs-1-1-1`, { headers }).then((r) => r.json());
    assert.equal(repairs.lessons.length, 0);
    assert.equal(repairs.pendingCount, 1);
    assert.equal((await fetch(`${url}/api/revision/repairs/repair-address-data/check`, { method: "POST", headers, body: JSON.stringify({ variant: 0, response: "64" }) })).status, 404);
    const c2Deck = await fetch(`${url}/api/revision/decks/cs-2-1-1`, { headers });
    assert.equal(c2Deck.status, 200);
    assert.ok((await c2Deck.json()).deck.cards.length > 0);
    let deliveredCards = 0;
    let deliveredQuestions = 0;
    for (const code of ["2-1-1", "2-1-2", "2-1-3", "2-1-4", "2-1-5", "2-2-1", "2-2-2", "2-3-1"]) {
      const response = await fetch(`${url}/api/revision/decks/cs-${code}`, { headers });
      assert.equal(response.status, 200);
      const payload = await response.json();
      deliveredCards += payload.deck.cards.length;
      assert.ok(payload.deck.cards.every((card) => card.objectives.length > 0));
      assert.ok(payload.deck.cards.some((card) => card.quiz?.options.length === 4));
      const written = await fetch(`${url}/api/exam/questions?topicId=cs-${code}`, { headers }).then((r) => r.json());
      deliveredQuestions += written.questions.length;
      assert.ok(written.questions.every((question) => question.objectives.length > 0));
    }
    assert.equal(deliveredCards, 127);
    assert.equal(deliveredQuestions, 16);
    const questions = await fetch(`${url}/api/exam/questions?topicId=cs-2-1-1`, { headers }).then((r) => r.json());
    assert.equal(questions.questions.length, 2);
    const labs = await fetch(`${url}/api/labs`, { headers }).then((r) => r.json());
    assert.equal(labs.labs.filter((lab) => lab.topicId.startsWith("cs-2-")).length, 9);
    assert.equal((await fetch(`${url}/ocr-h446/2.1.1`)).status, 200);
    const freeHeaders = { Cookie: secondStudentCookie, "Content-Type": "application/json" };
    assert.equal((await fetch(`${url}/api/revision/free-deck`, { method: "POST", headers: freeHeaders, body: JSON.stringify({ deckId: "cs-2-1-1" }) })).status, 200);
    assert.equal((await fetch(`${url}/api/revision/decks/cs-2-1-1`, { headers: freeHeaders })).status, 200);
    assert.equal((await fetch(`${url}/api/revision/decks/cs-2-1-2`, { headers: freeHeaders })).status, 402);
    assert.equal((await fetch(`${url}/api/revision/free-deck`, { method: "POST", headers: freeHeaders, body: JSON.stringify({ deckId: "cs-2-1-2" }) })).status, 402);
    assert.equal((await fetch(`${url}/api/billing/mock-upgrade`, { method: "POST", headers, body: JSON.stringify({ plan: "pro" }) })).status, 403);
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
  }
});
