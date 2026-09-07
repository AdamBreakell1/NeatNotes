# Student relaunch: release and rollback

7 September 2026. Current decision: **NO-GO for an unrestricted production relaunch**. Engineering validation is local; academic, legal, provider and real-device gates below remain open. This branch must not be merged/deployed automatically.

## Boundary and inventory

Keep Node 24+, Express 5, vanilla JS and SQLite on one persistent-disk instance. Keep auth/verification/recovery, account/profile/preferences, notes/workspaces/exports, Stripe and support APIs. Student views are Today, Revise, Practice, Progress and Notes. Auth/plans/settings remain modal/account surfaces; Contact/legal/public OCR topic routes remain public support/acquisition surfaces.

Retain legacy centres/classes/memberships/assignments and ownership contracts. Retire new public Teacher/Institution acquisition and checkout. Keep signed webhook handlers and contact retry work. New modules isolate content release/coverage, session queues, constrained SQL, subscription events, trusted schedule reconstruction and product configuration. No framework/database migration was introduced.

The only new database structure is additive `revision_attempt_receipts`, plus idempotent seeding of C2 topics/cards through the existing content tables. Existing IDs and records are retained. Production draft-release checks, not absence of database rows, prevent serving unapproved C2 material. Do not use database presence as a publication flag.

## Local verification

Use a disposable database and blank provider credentials, never the production database or customer email addresses. The API and browser suites create their own synthetic fixtures and stop their child servers.

```sh
npm ci
npm run check
npm run validate:content
npm run coverage:content
npm test
npm run test:browser
```

The browser script accepts `NEAT_PLAYWRIGHT_PATH` and `NEAT_BROWSER_EXECUTABLE` for an existing local runtime. It writes screenshots and results under ignored `test-results/student-relaunch/`. It uses an isolated browser context, not the person's signed-in browser profile. Do not add a real provider key to the fixture environment.

The integration suite performs an isolated SQLite `VACUUM INTO` backup with WAL activity, integrity and foreign-key checks, then starts a second server from the backup and verifies sessions, evidence and curriculum. This is a tested synthetic restore, not a rehearsal of restoring Render's actual backup service. Schedule that rehearsal with explicit approval.

## Required staging checks

1. Human subject review: record exact-version approvals for C2, finish C1 objective mapping, inspect examples/distractors/calculations and review coverage gaps. Run the validator and regenerate the matrix.
2. Production-mode staging: verify no C2 cards/questions/labs or public topic pages are delivered without approval; raw content assets remain unavailable; Free cannot claim a second deck or elevate a plan/role.
3. Provider Sandbox: successful/abandoned Checkout, portal, renewal, payment failure/recovery, duplicate/concurrent/stale webhook delivery, cancellation at period end, downgrade and downtime/resend reconciliation. Confirm signatures against the actual destination. No real charges or refunds.
4. Email: verify signup, resend, recovery and contact end-to-end with approved test inboxes. Check spam, sender authentication, expiry and error handling. Contact queue retry does not prove auth email delivery; reset sends are asynchronous and require delivery monitoring.
5. Accounts: free/Pro/legacy fixture login, two browsers, expiry, password reset/reuse, session revocation, profile persistence, notes/evidence export, paid/shared deletion safeguards and support escalation.
6. Accessibility: keyboard-only and VoiceOver/NVDA; 200%/400% zoom; focus under fixed navigation; contrast/targets; long names/questions; touch and software keyboard on real iOS Safari and Android. Desktop Brave emulation is not mobile-browser certification.
7. Operations: approved production-like backup restore, disk-space alerting, structured error redaction, dependency audit, provider failure alerts and documented on-call/support owner.
8. Legal/under-18 review and approved support/refund/cancellation policy. Obtain explicit launch/merge approval.

## Deployment after approval

Use a reviewed feature-branch commit and a separately approved merge to the deployment branch. Build with `npm ci` using the lockfile. Set `NODE_ENV=production`, persistent `DATABASE_PATH`, exact HTTPS `BASE_URL`/`CORS_ORIGIN`. Keep mock billing off. Pro readiness requires Pro price, secret key and webhook secret, not a Teacher price. Preserve configured legacy prices for existing contracts.

Snapshot before deployment, record the previous commit and resource versions, and validate the snapshot in isolation. Start one instance, check health plus actual student/auth/content workflows, webhook logs and email deliveries. Health only establishes process/configuration/database checks. Do not declare success from `ok: true` alone.

## Rollback

Stop promotion on account-data leakage/loss, incorrect paid access, broken core actions, false grading, inaccessible primary controls or provider failures. Preserve event/audit references without copying personal text into incident logs. Redeploy the prior reviewed application commit; the new receipt table is additive and may remain. Keep quarantine entries and avoid making draft C2 visible through an older raw-asset route. Confirm the exact rollback build against the updated database before using it.

Do not restore a stale database over current users automatically: it could erase notes, attempts or billing updates. Any data restore needs incident approval, a fresh safety snapshot, reconciliation of intervening writes and provider state, and verification of ownership/foreign keys. Legacy numeric exam marks must not reappear as validated grades during rollback.

## Storage, offline and scaling limits

Service-worker caching is allowlisted to the public app shell. API responses and gated topic scripts are network-only; topic/navigation pages cannot replace `/` in cache. Offline shell recovery is not a promise of offline authenticated revision. Quiz/session restoration rechecks current accessible content; pending flashcard attempts use account-bound idempotent IDs.

Local drafts remain device data; agree a clear-on-sign-out/expiry policy for shared computers. Timed-paper resume is bounded to seven days. Receipt and draft retention, backup erasure and maximum data growth require operational review before a large launch.

Monitor HTTP latency/5xx, event-loop delay, SQLite busy errors, disk/headroom, webhook failures and queue age. Establish thresholds from a controlled load test, not a guessed user count. Consider a managed database only when measured write contention, resilience or multi-instance requirements justify it. Rehearse schema transfer with stable IDs, counts/checksums, foreign-key checks, dual-read comparison, provider reconciliation and a reversible cutover plan before approval.
