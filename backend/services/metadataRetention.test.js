"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { createApplication } = require("../../server");
const { createMetadataRetention, MAINTENANCE_KEY } = require("./metadataRetention");

const now = Date.parse("2026-10-10T12:00:00.000Z");
const ago = (days) => new Date(now - days * 86400000).toISOString();
function fixture(maintenanceMode = false) {
  const db = new DatabaseSync(":memory:");
  const application = createApplication({ db, staticAssets: false,
    environment: { NODE_ENV: "development", CONTACT_RETRY_INTERVAL_MS: "0", MIGRATION_MODE: String(maintenanceMode) },
    runtime: { scheduleCleanup: false },
  });
  db.prepare("INSERT INTO users(id,email,name,created_at,updated_at) VALUES(?,?,?,?,?)").run("owner", "owner@fixture.test", "Synthetic owner", ago(3000), ago(3000));
  db.prepare("INSERT INTO workspaces(id,name,owner_id,created_at,updated_at) VALUES(?,?,?,?,?)").run("workspace", "Synthetic notes", "owner", ago(3000), ago(3000));
  db.prepare("INSERT INTO notes(id,workspace_id,owner_id,body,tag,title,summary,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
    .run("note", "workspace", "owner", "Keep this old personal work", "", "Retained note", "", ago(3000), ago(3000));
  return { db, application };
}

test("daily retention removes only expired metadata and preserves boundary records, accounts and notes", () => {
  const { db } = fixture();
  try {
    for (const [id, expiresAt] of [["expired", new Date(now).toISOString()], ["active", ago(-1)]]) {
      db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run(id, "owner", expiresAt, ago(10));
      for (const table of ["email_verification_tokens", "password_reset_tokens"]) {
        db.prepare(`INSERT INTO ${table}(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)`).run(id, "owner", expiresAt, ago(10));
      }
    }
    db.prepare("INSERT INTO email_verification_tokens(token_hash,user_id,expires_at,used_at,created_at) VALUES(?,?,?,?,?)")
      .run("used", "owner", ago(-1), ago(0), ago(1));
    db.prepare("INSERT INTO auth_continuations(user_id,task_json,expires_at) VALUES(?,?,?)").run("owner", "{}", ago(0));
    db.prepare("INSERT INTO request_rate_limits(key,count,reset_at) VALUES(?,?,?)").run("expired", 1, now);
    db.prepare("INSERT INTO request_rate_limits(key,count,reset_at) VALUES(?,?,?)").run("active", 1, now + 1000);
    for (const [id, days] of [["old", 31], ["boundary", 30]]) {
      db.prepare("INSERT INTO product_events(id,user_id,event_name,metadata,created_at) VALUES(?,?,?,?,?)").run(id, "owner", "note_created", "{}", ago(days));
      db.prepare("INSERT INTO pilot_events(id,user_id,event_name,session_id,mode,created_at) VALUES(?,?,?,?,?,?)").run(id, "owner", "coding_run", "synthetic-session", "learn", ago(days));
      db.prepare("INSERT INTO coding_practice_attempts(user_id,attempt_id,request_hash,record_json,created_at) VALUES(?,?,?,?,?)").run("owner", id, "fixture", "{}", ago(days));
    }
    for (const [id, days] of [["old", 91], ["boundary", 90]]) {
      db.prepare("INSERT INTO audit_logs(id,user_id,action,created_at) VALUES(?,?,?,?)").run(id, "owner", "fixture", ago(days));
    }
    for (const status of ["queued", "delivery_failed", "sent"]) {
      for (const [id, days] of [["old", 366], ["boundary", 365]]) {
        db.prepare("INSERT INTO contact_enquiries(id,name,email,reason,message,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
          .run(`${status}-${id}`, "Synthetic owner", "owner@fixture.test", "Refund", "Synthetic request", status, ago(days), ago(days));
      }
    }
    for (const [id, date] of [["old", "2019-10-10T11:59:59.999Z"], ["boundary", "2019-10-10T12:00:00.000Z"]]) {
      db.prepare("INSERT INTO billing_events(id,user_id,plan,provider,status,created_at) VALUES(?,?,?,?,?,?)").run(id, "owner", "pro", "stripe", "fixture", date);
      db.prepare("INSERT INTO stripe_events(id,type,processed_at) VALUES(?,?,?)").run(id, "fixture", date);
    }
    const result = createMetadataRetention(db, () => now).prune({ force: true });
    assert.deepEqual(result.counts, { sessions: 1, verificationTokens: 2, passwordResetTokens: 1, authContinuations: 1, rateLimits: 1,
      usageAnalytics: 1, pilotEvents: 1, codingMetadata: 1, securityAudit: 1, support: 3, billingMetadata: 1, stripeEventReceipts: 1 });
    for (const table of ["sessions", "email_verification_tokens", "password_reset_tokens", "request_rate_limits", "product_events", "pilot_events", "coding_practice_attempts", "audit_logs", "billing_events", "stripe_events", "users", "notes"]) {
      assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 1, table);
    }
    assert.equal(db.prepare("SELECT body FROM notes").get().body, "Keep this old personal work");
    assert.equal(db.prepare("SELECT count(*) AS n FROM contact_enquiries").get().n, 3);
  } finally { db.close(); }
});

test("daily maintenance survives process restarts, skips repeat runs and runs again after 24 hours", () => {
  const { db } = fixture();
  let time = now;
  try {
    const first = createMetadataRetention(db, () => time);
    assert.equal(first.prune({ force: true }).skipped, false);
    db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run("expired", "owner", ago(1), ago(10));
    const restarted = createMetadataRetention(db, () => time);
    assert.equal(restarted.prune().skipped, true);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
    time += 86400000;
    assert.equal(restarted.prune().counts.sessions, 1);
    assert.equal(db.prepare("SELECT value FROM runtime_metadata WHERE key=?").get(MAINTENANCE_KEY).value, String(time));
  } finally { db.close(); }
});

test("a maintenance failure rolls back earlier deletions and leaves the job retryable", () => {
  const { db } = fixture();
  try {
    const previous = db.prepare("SELECT value FROM runtime_metadata WHERE key=?").get(MAINTENANCE_KEY).value;
    db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run("expired", "owner", ago(1), ago(10));
    db.prepare("INSERT INTO product_events(id,user_id,event_name,created_at) VALUES(?,?,?,?)").run("old", "owner", "fixture", ago(31));
    db.exec("CREATE TRIGGER reject_maintenance BEFORE DELETE ON product_events BEGIN SELECT RAISE(ABORT, 'Synthetic interrupted cleanup'); END;");
    assert.throws(() => createMetadataRetention(db, () => now).prune({ force: true }), /Synthetic interrupted cleanup/);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
    assert.equal(db.prepare("SELECT value FROM runtime_metadata WHERE key=?").get(MAINTENANCE_KEY).value, previous);
    db.exec("DROP TRIGGER reject_maintenance");
    assert.equal(createMetadataRetention(db, () => now).prune({ force: true }).counts.sessions, 1);
  } finally { db.close(); }
});

test("migration maintenance refuses forced metadata cleanup and disables its background interval", () => {
  const { db, application } = fixture(true);
  try {
    db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run("expired", "owner", ago(1), ago(10));
    assert.deepEqual(application.runDailyMaintenance({ force: true }), { skipped: true, maintenanceMode: true });
    assert.equal(application.configuration.maintenanceIntervalMs, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM sessions").get().n, 1);
  } finally { db.close(); }
});
