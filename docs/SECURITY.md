# Security Notes

## Protected invariants

- Authentication identities are not linked merely because an unverified local row shares an email address.
- Paid features require an active or trialing subscription mapped from a configured Stripe Price ID.
- Free accounts can access only their selected free OCR deck; protected card content is filtered server-side.
- Workspace, note, class and learning records remain scoped to authenticated membership and current entitlement.
- Protected API responses and revision-topic payloads are not cached by the service worker.

## Implemented controls

- Scrypt password hashing, 128-character password ceiling and hashed random session tokens.
- HttpOnly, SameSite and production Secure cookies.
- Email verification with one active token per account.
- OAuth state checking and verified-email enforcement.
- Exact-origin CORS plus same-origin mutation validation.
- CSP, HSTS in production, frame, MIME, referrer and permissions headers.
- Route-specific throttles for auth, contact, billing, joins and revision evidence.
- Stripe signature validation, event ID deduplication and current-subscription reconciliation.
- Note body, version and learning-history retention limits.
- Password reset tokens, account export/deletion and revocation of other sessions.
- Human-readable high-entropy class codes, code regeneration/disable controls and join throttling.
- Consent-gated, allow-listed analytics events with bounded per-user retention.

## Relaunch security review

The 24 August 2026 working-tree diff review identified seven issues in its captured pre-remediation snapshot: reset-token URL exposure, collaboration-suspended export access, missing recent authentication for OAuth account deletion, a password-reset response discrepancy, unbounded exam/lab attempt retention and archived assignment mutation. All seven were remediated before the release commit. The integration suite now covers the free entitlement boundary and archived-assignment workflow; browser QA confirms reset queries are removed immediately. This internal review does not replace independent penetration testing.

## Required before national scale

Move rate limits and jobs to shared infrastructure, deploy managed PostgreSQL with point-in-time recovery, add centralised redacted logging and alerting, commission independent penetration testing, verify restore drills, and complete legal review, a DPIA and safeguarding assessment for school deployment. Introduce verified institutional ownership and teacher eligibility checks before enabling broad self-service classroom provisioning.
