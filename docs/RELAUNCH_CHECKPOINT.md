# Production Relaunch Checkpoint

Updated: 24 August 2026

## Completed in this checkpoint

- Repositioned student navigation around Home, Revise, Practice, Progress and Notes.
- Added an adaptive learning model with weighted evidence, retrievability, mastery states and interval scheduling.
- Added server-side learning evidence, review schedules and a mistake journal.
- Rebuilt Today's Revision around five, fifteen and twenty-five minute adaptive sessions.
- Added misconception/confidence mismatch states and evidence-based progress-map labels.
- Reduced Notes complexity with one primary revision action and disclosed formatting/output tools.
- Added a persistent mobile bottom navigation and removed horizontal top-bar scrolling.
- Added installable PWA metadata and a conservative offline shell. Protected API and revision-topic responses are never cached.
- Added dynamic robots and sitemap endpoints.
- Fixed Google OAuth pre-hijacking by invalidating credentials planted on unverified accounts before linking.
- Made Stripe price IDs and active/trialing status authoritative for entitlements.
- Suspended paid collaboration/class management after entitlement loss.
- Removed the browser-side Study Pack paywall bypass.
- Added stronger join codes, join/billing/revision throttles, same-origin mutation checks and security headers.
- Added field limits, bounded note-version retention and bounded learning-event retention.

## Relaunch completion status

The seven remaining master-brief stages have now been implemented: onboarding and exam preferences, original deterministic Exam Practice, a validated OCR content model, separate teacher workflows, account lifecycle controls, consent-gated product analytics and the documented QA/release process.

Release invariants:

1. Do not describe rubric coaching as AI or OCR examiner marking.
2. Do not expose Component 02 or NEA content until it has been authored and reviewed.
3. Do not horizontally scale the SQLite deployment.
4. Do not enable mock billing in production.
5. Do not claim WCAG conformance until the external assistive-technology and device matrix is complete.

The next product phase is operational rather than another visual rewrite: monitored backups, legal/DPIA review, independent penetration testing, content review, real-device accessibility testing and a controlled pilot.
