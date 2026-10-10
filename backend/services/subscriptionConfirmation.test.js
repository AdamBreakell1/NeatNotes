"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const nodemailer = require("nodemailer");
const { RETRY_MS, createCheckoutContract, confirmationEmail, createSubscriptionConfirmations } = require("./subscriptionConfirmation");

const config = { configured: true, version: "2026-10-10", operatorName: "Synthetic Operator", tradingName: "Fixture Systems",
  postalAddress: "1 Fictional Street\nExample City", supportEmail: "support@fixture.test", website: "https://recallstride.fixture.test" };
const session = { id: "cs_synthetic_confirmation", amount_total: 299, currency: "gbp" };
const user = { id: "fixture-owner", name: "Synthetic <Student>", email: "student@fixture.test" };
function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE notes(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),body TEXT); INSERT INTO users VALUES('fixture-owner'),('other-owner'); INSERT INTO notes VALUES('note','fixture-owner','Keep my study work')");
  db.transactionSync = (work) => { db.exec("BEGIN IMMEDIATE"); try { const result = work(); db.exec("COMMIT"); return result; } catch(error) { db.exec("ROLLBACK"); throw error; } };
  return db;
}
const enqueue = (outbox, id = session.id) => outbox.enqueue({ user, session: { ...session, id }, currentConfig: config, currentPeriodEnd: "2026-11-10T12:00:00.000Z" });

test("checkout requires public identity and stores self-contained, immutable versioned terms and billing documents", async () => {
  assert.throws(() => createCheckoutContract({ ...config, configured: false }), /before selling/);
  assert.throws(() => createCheckoutContract({ ...config, postalAddress: "" }), /not available/);
  const contract = createCheckoutContract(config);
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(contract.policyVersion, config.version);
  assert.match(contract.termsHtml, /Synthetic Operator/);
  assert.match(contract.billingHtml, /14-day full refund promise/);
  assert.doesNotMatch(contract.termsHtml + contract.billingHtml, /<script|<iframe/i);
  const message = confirmationEmail({ user, session, contract, currentConfig: { ...config, operatorName: "Later Operator" }, currentPeriodEnd: "2026-11-10T12:00:00.000Z" });
  assert.match(message.text, /£3\.99 per month/); assert.match(message.text, /£2\.99/);
  assert.match(message.text, /including when you have used the service/);
  assert.match(message.text, /Synthetic Operator/); assert.doesNotMatch(message.text, /Later Operator/);
  assert.doesNotMatch(message.html, /Synthetic <Student>|<script/); assert.match(message.html, /Synthetic &lt;Student&gt;/);
  assert.equal(message.attachments.length, 3);
  assert.equal(message.attachments[1].content, contract.termsHtml);
  assert.equal(message.attachments[2].content, contract.billingHtml);
  const mailer = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const mime = (await mailer.sendMail({ from: "RecallStride <hello@fixture.test>", ...message })).message.toString();
  assert.match(mime, /multipart\/mixed/); assert.match(mime, /RecallStride-Terms-2026-10-10\.html/);
  assert.match(mime, /RecallStride-Cancellation-and-Billing-2026-10-10\.html/);
});

test("checkout-session identity prevents repeated or cross-account contract and confirmation replacement", () => {
  const db = database();
  try {
    const outbox = createSubscriptionConfirmations({ db, sendMessage: async () => {} });
    const contract = createCheckoutContract(config);
    outbox.recordCheckout(session.id, user.id, contract); outbox.recordCheckout(session.id, user.id, contract);
    assert.throws(() => outbox.recordCheckout(session.id, "other-owner", contract), /identity cannot be changed/);
    enqueue(outbox); enqueue(outbox);
    assert.equal(db.prepare("SELECT count(*) AS n FROM subscription_confirmation_queue").get().n, 1);
    assert.deepEqual(outbox.export("other-owner"), { checkoutContracts: [], confirmations: [] });
    assert.equal(outbox.export(user.id).checkoutContracts[0].contract.termsHtml, contract.termsHtml);
  } finally { db.close(); }
});

test("mail failures persist a ten-minute retry with a safe error code and stable message identity", async () => {
  const db = database(); let time = Date.now(), fail = true; const sent = [];
  try {
    let outbox = createSubscriptionConfirmations({ db, now: () => time, sendMessage: async message => {
      sent.push(message); if (fail) throw Object.assign(new Error("provider password must never persist"), { code: "EAUTH" });
    } });
    outbox.recordCheckout(session.id, user.id, createCheckoutContract(config)); enqueue(outbox);
    await outbox.retry();
    const failed = db.prepare("SELECT * FROM subscription_confirmation_queue").get();
    assert.equal(failed.status, "delivery_failed"); assert.equal(failed.attempts, 1); assert.equal(failed.last_error_code, "EAUTH");
    assert.equal(Date.parse(failed.next_attempt_at), time + RETRY_MS); assert.doesNotMatch(JSON.stringify(failed), /provider password/);
    time += RETRY_MS - 1; await outbox.retry(); assert.equal(sent.length, 1);
    time++; fail = false;
    outbox = createSubscriptionConfirmations({ db, now: () => time, sendMessage: async message => sent.push(message) });
    await outbox.retry(); await outbox.retry();
    assert.equal(sent.length, 2); assert.equal(sent[0].messageId, sent[1].messageId);
    assert.equal(db.prepare("SELECT status FROM subscription_confirmation_queue").get().status, "delivered");
  } finally { db.close(); }
});

test("persistent leases prevent concurrent sends and an expired process lease can recover", async () => {
  const db = database(); let time = Date.now(), release, sends = 0;
  try {
    const first = createSubscriptionConfirmations({ db, now: () => time, sendMessage: () => { sends++; return new Promise(resolve => { release = resolve; }); } });
    const second = createSubscriptionConfirmations({ db, now: () => time, sendMessage: async () => { sends++; } });
    enqueue(first);
    const pending = first.retry(); await second.retry(); assert.equal(sends, 1);
    release(); await pending;
    enqueue(first, "cs_interrupted_fixture");
    db.prepare("UPDATE subscription_confirmation_queue SET status='sending',lease_token='lost-process',lease_until=? WHERE checkout_session_id='cs_interrupted_fixture'")
      .run(new Date(time - 1).toISOString());
    await second.retry(); assert.equal(sends, 2);
    assert.equal(db.prepare("SELECT status FROM subscription_confirmation_queue WHERE checkout_session_id='cs_interrupted_fixture'").get().status, "delivered");
  } finally { db.close(); }
});

test("unconfigured email remains queued and unexpected provider errors never persist their values", async () => {
  const db = database();
  try {
    const unavailable = createSubscriptionConfirmations({ db, configurationError: () => "SMTP not ready", sendMessage: async () => { throw new Error("must not send"); } });
    enqueue(unavailable); await unavailable.retry();
    assert.equal(db.prepare("SELECT attempts FROM subscription_confirmation_queue").get().attempts, 0);
    const failed = createSubscriptionConfirmations({ db, sendMessage: async () => { throw Object.assign(new Error("private token"), { code: "secret-token-value" }); } });
    await failed.retry(); assert.equal(db.prepare("SELECT last_error_code FROM subscription_confirmation_queue").get().last_error_code, "EMAIL_DELIVERY_FAILED");
  } finally { db.close(); }
});

test("legacy confirmations disclose missing historical terms without manufacturing monthly acceptance", () => {
  const message = confirmationEmail({ user, session, currentConfig: config });
  assert.equal(message.attachments.length, 1);
  assert.match(message.text, /no recorded policy snapshot or acceptance version/);
  assert.doesNotMatch(message.text, /£3\.99 per month|Acceptance recorded:|no annual commitment/);
});

test("seven-year retention and account erasure remove contract and outbox records while preserving unrelated study data", () => {
  const db = database();
  try {
    const outbox = createSubscriptionConfirmations({ db, sendMessage: async () => {} });
    outbox.recordCheckout(session.id, user.id, createCheckoutContract(config)); enqueue(outbox);
    outbox.recordCheckout("cs_expired", user.id, createCheckoutContract(config, "2000-01-01T00:00:00.000Z")); enqueue(outbox, "cs_expired");
    db.exec("UPDATE subscription_confirmation_queue SET created_at='2000-01-01T00:00:00.000Z' WHERE checkout_session_id='cs_expired'");
    assert.deepEqual(outbox.prune(), { confirmations: 1, contracts: 1 });
    assert.equal(db.prepare("SELECT body FROM notes").get().body, "Keep my study work");
    db.exec("DELETE FROM notes WHERE user_id='fixture-owner'; DELETE FROM users WHERE id='fixture-owner'");
    assert.equal(db.prepare("SELECT count(*) AS n FROM billing_checkout_contracts").get().n, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM subscription_confirmation_queue").get().n, 0);
  } finally { db.close(); }
});
