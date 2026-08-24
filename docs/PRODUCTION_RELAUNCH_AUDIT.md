# Production Relaunch Audit

## Current architecture

Neat Notes is a dependency-light web application: semantic HTML, a single browser application module, CSS, Express 5, Node 24 and SQLite. Render hosts the Node service and persistent disk. Authentication uses hashed cookie sessions, email verification and Google OAuth. Stripe webhooks control subscription state.

## Working systems retained

- Notes, folders, workspaces, collaboration, formatting, summaries and revision generation.
- Email/password authentication, verification, Google sign-in and account profiles.
- OCR Component 1 flashcards, Quick Practice, streaks, deck progress and badges.
- Free-deck selection and server-enforced paid deck access.
- Centres, classes, join codes, assignments and teacher/student dashboards.
- Stripe Checkout, Customer Portal and signed/idempotent webhook handling.
- Contact enquiry persistence, SMTP delivery and retry queue.

## Completed relaunch systems

- Concept-level adaptive scheduling combines flashcard, quiz, exam and lab evidence with due, fragile and misconception states.
- Original exam questions use a transparent deterministic rubric coach with matched and missing points; the product does not claim OCR or AI marking.
- Teacher Home, Classes, Assignments and Insights are separate role-aware views with permission-bound APIs and clean empty states.
- The OCR H446 content model is versioned, validated in CI-style checks and exposed through an internal review queue for administrators.
- First-run onboarding captures learner type, target, taught topics, exam dates and revision preferences.
- Account export, deletion, password reset and session revocation are available from account settings.

## Intentionally staged systems

- Offline support caches only the application shell and local guest workspace; authenticated mutations are deliberately not queued.
- A full editorial CMS, institutional SSO, teacher verification workflow and Component 02/NEA content remain future work.
- SQLite is a single-instance pilot store, not the national-scale target architecture.

## Product and UX concerns addressed

The previous Notes-versus-Revision framing, crowded revision dashboard, horizontal mobile controls and exposed Notes tooling created decision friction. The new navigation and Today's Revision surface establish an immediate recommended action while progressive disclosure keeps advanced Notes tools available without competing with writing.

## Security and data concerns addressed

The relaunch closes OAuth account pre-hijacking, stale/inactive Stripe entitlement grants, browser-side Study Pack access, weak join tokens, unbounded note versions and unbounded per-card learning history. Same-origin mutation checks, CSP/HSTS, request limits and rate-limit record cleanup were added.

## Remaining architecture direction

SQLite remains appropriate for the current single-instance pilot but should move to managed PostgreSQL before multi-instance scaling. The next backend layer should separate account, billing, learning, content and classroom services from `server.js`, introduce versioned migrations, shared throttling, durable jobs, centralised redacted logs and monitored backups while preserving the current public API contracts.
