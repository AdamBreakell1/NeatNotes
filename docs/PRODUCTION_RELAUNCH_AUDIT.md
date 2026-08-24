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

## Partial or staged systems

- Adaptive learning is implemented for flashcard and quiz evidence; written exam marking is not yet implemented.
- Teacher functionality exists but still shares the application shell and needs the dedicated product experience in the brief.
- Offline support caches the application shell and preserves guest/local notes; authenticated API mutations are intentionally not queued yet.
- Component 1 source content exists; a fully versioned specification/content CMS does not.

## Product and UX concerns addressed

The previous Notes-versus-Revision framing, crowded revision dashboard, horizontal mobile controls and exposed Notes tooling created decision friction. The new navigation and Today's Revision surface establish an immediate recommended action while progressive disclosure keeps advanced Notes tools available without competing with writing.

## Security and data concerns addressed

The relaunch closes OAuth account pre-hijacking, stale/inactive Stripe entitlement grants, browser-side Study Pack access, weak join tokens, unbounded note versions and unbounded per-card learning history. Same-origin mutation checks, CSP/HSTS, request limits and rate-limit record cleanup were added.

## Remaining architecture direction

SQLite remains appropriate for the current pilot but should move to managed PostgreSQL before multi-instance scaling. The next backend layer should separate account, billing, learning, content and classroom services from `server.js`, introduce migrations, jobs, structured logs and monitored backups, while preserving the current public API contracts.

