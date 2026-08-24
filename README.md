# Neat Notes

Neat Notes is a BreakellSystems OCR A-Level Computer Science revision and notes platform. The current app is a vanilla frontend served by an Express backend with SQLite persistence.

## Local Setup

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:4173`.

For a beginner-friendly online deployment walkthrough, use `DEPLOYMENT_STEP_BY_STEP.md`.

For Stripe products, checkout, webhooks and paywall setup, use `STRIPE_MONETISATION_SETUP.md`.

For development reloads:

```bash
npm run dev
```

## Environment Variables

Required locally:

- `PORT` - default `4173`
- `BASE_URL` - default `http://localhost:4173`
- `DATABASE_PATH` - default `./data/neat-notes.sqlite`
- `CORS_ORIGIN` - comma-separated allowed browser origins
- `AUTH_RATE_LIMIT` - auth attempts per IP/path per 15 minutes

Optional production integrations:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` for verification and contact form email delivery. Gmail works with `smtp.gmail.com`, port `465`, secure `true`, and a Google app password.
- `CONTACT_TO`, `CONTACT_RATE_LIMIT` for public contact form routing and abuse protection.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google sign-in.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEACHER` for live subscription billing.

Without SMTP, local verification links are printed to the server console and returned in development API responses. Contact enquiries are saved to the database first, routed to `neatnotescontact@gmail.com` by default, and queued for retry if SMTP delivery is temporarily unavailable.

## Product Architecture

The backend currently uses:

- Express 5
- Node SQLite via `node:sqlite`
- Cookie sessions stored as hashed tokens
- Scrypt password hashing
- Email verification tokens
- Google OAuth hooks
- SQLite-backed notes, workspaces, classes, memberships, decks, attempts and analytics

Important files:

- `server.js` - HTTP routes, schema migration, auth, classroom and revision APIs.
- `backend/services/learningAnalytics.js` - confidence summaries and recommendation logic.
- `ocr-content.js` - versioned OCR H446 content model derived from reviewed topic data.
- `exam-content.js` and `cs-labs.js` - original deterministic exam and interactive-practice content.
- `revision-topics.js` - teacher-authored source data seeded into backend flashcard decks.
- `data/neat-notes.sqlite` - local SQLite database.

The current service is intentionally a single-instance architecture. See `docs/PRODUCT_ARCHITECTURE.md` for boundaries and the staged PostgreSQL scale path.

## API Summary

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/verify`
- `GET /api/auth/google`
- `GET /api/session`

Account lifecycle:

- `GET /api/account/sessions`
- `DELETE /api/account/sessions/others`
- `GET /api/account/export`
- `DELETE /api/account`

Profile:

- `GET /api/profile`
- `PATCH /api/profile`

Notes and workspaces:

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/notes?workspaceId=...`
- `POST /api/notes`
- `PATCH /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/notes/:id/versions`
- `GET /api/notes/:id/study-pack`
- `GET /api/notes/:id/export.pdf`

Centres and classes:

- `GET /api/centres`
- `POST /api/centres`
- `POST /api/centres/join`
- `GET /api/classes`
- `POST /api/classes`
- `POST /api/classes/join`
- `GET /api/classes/:id`
- `DELETE /api/classes/:id/members/me`
- `GET /api/classes/:id/students`
- `GET /api/classes/:id/dashboard`
- `GET /api/classes/:id/students/:studentId/dashboard`
- `POST /api/classes/:id/join-code/regenerate`
- `POST /api/classes/:id/join-code/disable`

Revision:

- `GET /api/revision/decks`
- `GET /api/revision/decks/:id`
- `POST /api/revision/attempts`
- `GET /api/revision/recommendations`
- `GET /api/revision/activity`
- `GET /api/learning/dashboard`
- `POST /api/learning/session`
- `GET /api/exam/questions`
- `POST /api/exam/attempts`
- `GET /api/labs`
- `POST /api/labs/attempts`

## Product Verification

The integration suite creates isolated temporary accounts and checks authentication, free-plan enforcement, teacher classes, student joining, assignments and insight permissions. Mock billing exists only when explicitly enabled outside production.

## Checks

```bash
npm run check
npm run validate:content
npm test
```

## Production Operations

- Stripe Checkout, Customer Portal and signed webhooks are implemented; production Price IDs and webhook secrets must be configured in the host.
- SMTP verification, password reset and contact delivery are implemented; the sender must be an authenticated mailbox or verified provider identity.
- Cross-origin credentials are not required: authenticated mutations are checked against the configured same origin.
- SQLite with a persistent disk is appropriate for one early production instance. It must not be scaled horizontally. Move to managed PostgreSQL before multiple application instances or materially higher write volume.
- Mock billing is rejected in production. Keep `ALLOW_MOCK_BILLING=false`.
- Follow `docs/DEPLOYMENT.md` and `docs/RELEASE_CHECKLIST.md`; do not treat a successful build alone as a release sign-off.
