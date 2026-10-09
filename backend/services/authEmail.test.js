"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { sendAuthenticationEmail, smtpTransportOptions, AuthEmailDeliveryError, AUTH_EMAIL_TIMEOUT_MS } = require("./authEmail");

test("authentication SMTP bounds connection, greeting, socket and entire delivery", () => {
  const options = smtpTransportOptions({ host: "mail.fixture.test", port: 465, secure: true, user: "fixture", pass: "fixture-password" });
  assert.deepEqual(options.auth, { user: "fixture", pass: "fixture-password" });
  assert.ok(options.connectionTimeout > 0 && options.connectionTimeout < AUTH_EMAIL_TIMEOUT_MS);
  assert.ok(options.greetingTimeout > 0 && options.greetingTimeout < AUTH_EMAIL_TIMEOUT_MS);
  assert.ok(options.socketTimeout > 0 && options.socketTimeout < AUTH_EMAIL_TIMEOUT_MS);
});

test("successful authentication delivery returns provider acceptance and closes transport", async () => {
  let closed = false;
  const response = await sendAuthenticationEmail({
    createTransport: () => ({ sendMail: async () => ({ accepted: ["student@fixture.test"] }), close: () => { closed = true; } }),
    message: { to: "student@fixture.test" }, kind: "verification",
  });
  assert.deepEqual(response.accepted, ["student@fixture.test"]);
  assert.equal(closed, true);
});

test("SMTP auth and recipient rejection produce recoverable errors without provider details", async () => {
  for (const failure of [Object.assign(new Error("535 fake secret diagnostic"), { code: "EAUTH" }), null]) {
    let closed = false;
    let recorded;
    await assert.rejects(sendAuthenticationEmail({
      createTransport: () => ({
        sendMail: async () => { if (failure) throw failure; return { accepted: [], rejected: ["student@fixture.test"] }; },
        close: () => { closed = true; },
      }),
      message: { to: "student@fixture.test" }, kind: "verification", onFailure: (error) => { recorded = error; },
    }), error => {
      assert.ok(error instanceof AuthEmailDeliveryError);
      assert.equal(error.status, 503);
      assert.equal(error.code, "AUTH_EMAIL_UNAVAILABLE");
      assert.match(error.message, /account is saved.*same email and password/);
      assert.doesNotMatch(error.message, /535|secret|student@/);
      return true;
    });
    assert.equal(closed, true);
    assert.equal(recorded.code, failure ? "EAUTH" : "ERECIPIENT");
  }
});

test("a stalled authentication transport returns promptly and is closed", async () => {
  let closed = false;
  const started = Date.now();
  await assert.rejects(sendAuthenticationEmail({
    createTransport: () => ({ sendMail: () => new Promise(() => {}), close: () => { closed = true; } }),
    message: { to: "student@fixture.test" }, kind: "verification", timeoutMs: 15,
  }), error => error.status === 503 && error.cause.code === "ETIMEDOUT");
  assert.ok(Date.now() - started < 500);
  assert.equal(closed, true);
});
