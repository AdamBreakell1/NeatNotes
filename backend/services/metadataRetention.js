"use strict";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION = Object.freeze({
  cleanupIntervalMs: DAY_MS,
  usageAnalyticsDays: 30,
  codingMetadataDays: 30,
  securityAuditDays: 90,
  supportDays: 365,
  billingMetadataYears: 7,
});
const MAINTENANCE_KEY = "metadata_retention_last_run";

// These are purpose-limited operational records. Accounts, notes, learning
// evidence and provider-side invoices are never targets of this maintenance.
function createMetadataRetention(db, now = () => Date.now()) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS audit_logs_retention_idx ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS product_events_retention_idx ON product_events(created_at);
    CREATE INDEX IF NOT EXISTS contact_enquiries_retention_idx ON contact_enquiries(created_at);
    CREATE INDEX IF NOT EXISTS billing_events_retention_idx ON billing_events(created_at);
    CREATE INDEX IF NOT EXISTS stripe_events_retention_idx ON stripe_events(processed_at);
    CREATE INDEX IF NOT EXISTS auth_continuations_retention_idx ON auth_continuations(expires_at);
  `);

  function prune({ force = false } = {}) {
    const timestamp = now();
    const previous = db.prepare("SELECT value FROM runtime_metadata WHERE key = ?").get(MAINTENANCE_KEY);
    if (!force && previous && timestamp - Number(previous.value) < DAY_MS) return { skipped: true };
    const expiry = new Date(timestamp).toISOString();
    const daysAgo = (days) => new Date(timestamp - days * DAY_MS).toISOString();
    const billingExpiry = new Date(timestamp);
    billingExpiry.setUTCFullYear(billingExpiry.getUTCFullYear() - RETENTION.billingMetadataYears);
    return db.transactionSync(() => {
      const counts = {};
      const remove = (key, sql, value) => { counts[key] = Number(db.prepare(sql).run(value).changes); };
      remove("sessions", "DELETE FROM sessions WHERE expires_at <= ?", expiry);
      remove("verificationTokens", "DELETE FROM email_verification_tokens WHERE used_at IS NOT NULL OR expires_at <= ?", expiry);
      remove("passwordResetTokens", "DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL OR expires_at <= ?", expiry);
      remove("authContinuations", "DELETE FROM auth_continuations WHERE expires_at <= ?", expiry);
      remove("rateLimits", "DELETE FROM request_rate_limits WHERE reset_at <= ?", timestamp);
      remove("usageAnalytics", "DELETE FROM product_events WHERE created_at < ?", daysAgo(RETENTION.usageAnalyticsDays));
      remove("pilotEvents", "DELETE FROM pilot_events WHERE created_at < ?", daysAgo(RETENTION.usageAnalyticsDays));
      remove("codingMetadata", "DELETE FROM coding_practice_attempts WHERE created_at < ?", daysAgo(RETENTION.codingMetadataDays));
      remove("securityAudit", "DELETE FROM audit_logs WHERE created_at < ?", daysAgo(RETENTION.securityAuditDays));
      remove("support", "DELETE FROM contact_enquiries WHERE created_at < ?", daysAgo(RETENTION.supportDays));
      remove("billingMetadata", "DELETE FROM billing_events WHERE created_at < ?", billingExpiry.toISOString());
      remove("stripeEventReceipts", "DELETE FROM stripe_events WHERE processed_at < ?", billingExpiry.toISOString());
      db.prepare("INSERT INTO runtime_metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
        .run(MAINTENANCE_KEY, String(timestamp));
      return { skipped: false, counts };
    });
  }

  return { prune, retention: RETENTION };
}

module.exports = { createMetadataRetention, RETENTION, MAINTENANCE_KEY };
