"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { once } = require("node:events");
const { DatabaseSync } = require("node:sqlite");
const { createApplication } = require("../server");
const { POLICY_VERSION } = require("./services/launchPolicy");

const consent = { plan: "pro", adultPermissionConfirmed: true, termsAccepted: true, policyVersion: POLICY_VERSION };

async function fixture({ configured = true, failMail = false } = {}) {
  const db = new DatabaseSync(":memory:");
  const messages = [], checkouts = [], customers = [], pending = [];
  let failing = failMail;
  const environment = { NODE_ENV: "production", BASE_URL: "https://recallstride.fixture.test", EMAIL_FROM: "RecallStride <hello@fixture.test>",
    POLICY_OPERATOR_NAME: configured ? "Synthetic Operator" : "", POLICY_POSTAL_ADDRESS: configured ? "1 Fixture Street, Example City" : "", POLICY_SUPPORT_EMAIL: "support@fixture.test",
    STRIPE_SECRET_KEY: "sk_test_synthetic_fixture", STRIPE_PRICE_PRO: "price_fixture", STRIPE_WEBHOOK_SECRET: "whsec_synthetic_fixture", CONTACT_RETRY_INTERVAL_MS: "0" };
  const runtime = { scheduleCleanup: false, waitUntil: promise => pending.push(promise), mailConfigurationError: () => "",
    createMailTransport: () => ({ close() {}, sendMail: async message => {
      messages.push(message);
      if (failing) throw Object.assign(new Error("Synthetic SMTP rejection with a private detail"), { code: "EAUTH" });
      return { accepted: [message.to] };
    } }),
    stripeClient: {
      customers: { create: async details => { customers.push(details); return { id: "cus_fixture" }; } },
      checkout: { sessions: { create: async details => { checkouts.push(details); return { id: `cs_fixture_${checkouts.length}`, url: "https://checkout.stripe.fixture.test/synthetic" }; } } },
      subscriptions: { retrieve: async id => ({ id, customer: "cus_fixture", status: "active", current_period_end: Math.floor(Date.now() / 1000) + 2592000, items: { data: [{ price: { id: "price_fixture" } }] } }) },
      webhooks: { constructEvent: (body, signature, secret) => {
        assert.ok(Buffer.isBuffer(body));
        assert.equal(secret, "whsec_synthetic_fixture");
        if (signature !== "fixture-signed") throw new Error("Invalid synthetic signature");
        return JSON.parse(body.toString());
      } },
    },
  };
  const application = createApplication({ db, environment, staticAssets: false, runtime });
  const server = application.app.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  function account(id) {
    const now = new Date().toISOString(), token = `synthetic-session-${id}`;
    db.prepare("INSERT INTO users(id,email,name,email_verified,created_at,updated_at) VALUES(?,?,?,1,?,?)").run(id, `${id}@fixture.test`, `Synthetic ${id}`, now, now);
    db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run(crypto.createHash("sha256").update(token).digest("hex"), id, new Date(Date.now() + 3600000).toISOString(), now);
    return `nn_session=${token}`;
  }
  const cookie = account("student"), otherCookie = account("other");
  const post = (endpoint, body, headers = {}) => fetch(base + endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  let eventNumber = 0;
  const session = (overrides = {}) => ({ id: "cs_fixture_1", customer: "cus_fixture", subscription: "sub_fixture", metadata: checkouts[0]?.metadata || { userId: "student" }, status: "complete", payment_status: "paid", amount_total: 399, currency: "gbp", ...overrides });
  const webhook = (object, type = "checkout.session.completed", signature = "fixture-signed", id = `evt_fixture_${++eventNumber}`) => post("/api/billing/stripe/webhook", { id, type, data: { object } }, { "stripe-signature": signature });
  const checkout = () => post("/api/billing/checkout-session", consent, { Cookie: cookie });
  async function flush() { while (pending.length) await Promise.all(pending.splice(0)); }
  return { db, application, base, cookie, otherCookie, messages, checkouts, customers, checkout, session, webhook, flush, setFailing: value => { failing = value; },
    close: async () => { await flush(); await new Promise(resolve => server.close(resolve)); db.close(); } };
}

test("paid signed Checkout atomically grants access and supplies the original durable policy copies exactly once", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.checkout()).status, 200);
    const original = JSON.parse(f.db.prepare("SELECT contract_json FROM billing_checkout_contracts").get().contract_json);
    assert.equal(original.policyVersion, POLICY_VERSION);
    assert.equal(f.checkouts[0].metadata.contractSha256, original.sha256);
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "free");
    const eventId = "evt_same_fixture";
    assert.equal((await f.webhook(f.session(), "checkout.session.completed", "fixture-signed", eventId)).status, 200);
    await f.flush();
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "pro");
    const row = f.db.prepare("SELECT * FROM subscription_confirmation_queue").get();
    assert.equal(row.status, "delivered"); assert.equal(row.snapshot_available, 1);
    assert.equal(f.messages.length, 1);
    assert.equal(f.messages[0].attachments.length, 3);
    assert.equal(f.messages[0].attachments[1].content, original.termsHtml);
    assert.equal(f.messages[0].attachments[2].content, original.billingHtml);
    assert.match(f.messages[0].text, /£3\.99 per month/);
    assert.match(f.messages[0].text, /14 days/);
    assert.equal((await f.webhook(f.session(), "checkout.session.completed", "fixture-signed", eventId)).status, 200);
    assert.equal((await f.webhook(f.session())).status, 200);
    await f.flush();
    assert.equal(f.messages.length, 1);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM billing_events WHERE status='checkout_completed'").get().n, 1);
    const exported = await fetch(f.base + "/api/account/export", { headers: { Cookie: f.cookie } }).then(response => response.json());
    assert.deepEqual(exported.billingDocuments.checkoutContracts[0].contract, original);
    assert.equal(exported.billingDocuments.confirmations[0].status, "delivered");
    const other = await fetch(f.base + "/api/account/export", { headers: { Cookie: f.otherCookie } }).then(response => response.json());
    assert.deepEqual(other.billingDocuments, { checkoutContracts: [], confirmations: [] });
    f.db.prepare("UPDATE users SET subscription_status='canceled',plan='free' WHERE id='student'").run();
    const deleted = await fetch(f.base + "/api/account", { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: f.cookie }, body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }) });
    assert.equal(deleted.status, 200);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM billing_checkout_contracts").get().n, 0);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM subscription_confirmation_queue").get().n, 0);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM users WHERE id='other'").get().n, 1);
  } finally { await f.close(); }
});

test("SMTP failure leaves the paid webhook successful and persists a bounded independent retry", async () => {
  const f = await fixture({ failMail: true });
  try {
    assert.equal((await f.checkout()).status, 200);
    assert.equal((await f.webhook(f.session())).status, 200);
    await f.flush();
    const queued = f.db.prepare("SELECT * FROM subscription_confirmation_queue").get();
    assert.equal(queued.status, "delivery_failed"); assert.equal(queued.attempts, 1); assert.equal(queued.last_error_code, "EAUTH");
    assert.ok(Date.parse(queued.next_attempt_at) - Date.parse(queued.created_at) >= 600000);
    assert.equal(JSON.stringify(queued).includes("private detail"), false);
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "pro");
    assert.equal((await f.webhook(f.session())).status, 200); await f.flush();
    assert.equal(f.messages.length, 1);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM billing_events WHERE status='checkout_completed'").get().n, 1);
    const restarted = createApplication({ db: f.db, staticAssets: false, environment: { NODE_ENV: "production", BASE_URL: "https://new.fixture.test", EMAIL_FROM: "RecallStride <hello@fixture.test>" },
      runtime: { scheduleCleanup: false, mailConfigurationError: () => "", createMailTransport: () => ({ close() {}, sendMail: async message => { f.messages.push(message); return { accepted: [message.to] }; } }) } });
    f.db.prepare("UPDATE subscription_confirmation_queue SET next_attempt_at=?").run(new Date(Date.now() - 1000).toISOString());
    await restarted.retryQueuedSubscriptionConfirmations();
    assert.equal(f.messages.length, 2);
    assert.equal(f.messages[1].messageId, f.messages[0].messageId);
    assert.equal(f.messages[1].attachments[1].content, f.messages[0].attachments[1].content);
    assert.match(f.messages[1].text, /https:\/\/recallstride\.fixture\.test/);
    assert.equal(f.db.prepare("SELECT status FROM subscription_confirmation_queue").get().status, "delivered");
  } finally { await f.close(); }
});

test("unconfigured public operator prevents provider checkout calls and invalid signatures never grant access", async () => {
  const f = await fixture({ configured: false });
  try {
    assert.equal((await f.checkout()).status, 503);
    assert.equal(f.customers.length, 0); assert.equal(f.checkouts.length, 0);
    assert.equal((await f.webhook(f.session(), "checkout.session.completed", "wrong-signature")).status, 400);
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "free");
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM subscription_confirmation_queue").get().n, 0);
    assert.equal(f.messages.length, 0);
  } finally { await f.close(); }
});

test("a delayed unpaid Checkout waits for signed async payment success before confirming once", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.checkout()).status, 200);
    assert.equal((await f.webhook(f.session({ payment_status: "unpaid" }))).status, 200);
    await f.flush();
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "free");
    assert.equal(f.messages.length, 0);
    assert.equal((await f.webhook(f.session(), "checkout.session.async_payment_succeeded")).status, 200);
    await f.flush();
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "pro");
    assert.equal(f.messages.length, 1);
    assert.equal((await f.webhook(f.session())).status, 200); await f.flush();
    assert.equal(f.messages.length, 1);
  } finally { await f.close(); }
});

test("an outbox database failure rolls back the entitlement and can be retried safely", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.checkout()).status, 200);
    f.db.exec("CREATE TRIGGER synthetic_outbox_failure BEFORE INSERT ON subscription_confirmation_queue BEGIN SELECT RAISE(ABORT,'Synthetic outbox failure'); END;");
    assert.equal((await f.webhook(f.session(), "checkout.session.completed", "fixture-signed", "evt_database_retry")).status, 500);
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "free");
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM billing_events WHERE status='checkout_completed'").get().n, 0);
    assert.equal(f.messages.length, 0);
    f.db.exec("DROP TRIGGER synthetic_outbox_failure;");
    assert.equal((await f.webhook(f.session(), "checkout.session.completed", "fixture-signed", "evt_database_retry")).status, 200);
    await f.flush();
    assert.equal(f.db.prepare("SELECT plan FROM users WHERE id='student'").get().plan, "pro");
    assert.equal(f.messages.length, 1);
  } finally { await f.close(); }
});

test("legacy completed subscriptions receive a truthful confirmation without fabricated historical acceptance", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.webhook(f.session({ id: "cs_legacy_fixture", payment_status: "unpaid" }))).status, 200);
    await f.flush(); assert.equal(f.messages.length, 0);
    assert.equal((await f.webhook(f.session({ id: "cs_legacy_fixture", amount_total: 1999 }))).status, 200);
    await f.flush();
    assert.equal(f.messages.length, 1); assert.equal(f.messages[0].attachments.length, 1);
    assert.match(f.messages[0].text, /no recorded policy snapshot or acceptance version/);
    assert.match(f.messages[0].text, /£19\.99/);
    assert.doesNotMatch(f.messages[0].text, /£3\.99|no annual commitment|Acceptance recorded:/);
    assert.equal(f.db.prepare("SELECT snapshot_available FROM subscription_confirmation_queue").get().snapshot_available, 0);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM billing_checkout_contracts").get().n, 0);
  } finally { await f.close(); }
});
