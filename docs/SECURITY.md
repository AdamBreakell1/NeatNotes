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

## Required before national scale

Move rate limits and jobs to shared infrastructure, add password reset/session revocation/account deletion, deploy managed PostgreSQL with point-in-time recovery, add centralised redacted logging and alerting, commission penetration testing, and complete a DPIA plus safeguarding review for school deployment.

