"use strict";

const { POLICY_VERSION } = require("./launchPolicy");

// Only these deliberately public fields may cross the server/browser boundary.
function publicPolicyConfig(environment = {}, { googleSignInEnabled = false } = {}) {
  const origin = new URL(environment.BASE_URL || `http://localhost:${environment.PORT || 4173}`).origin;
  const config = {
    version: POLICY_VERSION,
    operatorName: String(environment.POLICY_OPERATOR_NAME || "").trim(),
    tradingName: "BreakellSystems",
    postalAddress: String(environment.POLICY_POSTAL_ADDRESS || "").trim(),
    supportEmail: String(environment.POLICY_SUPPORT_EMAIL || environment.CONTACT_TO || "neatnotescontact@gmail.com").trim(),
    website: origin,
    googleSignInEnabled: googleSignInEnabled === true,
    emailDeliveryProvider: String(environment.SMTP_HOST || "").toLowerCase().includes("resend") || environment.SMTP_USER === "resend" ? "resend" : "gmail",
  };
  config.configured = Boolean(config.operatorName && config.postalAddress && config.supportEmail);
  return config;
}

module.exports = { publicPolicyConfig };
