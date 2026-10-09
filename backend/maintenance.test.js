"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { once } = require("node:events");
const { DatabaseSync } = require("node:sqlite");
const { createApplication } = require("../server");

test("migration maintenance freezes API callbacks and background email writes while retaining health", async () => {
  const db = new DatabaseSync(":memory:");
  let delivered = 0;
  const application = createApplication({ db, staticAssets: false,
    environment: { NODE_ENV: "production", MIGRATION_MODE: "true", BASE_URL: "http://127.0.0.1", CONTACT_RETRY_INTERVAL_MS: "600000" },
    runtime: { scheduleCleanup: false, mailConfigurationError: () => "", createMailTransport: () => ({ sendMail: async () => { delivered++; } }) },
  });
  db.prepare("INSERT INTO contact_enquiries(id,name,email,reason,message,status,created_at,updated_at) VALUES(?,?,?,?,?,'queued',?,?)")
    .run("fixture", "Fixture", "fixture@example.test", "Fixture", "Private fixture enquiry", "2026-10-09T00:00:00Z", "2026-10-09T00:00:00Z");
  const server = application.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    for (const [method, endpoint] of [["GET", "/api/auth/verify?token=fixture"], ["POST", "/api/auth/signup"], ["POST", "/api/contact"], ["POST", "/api/billing/stripe/webhook"], ["GET", "/api/session"]]) {
      const response = await fetch(base + endpoint, { method });
      assert.equal(response.status, 503, `${method} ${endpoint}`);
      assert.equal(response.headers.get("Retry-After"), "60");
    }
    await application.retryQueuedContactEnquiries();
    assert.equal(delivered, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM users").get().n, 0);
    assert.equal(db.prepare("SELECT status FROM contact_enquiries WHERE id='fixture'").get().status, "queued");
    assert.equal(application.configuration.contactRetryIntervalMs, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM flashcard_decks").get().n, 0, "Maintenance must not reseed a partially imported catalogue.");
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});

test("the retired source redirects existing verification links to the new origin without accepting writes", async () => {
  const db = new DatabaseSync(":memory:");
  const { app } = createApplication({ db, staticAssets: false,
    environment: { NODE_ENV: "production", MIGRATION_MODE: "true", BASE_URL: "https://old.example.test", MIGRATION_REDIRECT_URL: "https://new.example.test" },
    runtime: { scheduleCleanup: false },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const link = await fetch(`${base}/api/auth/verify?token=fixture`, { redirect: "manual" });
    assert.equal(link.status, 307);
    assert.equal(link.headers.get("Location"), "https://new.example.test/api/auth/verify?token=fixture");
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/contact`, { method: "POST" })).status, 503);
    assert.equal(db.prepare("SELECT count(*) AS n FROM contact_enquiries").get().n, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
