"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { once } = require("node:events");
const { DatabaseSync } = require("node:sqlite");
const { verificationEmail, passwordResetEmail } = require("./authEmailTemplates");
const { createApplication } = require("../../server");

test("account email escapes recipient names and links without changing the plain-text fallback", () => {
  const name = `Ada <img src=x onerror=alert(1)> & "Grace"`;
  const url = 'https://recallstride.fixture.test/api/auth/verify?token=abc&next="quoted"';
  for (const render of [verificationEmail, passwordResetEmail]) {
    const mail = render({ name, url });
    assert.match(mail.html, /Ada &lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;Grace&quot;/);
    assert.match(mail.html, /href="https:\/\/recallstride\.fixture\.test\/api\/auth\/verify\?token=abc&amp;next=&quot;quoted&quot;"/);
    assert.ok(mail.text.includes(name));
    assert.ok(mail.text.includes(url));
    assert.doesNotMatch(mail.html, /<(?:img|script|link)\b/i);
    assert.throws(() => render({ name, url: "javascript:alert(1)" }), /HTTP or HTTPS/);
  }
});

test("verification and reset mail give the right action, expiry and safe recovery instructions", () => {
  const verification = verificationEmail({ name: "Ada", url: "https://recallstride.fixture.test/api/auth/verify?token=fixture" });
  const reset = passwordResetEmail({ name: "Ada", url: "https://recallstride.fixture.test/?reset=fixture" });
  assert.equal(verification.subject, "Verify your RecallStride account");
  assert.equal(reset.subject, "Reset your RecallStride password");
  for (const [mail, action, expiry] of [[verification, "Verify my email", "24 hours"], [reset, "Reset my password", "30 minutes"]]) {
    assert.ok(mail.html.includes(action));
    assert.ok(mail.text.includes(action));
    assert.ok(mail.html.includes(expiry));
    assert.ok(mail.text.includes(`This link expires in ${expiry}.`));
    assert.match(mail.html, /Button not working\? Copy and paste this link/);
    assert.match(mail.text, /you can ignore this email/);
    assert.match(mail.html, /role="presentation"/);
    assert.match(mail.html, /max-width:640px/);
    assert.match(mail.html, /#236a5e/);
  }
  assert.match(reset.text, /Your password will stay the same/);
});

test("signup and password reset deliver the branded multipart templates through the injected transport", async () => {
  const db = new DatabaseSync(":memory:");
  const messages = [], pending = [];
  const origin = "https://recallstride.fixture.test";
  const application = createApplication({ db, staticAssets: false,
    environment: { NODE_ENV: "production", BASE_URL: origin, CORS_ORIGIN: origin, CONTACT_RETRY_INTERVAL_MS: "0", EMAIL_FROM: "RecallStride <sender@fixture.test>" },
    runtime: { scheduleCleanup: false, mailConfigurationError: () => "", waitUntil: promise => pending.push(promise),
      createMailTransport: () => ({ sendMail: async message => { messages.push(message); return { accepted: [message.to] }; }, close() {} }) },
  });
  const server = application.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (endpoint, body) => fetch(base + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const account = { name: "Ada & Grace", email: "student@fixture.test", password: "SyntheticPass123", ageConfirmed: true, termsAccepted: true, policyVersion: "2026-10-10" };
  try {
    assert.equal((await post("/api/auth/signup", account)).status, 201);
    assert.equal(messages.length, 1);
    const verification = messages[0];
    const verificationUrl = new URL(verification.text.match(/https:\/\/[^\s]+/)[0]);
    assert.equal(verification.to, account.email);
    assert.equal(verification.from, "RecallStride <sender@fixture.test>");
    assert.equal(verificationUrl.origin, origin);
    assert.equal(verificationUrl.pathname, "/api/auth/verify");
    assert.ok(verificationUrl.searchParams.get("token"));
    assert.deepEqual({ subject: verification.subject, text: verification.text, html: verification.html }, verificationEmail({ name: account.name, url: verificationUrl.href }));
    assert.equal((await fetch(base + verificationUrl.pathname + verificationUrl.search, { redirect: "manual" })).status, 302);
    assert.equal((await post("/api/auth/forgot-password", { email: account.email })).status, 202);
    await Promise.all(pending);
    assert.equal(messages.length, 2);
    const reset = messages[1];
    const resetUrl = new URL(reset.text.match(/https:\/\/[^\s]+/)[0]);
    assert.equal(reset.to, account.email);
    assert.equal(resetUrl.origin, origin);
    assert.equal(resetUrl.pathname, "/");
    assert.ok(resetUrl.searchParams.get("reset"));
    assert.deepEqual({ subject: reset.subject, text: reset.text, html: reset.html }, passwordResetEmail({ name: account.name, url: resetUrl.href }));
  } finally {
    await Promise.all(pending);
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
