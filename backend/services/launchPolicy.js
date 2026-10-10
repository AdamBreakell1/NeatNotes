"use strict";

const POLICY_VERSION = "2026-10-10";

function policyConsentError(body, context) {
  if (body?.termsAccepted !== true || (context === "signup" ? body.ageConfirmed !== true : body.adultPermissionConfirmed !== true)) {
    return {
      code: "POLICY_CONSENT_REQUIRED",
      error: context === "signup"
        ? "Confirm that you are 16 or over and agree to the Terms before creating an account."
        : "Agree to the subscription terms and confirm that you are 18 or over, or have a parent or guardian's permission to purchase Pro.",
    };
  }
  if (body.policyVersion !== POLICY_VERSION) {
    return { code: "POLICY_VERSION_OUTDATED", error: "The RecallStride policies have changed. Reload the page, review the current terms and try again." };
  }
  return null;
}

module.exports = { POLICY_VERSION, policyConsentError };
