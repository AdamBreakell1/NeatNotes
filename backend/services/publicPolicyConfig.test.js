"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { publicPolicyConfig } = require("./publicPolicyConfig");

test("public policy configuration exposes only the intended identity and origin", () => {
  const config = publicPolicyConfig({
    BASE_URL: "https://example.test/", POLICY_OPERATOR_NAME: " Example Operator ",
    POLICY_POSTAL_ADDRESS: " 1 Example Street, Leeds, LS1 1AA ",
    POLICY_SUPPORT_EMAIL: "help@example.test", STRIPE_SECRET_KEY: "private", SMTP_PASS: "private",
  });
  assert.equal(config.configured, true);
  assert.equal(config.operatorName, "Example Operator");
  assert.equal(config.website, "https://example.test");
  assert.deepEqual(Object.keys(config).sort(), ["configured", "emailDeliveryProvider", "googleSignInEnabled", "operatorName", "postalAddress", "supportEmail", "tradingName", "version", "website"].sort());
  assert.equal(JSON.stringify(config).includes("private"), false);
});

test("a missing postal address cannot produce a publishable policy", () => {
  assert.equal(publicPolicyConfig({ POLICY_OPERATOR_NAME: "Example Operator" }).configured, false);
});

test("the public email provider follows the actual configured transport without exposing credentials", () => {
  assert.equal(publicPolicyConfig({ SMTP_HOST: "smtp.resend.com", SMTP_PASS: "private" }).emailDeliveryProvider, "resend");
  assert.equal(publicPolicyConfig({ SMTP_USER: "resend" }).emailDeliveryProvider, "resend");
  assert.equal(publicPolicyConfig({ SMTP_HOST: "smtp.gmail.com" }).emailDeliveryProvider, "gmail");
});
