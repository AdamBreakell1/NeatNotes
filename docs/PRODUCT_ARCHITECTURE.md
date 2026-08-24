# Product Architecture

Updated: 24 August 2026

## Runtime

Neat Notes is a dependency-light web application: semantic HTML, CSS and browser JavaScript served by Express 5 on Node 24. SQLite stores the current single-instance pilot. Static content modules hold the reviewed OCR model, original exam bank and deterministic interactive labs.

## Product boundaries

- Identity: local email verification, Google OAuth, hashed cookie sessions, reset, export and deletion.
- Entitlements: server-authoritative Free, Pro, Teacher and Institution capabilities reconciled from Stripe.
- Notes: personal/collaborative workspaces, versions, generated study packs and PDF export.
- Learning: concept evidence, due scheduling, confidence calibration, mistakes, sessions and progress.
- Content: versioned OCR topics/concepts, flashcards, exam rubrics and deterministic labs.
- Classroom: centres, classes, join codes, assignments, activity, heatmaps and interventions.
- Operations: health state, consented product events, content review and contact-delivery queue.

The browser may hide unavailable actions for clarity, but the server is the entitlement and ownership boundary. Guest notes remain local to that browser and never imply an authenticated account.

## Data flow

1. A user authenticates and receives an opaque HttpOnly session cookie.
2. The API checks identity, ownership/role and entitlement for every protected operation.
3. Retrieval, exam and lab submissions create bounded evidence and update the due schedule.
4. Teacher aggregates read only the membership-scoped evidence for their class.
5. Stripe webhooks reconcile subscription state; client success redirects never grant access.

## Scale path

The current deployment must run as one service attached to one persistent disk. Before horizontal scaling:

1. Move SQLite to managed PostgreSQL with versioned migrations and point-in-time recovery.
2. Move throttles, OAuth state and durable jobs to shared infrastructure.
3. Extract email, webhook and analytics work into idempotent background jobs.
4. Add centralised redacted logs, tracing, alerts and tested restore procedures.
5. Add verified institutional tenancy, staff eligibility and auditable administrator actions.

These changes should preserve current API contracts so the frontend can migrate incrementally.
