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

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` for verification email delivery.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google sign-in.

Without SMTP, local verification links are printed to the server console and returned in development API responses.

## Backend Architecture

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
- `revision-topics.js` - source data seeded into backend flashcard decks.
- `data/neat-notes.sqlite` - local SQLite database.

## API Summary

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/verify`
- `GET /api/auth/google`
- `GET /api/session`

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

## Demo Flow

1. Create and verify an account.
2. Use Plans to mock-upgrade to Teacher.
3. Create a centre with `POST /api/centres`.
4. Create a class with `POST /api/classes`.
5. Use the returned `joinCode` from a student account with `POST /api/classes/join`.
6. Submit flashcard confidence via `POST /api/revision/attempts`.
7. Review teacher analytics via `GET /api/classes/:id/dashboard`.

## Checks

```bash
npm run check
npm test
```

## Production Notes

Still required before a full paid public launch:

- Replace mock billing with Stripe or another payment provider.
- Use managed production storage with backups. SQLite is suitable for local/dev and small early pilots, but a hosted Postgres service is safer for scale.
- Add a proper migration runner if the schema starts changing frequently.
- Add CSRF protection for cookie-authenticated state-changing requests before cross-origin production deployment.
- Add hosted email delivery, monitoring, structured logging and database backup routines.
- Complete frontend sync for all new classroom/revision APIs. Guest/local mode remains intentionally available.
