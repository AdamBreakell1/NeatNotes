"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { DatabaseSync } = require("node:sqlite");
const { createApplication } = require("../server");
const { POLICY_VERSION } = require("./services/launchPolicy");

const signupConsent = { ageConfirmed: true, termsAccepted: true, policyVersion: POLICY_VERSION };
const checkoutConsent = { adultPermissionConfirmed: true, termsAccepted: true, policyVersion: POLICY_VERSION };
async function fixture({ google = false } = {}) {
  const db = new DatabaseSync(":memory:");
  const messages = [], checkouts = [], customers = [];
  const application = createApplication({ db, staticAssets: false,
    environment: { NODE_ENV: "production", BASE_URL: "https://recallstride.fixture.test", POLICY_OPERATOR_NAME: "Synthetic Operator", POLICY_POSTAL_ADDRESS: "1 Fixture Street, Example City", POLICY_SUPPORT_EMAIL: "support@fixture.test", CONTACT_RETRY_INTERVAL_MS: "0", STRIPE_SECRET_KEY: "sk_test_synthetic_fixture", STRIPE_PRICE_PRO: "price_fixture", GOOGLE_CLIENT_ID: google ? "synthetic-client" : "", GOOGLE_CLIENT_SECRET: google ? "synthetic-secret" : "" },
    runtime: { scheduleCleanup: false, mailConfigurationError: () => "",
      createMailTransport: () => ({ sendMail: async message => { messages.push(message); return { accepted: [message.to] }; }, close() {} }),
      stripeClient: { customers: { create: async details => { customers.push(details); return { id: "cus_fixture" }; } },
        checkout: { sessions: { create: async details => { checkouts.push(details); return { id: "cs_synthetic_policy_fixture", url: "https://checkout.stripe.fixture.test/synthetic" }; } } } },
      fetchOAuth: async url => ({ ok: true, json: async () => String(url).includes("/token") ? { access_token: "synthetic-token" } : { sub: "synthetic-google-user", email: "student@fixture.test", email_verified: true, name: "Synthetic Student" } }),
    },
  });
  const server = application.app.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (endpoint, body, cookie = "") => fetch(base + endpoint, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body) });
  const account = { name: "Synthetic Student", email: "student@fixture.test", password: "SyntheticPass123" };
  async function signIn() {
    assert.equal((await post("/api/auth/signup", { ...account, ...signupConsent })).status, 201);
    const verification = new URL(messages[0].text.match(/https:\/\/[^\s]+/)[0]);
    assert.equal((await fetch(base + verification.pathname + verification.search, { redirect: "manual" })).status, 302);
    const login = await post("/api/auth/login", account); assert.equal(login.status, 200);
    return { cookie: login.headers.get("set-cookie").split(";")[0], user: (await login.json()).user };
  }
  return { db, base, post, account, signIn, messages, checkouts, customers,
    close: async () => { await new Promise(resolve => server.close(resolve)); db.close(); } };
}

test("signup requires truthful age and current terms attestation before creating an account or sending mail", async () => {
  const f = await fixture();
  try {
    for (const consent of [{}, { ...signupConsent, ageConfirmed: false }, { ...signupConsent, ageConfirmed: "true" }, { ...signupConsent, termsAccepted: false }]) {
      const response = await f.post("/api/auth/signup", { ...f.account, ...consent });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).code, "POLICY_CONSENT_REQUIRED");
    }
    const outdated = await f.post("/api/auth/signup", { ...f.account, ...signupConsent, policyVersion: "old" });
    assert.equal(outdated.status, 400); assert.equal((await outdated.json()).code, "POLICY_VERSION_OUTDATED");
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM users").get().n, 0);
    assert.equal(f.messages.length, 0);
    const { user } = await f.signIn();
    assert.equal(user.policyAcceptance.version, POLICY_VERSION);
    assert.equal(user.policyAcceptance.acceptedAt, user.policyAcceptance.ageConfirmedAt);
    assert.ok(Number.isFinite(Date.parse(user.policyAcceptance.acceptedAt)));
    assert.equal(f.db.prepare("PRAGMA table_info(users)").all().some(column => /birth|\bdob\b/i.test(column.name)), false);
  } finally { await f.close(); }
});

test("existing accounts can still log in without a new acceptance or fabricated age record", async () => {
  const f = await fixture();
  try {
    await f.signIn();
    f.db.exec("UPDATE users SET age_confirmed_at=NULL,terms_accepted_at=NULL,terms_version=NULL");
    const response = await f.post("/api/auth/login", f.account);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).user.policyAcceptance, { version: null, acceptedAt: null, ageConfirmedAt: null });
  } finally { await f.close(); }
});

test("checkout requires current subscription terms and adult permission before provider calls, and records acceptance", async () => {
  const f = await fixture();
  try {
    const { cookie, user } = await f.signIn();
    for (const consent of [{}, { ...checkoutConsent, adultPermissionConfirmed: false }, { ...checkoutConsent, termsAccepted: false }, { ...checkoutConsent, policyVersion: "old" }]) {
      assert.equal((await f.post("/api/billing/checkout-session", { plan: "pro", ...consent }, cookie)).status, 400);
    }
    assert.equal(f.checkouts.length, 0); assert.equal(f.customers.length, 0);
    const response = await f.post("/api/billing/checkout-session", { plan: "pro", ...checkoutConsent }, cookie);
    assert.equal(response.status, 200);
    assert.equal(f.checkouts.length, 1); assert.equal(f.customers.length, 1);
    assert.equal(f.checkouts[0].line_items[0].price, "price_fixture");
    assert.equal(f.checkouts[0].success_url.startsWith("https://recallstride.fixture.test/"), true);
    const event = f.db.prepare("SELECT * FROM billing_events WHERE user_id=? AND status='checkout_started'").get(user.id);
    assert.equal(event.consent_version, POLICY_VERSION);
    assert.equal(event.adult_permission_confirmed, 1);
    assert.equal(event.consent_accepted_at, event.created_at);
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id=?").get(user.id).plan, "free", "Opening checkout must never grant paid access.");
  } finally { await f.close(); }
});

test("withdrawing optional usage analytics deletes only that account's analytics and preserves study work", async () => {
  const f = await fixture();
  try {
    const { cookie, user } = await f.signIn();
    const now = new Date().toISOString();
    f.db.prepare("INSERT INTO users(id,email,name,created_at,updated_at) VALUES(?,?,?,?,?)").run("other-owner", "other@fixture.test", "Another synthetic student", now, now);
    f.db.prepare("INSERT INTO product_events(id,user_id,event_name,created_at) VALUES(?,?,?,?)").run("other-event", "other-owner", "note_created", now);
    f.db.prepare("INSERT INTO pilot_events(id,user_id,event_name,session_id,mode,created_at) VALUES(?,?,?,?,?,?)").run("other-event", "other-owner", "coding_run", "other-session", "learn", now);
    const headers = { "Content-Type": "application/json", Cookie: cookie };
    const patch = body => fetch(f.base + "/api/profile", { method: "PATCH", headers, body: JSON.stringify(body) });
    assert.equal((await patch({ notificationPreferences: { usageAnalytics: true } })).status, 200);
    assert.equal((await f.post("/api/events", { name: "note_created", details: { noteId: "synthetic" } }, cookie)).status, 202);
    assert.equal((await f.post("/api/pilot/events", { id: "synthetic-event-123456", name: "coding_run", sessionId: "synthetic-session-123456", taskId: null, mode: "learn" }, cookie)).status, 202);
    const workspaceId = f.db.prepare("SELECT id FROM workspaces WHERE owner_id=?").get(user.id).id;
    assert.equal((await f.post("/api/notes", { workspaceId, body: "Keep my revision note" }, cookie)).status, 201);
    const before = await fetch(f.base + "/api/account/export", { headers }).then(response => response.json());
    assert.equal(before.usageAnalytics.length, 1); assert.equal(before.pilotEvents.length, 1); assert.equal(before.notes.length, 1);
    assert.equal((await patch({ notificationPreferences: { usageAnalytics: false } })).status, 200);
    const after = await fetch(f.base + "/api/account/export", { headers }).then(response => response.json());
    assert.equal(after.usageAnalytics.length, 0); assert.equal(after.pilotEvents.length, 0); assert.equal(after.notes.length, 1);
    assert.ok(f.db.prepare("SELECT count(*) AS n FROM audit_logs").get().n > 0, "Security records are a separate purpose.");
    assert.equal((await f.post("/api/events", { name: "note_created" }, cookie)).status, 204);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM product_events WHERE user_id='other-owner'").get().n, 1);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM pilot_events WHERE user_id='other-owner'").get().n, 1);
  } finally { await f.close(); }
});

test("account deletion erases optional analytics rather than leaving detached activity identifiers", async () => {
  const f = await fixture();
  try {
    const { cookie, user } = await f.signIn();
    const now = new Date().toISOString();
    f.db.prepare("INSERT INTO product_events(id,user_id,event_name,metadata,created_at) VALUES(?,?,?,?,?)").run("fixture-event", user.id, "note_created", '{"noteId":"synthetic-note"}', now);
    const response = await fetch(f.base + "/api/account", { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT", password: f.account.password }) });
    assert.equal(response.status, 200);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM product_events").get().n, 0);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM users").get().n, 0);
  } finally { await f.close(); }
});

test("Google cannot create an account without age and terms confirmation but existing accounts can sign in", async () => {
  const f = await fixture({ google: true });
  async function googleCallback() {
    const start = await fetch(f.base + "/api/auth/google", { redirect: "manual" });
    assert.equal(start.status, 302);
    const authorization = new URL(start.headers.get("location"));
    const cookie = start.headers.get("set-cookie").split(";")[0];
    return fetch(f.base + "/api/auth/google/callback?code=synthetic-code&state=" + authorization.searchParams.get("state"), { headers: { Cookie: cookie }, redirect: "manual" });
  }
  try {
    const blocked = await googleCallback();
    assert.equal(blocked.status, 400);
    assert.match(await blocked.text(), /Create your account with email first/);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM users").get().n, 0);
    await f.signIn();
    f.db.exec("UPDATE users SET age_confirmed_at=NULL,terms_accepted_at=NULL,terms_version=NULL");
    const accepted = await googleCallback();
    assert.equal(accepted.status, 302);
    assert.equal(accepted.headers.get("location"), "/");
    assert.match(accepted.headers.get("set-cookie"), /nn_session=/);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM users").get().n, 1);
    assert.equal(f.db.prepare("SELECT terms_version FROM users").get().terms_version, null);
  } finally { await f.close(); }
});
