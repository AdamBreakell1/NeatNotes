const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const port = 4300 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "neat-notes-integration-"));
let serverProcess;
let cookie = "";
let verificationUrl = "";
let teacherCookie = "";
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

after(() => {
  serverProcess?.kill("SIGTERM");
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("public health and OCR acquisition page are production-readable", async () => {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.ok, true);
  assert.equal(health.databasePersistent, true);
  assert.equal(health.deckCount, 16);

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
    body: JSON.stringify({ name: "Integration Student", email: "student@example.test", password: "StrongPass123" }),
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
  cookie = loginResponse.headers.get("set-cookie").split(";")[0];

  const profileResponse = await fetch(`${baseUrl}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ role: "admin", learnerType: "year_13", targetGrade: "A" }),
  });
  const profile = await profileResponse.json();
  assert.equal(profileResponse.status, 200);
  assert.equal(profile.user.role, "student");
  assert.equal(profile.studentProfile.learner_type, "year_13");
});

test("free account cannot bypass deck or teacher entitlements", async () => {
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
  assert.equal(classResponse.status, 403);
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

test("teacher class, assignment and student completion journey remains permission-bound", async () => {
  teacherCookie = await createVerifiedAccount({
    name: "Integration Teacher",
    email: "teacher@example.test",
    password: "TeacherPass123",
  });
  secondStudentCookie = await createVerifiedAccount({
    name: "Second Student",
    email: "second-student@example.test",
    password: "StudentPass123",
  });

  const upgradeResponse = await fetch(`${baseUrl}/api/billing/mock-upgrade`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: teacherCookie },
    body: JSON.stringify({ plan: "teacher" }),
  });
  assert.equal(upgradeResponse.status, 200);

  const classResponse = await fetch(`${baseUrl}/api/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: teacherCookie },
    body: JSON.stringify({ name: "Integration Class", yearGroup: "Year 12" }),
  });
  const classPayload = await classResponse.json();
  assert.equal(classResponse.status, 201);
  assert.match(classPayload.class.joinCode, /^NN-[A-Z2-9]{5}-[A-Z2-9]{5}$/);

  const classId = classPayload.class.id;
  const joinCode = classPayload.class.joinCode;
  const previewResponse = await fetch(`${baseUrl}/api/classes/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: secondStudentCookie },
    body: JSON.stringify({ code: joinCode }),
  });
  assert.equal(previewResponse.status, 200);

  const joinResponse = await fetch(`${baseUrl}/api/classes/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: secondStudentCookie },
    body: JSON.stringify({ code: joinCode }),
  });
  assert.equal(joinResponse.status, 201);

  const assignmentResponse = await fetch(`${baseUrl}/api/classes/${classId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: teacherCookie },
    body: JSON.stringify({ topicId: "cs-1-1-1", title: "Processor retrieval", taskType: "topic_revision" }),
  });
  const assignmentPayload = await assignmentResponse.json();
  assert.equal(assignmentResponse.status, 201);

  const studentAssignmentsResponse = await fetch(`${baseUrl}/api/assignments`, {
    headers: { Cookie: secondStudentCookie },
  });
  const studentAssignments = await studentAssignmentsResponse.json();
  assert.equal(studentAssignmentsResponse.status, 200);
  assert.equal(studentAssignments.assignments.length, 1);

  const completionResponse = await fetch(`${baseUrl}/api/assignments/${assignmentPayload.assignment.id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: secondStudentCookie },
    body: JSON.stringify({ status: "complete" }),
  });
  assert.equal(completionResponse.status, 200);

  const insightsResponse = await fetch(`${baseUrl}/api/classes/${classId}/insights`, {
    headers: { Cookie: teacherCookie },
  });
  const insights = await insightsResponse.json();
  assert.equal(insightsResponse.status, 200);
  assert.equal(insights.students.length, 1);
  assert.equal(insights.dashboard.summary.students, 1);

  const teacherAssignmentsResponse = await fetch(`${baseUrl}/api/assignments`, {
    headers: { Cookie: teacherCookie },
  });
  const teacherAssignments = await teacherAssignmentsResponse.json();
  assert.equal(teacherAssignmentsResponse.status, 200);
  assert.equal(teacherAssignments.assignments[0].completedCount, 1);

  const forbiddenInsights = await fetch(`${baseUrl}/api/classes/${classId}/insights`, {
    headers: { Cookie: cookie },
  });
  assert.ok([402, 403].includes(forbiddenInsights.status));

  const archiveResponse = await fetch(`${baseUrl}/api/classes/${classId}/archive`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: teacherCookie },
    body: JSON.stringify({}),
  });
  assert.equal(archiveResponse.status, 200);

  const archivedCompletionResponse = await fetch(`${baseUrl}/api/assignments/${assignmentPayload.assignment.id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: secondStudentCookie },
    body: JSON.stringify({ status: "started" }),
  });
  assert.equal(archivedCompletionResponse.status, 404);
});
