# Production Deployment

Updated: 7 September 2026. Student relaunch is gated by `STUDENT_RELEASE_RUNBOOK.md`; these instructions are not deployment approval.

## Render service

1. Deploy the GitHub repository as one Node web service.
2. Use build command `npm ci` and start command `npm start`.
3. Use a paid instance with a persistent disk mounted at `/var/data`.
4. Set `DATABASE_PATH=/var/data/neat-notes.sqlite`.
5. Set `NODE_ENV=production`, `BASE_URL=https://YOUR-DOMAIN`, and `CORS_ORIGIN` to that exact origin.
6. Keep one instance. SQLite does not support this app's horizontal scaling model.
7. Confirm `GET /api/health` reports `ok: true` and `databasePersistent: true`.

## Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` and `CONTACT_TO`. For Gmail use `smtp.gmail.com`, port `465`, secure `true`, and an app password. `EMAIL_FROM` must match an authenticated or provider-verified sender. Test sign-up verification, password reset and contact delivery; a saved contact enquiry may return `queued` while automatic retries continue.

## Google sign-in

Create a Google OAuth web client and register `https://YOUR-DOMAIN/api/auth/google/callback`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then test both a new Google account and an existing verified local account.

## Stripe

Validate in Stripe Sandbox before configuring live credentials with explicit approval. Public checkout needs `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO` and `STRIPE_WEBHOOK_SECRET`; preserve any existing Teacher/Institution price mappings for legacy contracts. The HTTPS destination is `https://YOUR-DOMAIN/api/billing/stripe/webhook`. Required lifecycle events include `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` and `invoice.payment_failed`. Confirm portal, renewal, failure/recovery, cancellation timing and entitlement removal. Annual checkout is disabled pending price/terms approval. Never set `ALLOW_MOCK_BILLING=true` in production.

## Operations

- Snapshot the persistent disk/database and test restoration before accepting paid users.
- Monitor `/api/health`, HTTP 5xx, process restarts, disk capacity, webhook failures and queued contact email.
- Deploy from a reviewed commit, run the release checklist, and retain a rollback commit.
- Follow the more introductory walkthrough in `DEPLOYMENT_STEP_BY_STEP.md` when configuring the services for the first time.
