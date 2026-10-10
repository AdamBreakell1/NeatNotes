"use strict";

const crypto = require("node:crypto");
const policies = require("../../policy-content");
const { BILLING } = require("../../product-config");
const RETRY_MS = 10 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;
const DELIVERY_CODES = new Set(["EAUTH", "ESOCKET", "ECONNECTION", "ETIMEDOUT", "EDNS", "EMESSAGE", "EENVELOPE", "ERECIPIENT", "ESMTP", "AUTH_EMAIL_UNAVAILABLE"]);
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function createCheckoutContract(config, acceptedAt = new Date().toISOString()) {
  if (!config?.configured) throw new Error("The public operator identity, postal address and support email must be configured before selling a subscription.");
  const documents = policies.create(config);
  if (!documents.isConfigured() || documents.version !== config.version) throw new Error("The published subscription policy version is not available.");
  const contract = { policyVersion: documents.version, acceptedAt, adultPermissionConfirmed: true,
    operatorName: config.operatorName, tradingName: config.tradingName, postalAddress: config.postalAddress,
    supportEmail: config.supportEmail, website: config.website, planName: "Student Pro",
    currency: BILLING.currency, monthlyPence: BILLING.monthlyPence, interval: "month",
    termsHtml: documents.renderDocument("terms"), billingHtml: documents.renderDocument("billing") };
  return Object.freeze({ ...contract, sha256: hash(contract) });
}

function amount(value, currency) {
  if (!Number.isSafeInteger(value) || value < 0 || !/^[a-z]{3}$/.test(currency || "")) return null;
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(value / 100); }
  catch { return null; }
}

function confirmationEmail({ user, session, contract, currentConfig, currentPeriodEnd }) {
  const details = contract || currentConfig;
  const website = new URL(details.website).origin;
  const support = details.supportEmail;
  const paid = amount(session.amount_total, session.currency);
  const monthly = contract ? `${amount(contract.monthlyPence, contract.currency)} per month` : "The amount and billing interval shown in your Stripe subscription";
  const title = contract ? "Your Student Pro subscription is confirmed" : "Your RecallStride subscription is confirmed";
  const nextDate = currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }) : null;
  const lines = ["RecallStride", "", title, "", `Hi ${user.name || "there"},`, "",
    `Purchase reference: ${session.id}`, `Subscription: ${contract?.planName || "Your existing RecallStride plan"}`,
    `Recurring price: ${monthly}.`, ...(paid ? [`Paid at Checkout: ${paid}. Keep your Stripe receipt for the payment breakdown.`] : []),
    ...(nextDate ? [`Current paid period ends: ${nextDate}. Check Stripe Billing for its current renewal or cancellation status.`] : []),
    "", "Your subscription renews automatically until cancelled. Cancel future renewal from the account menu → Billing → Stripe's subscription management page, or contact support. Cancellation normally takes effect at the end of the current paid period; access continues until then. There is no annual commitment for this monthly Student Pro purchase.",
    "", "You may cancel and receive a full refund within 14 days of the first payment or any renewal payment, including when you have used the service. We do not ask you to waive this refund promise for immediate access. Request cancellation and a refund through Contact or the support email below. Eligible refunds return to the original payment method within 14 days of the request; your bank may take additional time. Statutory consumer rights remain unchanged.",
    "", ...(contract ? [`Policy version: ${contract.policyVersion}. Acceptance recorded: ${contract.acceptedAt}.`,
      "The attached Terms and Cancellation and Billing documents are the immutable copies supplied for this Checkout. Save them with this confirmation and your Stripe receipts."]
      : ["This older Checkout has no recorded policy snapshot or acceptance version. This message confirms the subscription without inventing an acceptance record. Your original amount and billing interval remain those in Stripe Billing; contact support for help obtaining any historical contract copy."]),
    "", `Manage your account: ${website}/?billing=manage`, `Support and cancellation: ${support}`,
    `Operator: ${details.operatorName || "RecallStride operator"}${details.tradingName ? ` trading as ${details.tradingName}` : ""}`,
    ...(details.postalAddress ? [`Postal address: ${details.postalAddress}`] : []), "",
    "Free account access and your personal notes remain available after Pro ends. Never send a password or full card number to support.", "", "RecallStride · A BreakellSystems product"];
  if (!contract) {
    // Legacy subscriptions can be annual or retired plans. Do not manufacture
    // monthly-price or no-annual-commitment terms for those purchases.
    lines[lines.indexOf("Your subscription renews automatically until cancelled. Cancel future renewal from the account menu → Billing → Stripe's subscription management page, or contact support. Cancellation normally takes effect at the end of the current paid period; access continues until then. There is no annual commitment for this monthly Student Pro purchase.")] = "Manage cancellation and future renewal through the account menu → Billing → Stripe's subscription management page, or contact support. The billing interval and paid-period end shown there govern your existing subscription.";
  }
  const text = lines.join("\n");
  const paragraphs = text.split("\n\n").slice(2).map(part => `<p style="margin:0 0 18px;font-size:15px;line-height:24px;">${escape(part).replaceAll("\n", "<br>")}</p>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head><body style="margin:0;padding:0;background:#f5f7fa;color:#192b43;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #d8e0dd;border-radius:16px"><tr><td style="padding:28px;border-bottom:1px solid #d8e0dd;color:#236a5e;font-size:24px;font-weight:bold">RecallStride</td></tr><tr><td style="padding:28px"><h1 style="margin:0 0 24px;font-size:27px;line-height:35px">${escape(title)}</h1>${paragraphs}<p><a href="${escape(website)}/?billing=manage" style="display:inline-block;background:#236a5e;color:#ffffff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Open RecallStride</a></p><p style="font-size:14px;line-height:22px">Questions or cancellation? <a href="mailto:${escape(support)}" style="color:#236a5e">${escape(support)}</a></p></td></tr></table></td></tr></table></body></html>`;
  const attachments = [{ filename: "RecallStride-subscription-confirmation.txt", content: text, contentType: "text/plain; charset=utf-8" }];
  if (contract) attachments.push(
    { filename: `RecallStride-Terms-${contract.policyVersion}.html`, content: contract.termsHtml, contentType: "text/html; charset=utf-8" },
    { filename: `RecallStride-Cancellation-and-Billing-${contract.policyVersion}.html`, content: contract.billingHtml, contentType: "text/html; charset=utf-8" });
  return { to: user.email, replyTo: support, subject: title, text, html, attachments,
    messageId: `<recallstride-subscription-${crypto.createHash("sha256").update(session.id).digest("hex")}@${new URL(website).hostname}>` };
}

function createSubscriptionConfirmations({ db, sendMessage, configurationError = () => "", now = () => Date.now() }) {
  db.exec(`CREATE TABLE IF NOT EXISTS billing_checkout_contracts (
    checkout_session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_json TEXT NOT NULL, created_at TEXT NOT NULL
  ); CREATE TABLE IF NOT EXISTS subscription_confirmation_queue (
    checkout_session_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload_json TEXT NOT NULL, snapshot_available INTEGER NOT NULL, status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, lease_token TEXT, lease_until TEXT,
    last_error_code TEXT, delivered_at TEXT, created_at TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS subscription_confirmation_due_idx ON subscription_confirmation_queue(status,next_attempt_at);
  CREATE INDEX IF NOT EXISTS billing_contract_owner_idx ON billing_checkout_contracts(user_id,created_at);
  CREATE INDEX IF NOT EXISTS subscription_confirmation_owner_idx ON subscription_confirmation_queue(user_id,created_at);`);
  let inProgress = false;
  const storedContract = (sessionId) => {
    const record = db.prepare("SELECT user_id,contract_json FROM billing_checkout_contracts WHERE checkout_session_id=?").get(sessionId);
    return record ? { userId: record.user_id, contract: JSON.parse(record.contract_json) } : null;
  };
  return {
    recordCheckout(sessionId, userId, contract) {
      if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) throw new Error("Stripe must return a Checkout session reference.");
      db.prepare("INSERT INTO billing_checkout_contracts(checkout_session_id,user_id,contract_json,created_at) VALUES(?,?,?,?) ON CONFLICT(checkout_session_id) DO NOTHING")
        .run(sessionId, userId, JSON.stringify(contract), contract.acceptedAt);
      const stored = storedContract(sessionId);
      if (stored.userId !== userId || stored.contract.sha256 !== contract.sha256) throw new Error("Checkout contract identity cannot be changed.");
    },
    contract: storedContract,
    completed: (sessionId) => Boolean(db.prepare("SELECT 1 FROM subscription_confirmation_queue WHERE checkout_session_id=?").get(sessionId)),
    enqueue({ user, session, currentConfig, currentPeriodEnd }) {
      const stored = storedContract(session.id);
      if (stored && stored.userId !== user.id) throw new Error("Checkout contract belongs to a different account.");
      const payload = confirmationEmail({ user, session, contract: stored?.contract, currentConfig, currentPeriodEnd });
      const date = new Date(now()).toISOString();
      db.prepare("INSERT INTO subscription_confirmation_queue(checkout_session_id,user_id,payload_json,snapshot_available,status,next_attempt_at,created_at) VALUES(?,?,?,?, 'queued',?,?) ON CONFLICT(checkout_session_id) DO NOTHING")
        .run(session.id, user.id, JSON.stringify(payload), stored ? 1 : 0, date, date);
    },
    export(userId) {
      return { checkoutContracts: db.prepare("SELECT checkout_session_id,contract_json,created_at FROM billing_checkout_contracts WHERE user_id=? ORDER BY created_at").all(userId)
        .map(row => ({ checkoutSessionId: row.checkout_session_id, contract: JSON.parse(row.contract_json), createdAt: row.created_at })),
      confirmations: db.prepare("SELECT checkout_session_id,snapshot_available,status,attempts,created_at,delivered_at FROM subscription_confirmation_queue WHERE user_id=? ORDER BY created_at").all(userId) };
    },
    prune() {
      const cutoff = new Date(now());
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 7);
      return db.transactionSync(() => ({
        confirmations: Number(db.prepare("DELETE FROM subscription_confirmation_queue WHERE created_at<?").run(cutoff.toISOString()).changes),
        contracts: Number(db.prepare("DELETE FROM billing_checkout_contracts WHERE created_at<?").run(cutoff.toISOString()).changes),
      }));
    },
    async retry(limit = 10) {
      if (inProgress || configurationError()) return;
      inProgress = true;
      try {
        const date = new Date(now()).toISOString();
        const pending = db.prepare("SELECT checkout_session_id FROM subscription_confirmation_queue WHERE (status IN ('queued','delivery_failed') AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?) ORDER BY created_at LIMIT ?").all(date, date, limit);
        for (const row of pending) {
          const lease = crypto.randomUUID();
          const claimed = db.transactionSync(() => {
            const updated = db.prepare("UPDATE subscription_confirmation_queue SET status='sending',attempts=attempts+1,lease_token=?,lease_until=? WHERE checkout_session_id=? AND ((status IN ('queued','delivery_failed') AND next_attempt_at<=?) OR (status='sending' AND lease_until<=?))")
              .run(lease, new Date(now() + LEASE_MS).toISOString(), row.checkout_session_id, date, date);
            return updated.changes ? db.prepare("SELECT payload_json FROM subscription_confirmation_queue WHERE checkout_session_id=?").get(row.checkout_session_id) : null;
          });
          if (!claimed) continue;
          try {
            await sendMessage(JSON.parse(claimed.payload_json));
            db.prepare("UPDATE subscription_confirmation_queue SET status='delivered',delivered_at=?,last_error_code=NULL,lease_token=NULL,lease_until=NULL WHERE checkout_session_id=? AND lease_token=?")
              .run(new Date(now()).toISOString(), row.checkout_session_id, lease);
          } catch (error) {
            const suppliedCode = error?.cause?.code || error?.code;
            const code = DELIVERY_CODES.has(suppliedCode) ? suppliedCode : "EMAIL_DELIVERY_FAILED";
            db.prepare("UPDATE subscription_confirmation_queue SET status='delivery_failed',next_attempt_at=?,last_error_code=?,lease_token=NULL,lease_until=NULL WHERE checkout_session_id=? AND lease_token=?")
              .run(new Date(now() + RETRY_MS).toISOString(), code, row.checkout_session_id, lease);
          }
        }
      } finally { inProgress = false; }
    },
  };
}

module.exports = { RETRY_MS, createCheckoutContract, confirmationEmail, createSubscriptionConfirmations };
