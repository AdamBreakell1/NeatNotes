"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const policies = require("../../policy-content");

const fixture = Object.freeze({
  operatorName: "Fixture Operator",
  tradingName: "Fixture Learning",
  postalAddress: "1 Example Street\nExample Town EX1 1AA\nUnited Kingdom",
  supportEmail: "support@example.test",
  website: "https://study.example.test",
});

test("every customer policy contains the configured operator, date and substantive service rules", () => {
  const api = policies.create(fixture);
  assert.equal(api.isConfigured(), true);
  assert.deepEqual(api.pages, ["privacy", "terms", "cookies", "billing", "data-protection"]);
  for (const page of api.pages) {
    const content = api.get(page);
    assert.equal(content.version, "2026-10-10");
    assert.match(content.html, /Effective 10 October 2026/);
    assert.match(content.html, /support@example\.test/);
    assert.doesNotMatch(content.html, /Local policy draft|require review before publication|under review|awaiting approval|must be confirmed|remain to be approved/);
    assert.ok(content.html.length > 1500, `${page} must have actual policy content`);
  }
  for (const page of api.pages) {
    assert.match(api.get(page).html, /Fixture Operator trading as Fixture Learning/);
    assert.match(api.get(page).html, /1 Example Street<br>Example Town EX1 1AA<br>United Kingdom/);
  }
  const privacy = api.get("privacy").html;
  for (const provision of [/legitimate interests/, /your consent/, /performing the subscription contract/, /legal obligations/, /Cloudflare/, /Gmail/, /Stripe/, /outside the UK/, /30 days/, /90 days/, /365 days/, /7 years/, /one month/, /object to our use/, /Commissioner/, /aged 16 and over/, /not claim to independently verify/]) {
    assert.match(privacy, provision);
  }
  assert.match(privacy, /account deletions must be reapplied/);
  assert.match(privacy, /removes stored optional account events/);
});

test("billing and terms preserve the full refund window and an accessible cancellation method", () => {
  const api = policies.create(fixture);
  for (const page of ["billing", "terms"]) {
    const html = api.get(page).html;
    assert.match(html, /£3\.99 per month/);
    assert.match(html, /14 days of your first payment or any renewal payment/);
    assert.match(html, /including when you have used the service/);
    assert.match(html, /do not ask you to waive/);
    assert.match(html, /within 14 days of receiving your request/);
    assert.match(html, /failed sign-in or unavailable portal does not prevent/);
    assert.match(html, /statutory rights/);
  }
  const billing = api.get("billing").html;
  assert.match(billing, /Optional cancellation form/);
  assert.match(billing, /I give notice that I cancel/);
  assert.match(billing, /Name:<br>Address/);
  assert.match(billing, /Signature \(only for a paper notice\)/);
});

test("provider state and documented retention follow configuration without leaking between instances", () => {
  const a = policies.create({ ...fixture, googleSignInEnabled: true, retention: { analyticsDays: 12, auditDays: 42, supportDays: 180, billingYears: 8, backupDays: 21 } });
  const b = policies.create(fixture);
  assert.match(a.get("privacy").html, /Google supplies your account identifier/);
  assert.doesNotMatch(a.get("privacy").html, /Google sign-in is not currently offered/);
  assert.match(b.get("privacy").html, /Google sign-in is not currently offered/);
  for (const duration of ["12 days", "42 days", "180 days", "8 years", "21 days"]) assert.ok(a.get("privacy").html.includes(duration));
  assert.match(b.get("privacy").html, /30 days/);
  assert.match(b.get("privacy").html, /365 days/);
  assert.equal(policies.create({ ...fixture, postalAddress: "" }).isConfigured(), false);
});

test("policy configuration and saveable documents escape HTML and reject unsafe destinations", () => {
  const api = policies.create({ ...fixture, operatorName: '<script>alert("name")</script>', postalAddress: 'A & B\n<img src=x onerror=alert(1)>', companyNumber: '<b>123</b>' });
  const html = api.get("privacy").html;
  assert.match(html, /&lt;script&gt;alert\(&quot;name&quot;\)&lt;\/script&gt;/);
  assert.match(html, /A &amp; B<br>&lt;img/);
  assert.doesNotMatch(html, /<script|<img|<b>123/);
  assert.throws(() => policies.create({ ...fixture, supportEmail: 'x" onclick="alert(1)@example.test' }), /valid public support email/);
  assert.throws(() => policies.create({ ...fixture, website: "javascript:alert(1)" }), /HTTP or HTTPS/);
  assert.throws(() => policies.create({ ...fixture, website: "https://password:secret@example.test" }), /HTTP or HTTPS/);
  assert.throws(() => policies.create({ ...fixture, postalAddress: "" }).renderDocument("billing"), /public postal address/);
  const document = api.renderDocument("billing");
  assert.match(document, /^<!doctype html><html lang="en">/);
  assert.match(document, /<h1>Cancellation and Billing<\/h1>/);
  assert.match(document, /@media print/);
  assert.match(document, /https:\/\/study\.example\.test/);
  assert.doesNotMatch(document, /<script|<img|<iframe/);
});

test("browser bootstrap and legacy get(page) fallback remain usable after server configuration", () => {
  const context = { RECALLSTRIDE_POLICY_CONFIG: fixture, URL };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve("../../policy-content"), "utf8"), context);
  assert.equal(context.RecallPolicies.isConfigured(), true);
  for (const key of ["unknown", "__proto__", "constructor", undefined]) {
    assert.equal(context.RecallPolicies.get(key).title, "Privacy Policy");
  }
  assert.equal(context.RecallPolicies.configure({ ...fixture, operatorName: "Second Operator" }), true);
  assert.match(context.RecallPolicies.get("privacy").html, /Second Operator/);
  assert.doesNotMatch(context.RecallPolicies.get("privacy").html, /Fixture Operator/);
});
