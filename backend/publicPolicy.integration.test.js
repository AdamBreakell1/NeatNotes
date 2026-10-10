"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { DatabaseSync } = require("node:sqlite");
const { createApplication } = require("../server");

test("public policies are complete, printable without JavaScript and expose only public configuration", async () => {
  const db = new DatabaseSync(":memory:");
  const application = createApplication({ db, staticAssets: false, runtime: { scheduleCleanup: false },
    environment: { NODE_ENV: "production", BASE_URL: "https://fixture.example.test", CONTACT_RETRY_INTERVAL_MS: "0",
      POLICY_OPERATOR_NAME: "Fixture Operator", POLICY_POSTAL_ADDRESS: "1 Example Street, Leeds, LS1 1AA",
      POLICY_SUPPORT_EMAIL: "support@example.test", SMTP_PASS: "synthetic-private-credential" },
  });
  const server = application.app.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const configResponse = await fetch(base + "/api/public-config");
    const config = await configResponse.json();
    assert.equal(config.policies.configured, true);
    assert.equal(config.policies.website, "https://fixture.example.test");
    assert.equal(JSON.stringify(config).includes("synthetic-private"), false);
    assert.equal(configResponse.headers.get("cache-control"), "no-store");
    assert.equal((await fetch(base + "/api/session")).status, 401);
    const publicSession = await fetch(base + "/api/session?optional=1");
    assert.equal(publicSession.status, 200);
    assert.deepEqual(await publicSession.json(), { user: null });
    for (const page of ["privacy", "terms", "cookies", "billing", "data-protection"]) {
      const response = await fetch(`${base}/api/policies/${page}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      const html = await response.text();
      assert.match(html, /<!doctype html>/);
      assert.match(html, /Fixture Operator trading as BreakellSystems/);
      assert.match(html, /1 Example Street, Leeds, LS1 1AA/);
      assert.match(html, /support@example\.test/);
      assert.match(html, /@media print/);
      assert.doesNotMatch(html, /<script|Local policy draft|awaiting approval|synthetic-private/);
    }
    assert.equal((await fetch(base + "/api/policies/unknown")).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});

test("a missing operator postal address cannot be silently published", async () => {
  const db = new DatabaseSync(":memory:");
  const application = createApplication({ db, staticAssets: false, runtime: { scheduleCleanup: false },
    environment: { CONTACT_RETRY_INTERVAL_MS: "0", POLICY_OPERATOR_NAME: "Fixture Operator" },
  });
  const server = application.app.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/policies/terms`);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /Fixture Operator/);
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
