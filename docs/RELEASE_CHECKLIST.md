# Release Checklist

Updated: 24 August 2026

## Code and content

- [ ] `npm run check` passes.
- [ ] `npm run validate:content` reports 16 topics and 316 concepts.
- [ ] `npm test` passes with no skipped security/entitlement journey.
- [ ] `git diff --check` passes and no secret or local database is tracked.
- [ ] OCR/exam content changes have an identified reviewer and provenance.

## Environment

- [ ] Production origin, persistent database path and one-instance limit are correct.
- [ ] Mock billing is disabled and Stripe uses the intended test/live mode.
- [ ] Verification, reset and contact messages arrive from the configured sender.
- [ ] Google callback exactly matches the deployed HTTPS URL.
- [ ] Database backup and restore have been tested.

## Product smoke test

- [ ] New student can verify, complete onboarding and select one free deck.
- [ ] A free account cannot fetch or submit protected deck, exam or lab content.
- [ ] Pro Checkout/portal and webhook entitlement changes work.
- [ ] Teacher can create a class and assignment; a student can join and complete it.
- [ ] Notes save, version, generate and export without cross-workspace access.
- [ ] Account export, other-session revocation and deletion are confirmed.
- [ ] Mobile primary navigation, dialogs, focus and reduced motion remain usable.

## Release

- [ ] `/api/health` is healthy and persistent after deployment restart.
- [ ] Monitoring/alerts and rollback commit are recorded.
- [ ] Legal/privacy terms reflect actual processing and subscriptions.
- [ ] Known limitations are documented; no OCR, AI-marking or accessibility conformance claim is overstated.
