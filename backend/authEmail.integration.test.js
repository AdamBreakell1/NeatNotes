"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { DatabaseSync } = require("node:sqlite");

async function fixtureServer(smtp = {}) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-auth-email-"));
  const reserved = net.createServer();
  reserved.listen(0, "127.0.0.1");
  await once(reserved, "listening");
  const port = reserved.address().port;
  await new Promise(resolve => reserved.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const database = path.join(temporary, "fixture.sqlite");
  const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    cwd: path.join(__dirname, ".."), stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env, RECALLSTRIDE_SKIP_DOTENV: "true", NODE_ENV: "production",
      PORT: String(port), BASE_URL: base, CORS_ORIGIN: base, DATABASE_PATH: database,
      AUTH_RATE_LIMIT: "150", CONTACT_RETRY_INTERVAL_MS: "0", ALLOW_MOCK_BILLING: "false",
      SMTP_HOST: "", SMTP_PORT: "587", SMTP_SECURE: "false", SMTP_USER: "", SMTP_PASS: "",
      EMAIL_FROM: "RecallStride <noreply@fixture.test>", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "",
      GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", ...smtp,
    },
  });
  let output = "";
  child.stdout.on("data", data => { output += data; });
  child.stderr.on("data", data => { output += data; });
  const close = async () => {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
    fs.rmSync(temporary, { recursive: true, force: true });
  };
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Fixture server exited: ${output}`);
      try { if ((await fetch(`${base}/api/health`)).ok) return { base, database, close }; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Fixture server didn't start: ${output}`);
  } catch (error) { await close(); throw error; }
}

async function smtpFixture() {
  const state = { reject: true, messages: [], sockets: new Set() };
  const server = net.createServer(socket => {
    state.sockets.add(socket);
    socket.on("close", () => state.sockets.delete(socket));
    socket.on("error", () => {});
    socket.write("220 fixture.test SMTP\r\n");
    let buffer = "";
    let message = null;
    socket.on("data", chunk => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (message) {
          if (line === ".") {
            state.messages.push(message.join("\r\n"));
            message = null;
            socket.write("250 message accepted by local fixture\r\n");
          } else message.push(line);
        } else if (/^(EHLO|HELO) /i.test(line)) socket.write("250 fixture.test\r\n");
        else if (/^MAIL FROM:/i.test(line)) socket.write("250 sender accepted\r\n");
        else if (/^RCPT TO:/i.test(line)) socket.write(state.reject ? "550 fixture recipient rejection\r\n" : "250 recipient accepted\r\n");
        else if (/^DATA$/i.test(line)) { message = []; socket.write("354 end with dot\r\n"); }
        else if (/^QUIT$/i.test(line)) socket.end("221 goodbye\r\n");
        else socket.write("250 ok\r\n");
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  state.port = server.address().port;
  state.close = async () => {
    state.sockets.forEach(socket => socket.destroy());
    await new Promise(resolve => server.close(resolve));
  };
  return state;
}

const account = { name: "Synthetic Mail Student", email: "student@fixture.test", password: "StrongPass123" };
const post = (base, endpoint, body) => fetch(base + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
function verificationLink(message) {
  const decoded = message.replace(/=\r\n/g, "").replace(/=3D/g, "=");
  return decoded.match(/http:\/\/127\.0\.0\.1:\d+\/api\/auth\/verify\?token=[A-Za-z0-9_-]+/)[0];
}
function resetToken(message) {
  const decoded = message.replace(/=\r\n/g, "").replace(/=3D/g, "=");
  return decoded.match(/http:\/\/127\.0\.0\.1:\d+\/\?reset=([A-Za-z0-9_-]+)/)[1];
}

test("missing production email configuration returns honest 503 without creating unusable accounts", async () => {
  const fixture = await fixtureServer();
  try {
    const response = await post(fixture.base, "/api/auth/signup", account);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "60");
    const body = await response.json();
    assert.equal(body.code, "AUTH_EMAIL_UNAVAILABLE");
    assert.match(body.error, /email is temporarily unavailable/);
    assert.equal("devVerificationUrl" in body, false);
    const database = new DatabaseSync(fixture.database, { readOnly: true });
    try { assert.equal(database.prepare("SELECT count(*) AS total FROM users").get().total, 0); } finally { database.close(); }
    assert.equal((await post(fixture.base, "/api/auth/forgot-password", { email: account.email })).status, 503);
  } finally { await fixture.close(); }
});

test("configured SMTP failure is recoverable; retries preserve the account and earlier verification links", async () => {
  const smtp = await smtpFixture();
  const fixture = await fixtureServer({ SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.port) });
  try {
    const signup = await post(fixture.base, "/api/auth/signup", account);
    assert.equal(signup.status, 503);
    const failed = await signup.json();
    assert.equal(failed.code, "AUTH_EMAIL_UNAVAILABLE");
    assert.match(failed.error, /account is saved.*same email and password/);
    assert.doesNotMatch(failed.error, /550|SMTP|fixture/);
    assert.equal((await post(fixture.base, "/api/auth/login", account)).status, 403);

    const database = new DatabaseSync(fixture.database, { readOnly: true });
    try {
      const user = database.prepare("SELECT id, email_verified FROM users WHERE email = ?").get(account.email);
      assert.equal(user.email_verified, 0);
      assert.equal(database.prepare("SELECT count(*) AS total FROM workspaces WHERE owner_id = ?").get(user.id).total, 1);
      assert.equal(database.prepare("SELECT count(*) AS total FROM student_profiles WHERE user_id = ?").get(user.id).total, 1);

      smtp.reject = false;
      const retry = await post(fixture.base, "/api/auth/signup", account);
      assert.equal(retry.status, 202);
      assert.equal("devVerificationUrl" in (await retry.json()), false);
      const firstLink = verificationLink(smtp.messages.at(-1));

      smtp.reject = true;
      assert.equal((await post(fixture.base, "/api/auth/signup", account)).status, 503);
      assert.equal(database.prepare("SELECT count(*) AS total FROM users WHERE email = ?").get(account.email).total, 1);
      assert.equal(database.prepare("SELECT count(*) AS total FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL").get(user.id).total, 3);
      const mismatched = await post(fixture.base, "/api/auth/signup", { ...account, password: "DifferentPass123" });
      assert.equal(mismatched.status, 202);
      assert.equal(smtp.messages.length, 1);

      smtp.reject = false;
      assert.equal((await post(fixture.base, "/api/auth/signup", account)).status, 202);
      const secondLink = verificationLink(smtp.messages.at(-1));
      assert.notEqual(firstLink, secondLink);
      assert.equal((await fetch(firstLink, { redirect: "manual" })).status, 302);
      assert.equal((await fetch(secondLink, { redirect: "manual" })).status, 400);
      assert.equal(database.prepare("SELECT count(*) AS total FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL").get(user.id).total, 0);
      assert.equal((await post(fixture.base, "/api/auth/login", account)).status, 200);

      const forgot = await post(fixture.base, "/api/auth/forgot-password", { email: account.email });
      const forgotBody = await forgot.json();
      assert.equal(forgot.status, 202);
      const firstReset = resetToken(smtp.messages.at(-1));
      smtp.reject = true;
      const failedReset = await post(fixture.base, "/api/auth/forgot-password", { email: account.email });
      assert.equal(failedReset.status, 202);
      assert.deepEqual(await failedReset.json(), forgotBody);
      const unknown = await post(fixture.base, "/api/auth/forgot-password", { email: "unknown@fixture.test" });
      assert.deepEqual(await unknown.json(), forgotBody);
      smtp.reject = false;
      assert.equal((await post(fixture.base, "/api/auth/forgot-password", { email: account.email })).status, 202);
      const secondReset = resetToken(smtp.messages.at(-1));
      assert.notEqual(firstReset, secondReset);
      const newPassword = "ReplacementPass123";
      assert.equal((await post(fixture.base, "/api/auth/reset-password", { token: firstReset, password: newPassword })).status, 200);
      assert.equal((await post(fixture.base, "/api/auth/reset-password", { token: secondReset, password: "UnwantedPass123" })).status, 400);
      assert.equal((await post(fixture.base, "/api/auth/login", account)).status, 401);
      assert.equal((await post(fixture.base, "/api/auth/login", { ...account, password: newPassword })).status, 200);
    } finally { database.close(); }
  } finally { await fixture.close(); await smtp.close(); }
});
