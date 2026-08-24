# Production Deployment

Updated: 24 August 2026

## Render service

1. Deploy the GitHub repository as one Node web service.
2. Use build command `npm install` and start command `npm start`.
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

Set live `STRIPE_SECRET_KEY` and the recurring Price IDs for Pro, Teacher and Institution. Add an HTTPS webhook destination at `https://YOUR-DOMAIN/api/billing/stripe/webhook`, subscribe to Checkout/subscription/invoice lifecycle events required by the app, and set its signing secret as `STRIPE_WEBHOOK_SECRET`. Confirm Checkout, cancellation/portal, upgrade and entitlement removal. Never set `ALLOW_MOCK_BILLING=true` in production.

## Operations

- Snapshot the persistent disk/database and test restoration before accepting paid users.
- Monitor `/api/health`, HTTP 5xx, process restarts, disk capacity, webhook failures and queued contact email.
- Deploy from a reviewed commit, run the release checklist, and retain a rollback commit.
- Follow the more introductory walkthrough in `DEPLOYMENT_STEP_BY_STEP.md` when configuring the services for the first time.
