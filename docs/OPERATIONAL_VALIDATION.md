# Provider and operational validation worksheet

7 October 2026. **Pending by user decision:** no approved non-production Stripe/email environment was supplied. No test or live provider operations were performed. Credentials were not read. All local checks use synthetic accounts/databases and `.env` loading is bypassed.

## Evidence levels

- Synthetic: fixtures/mocks and isolated local DB/browser journeys; repeatable engineering regressions.
- Configuration: read-only presence/health checks, if separately authorised; does not prove message delivery, settlement or portal behaviour. This increment inspected code, not configured secrets.
- Staging/provider: approved Sandbox/test inbox operations with provider receipts; none completed here.
- Production: actual authorised deployment/delivery/restore evidence; none added by this increment. Do not promote an older backup check into a successful production restore.

## Approved environment prerequisites

Record the staging URL/release, synthetic database path, provider Sandbox name, approved test inboxes, tester and approval reference. The release must be separate from production, mock billing off for provider rehearsal, consistent staging origins/callbacks and no live Stripe keys or customer records. Obtain credentials via the approved secret mechanism; never paste them into this worksheet. Verify signing destinations and test/live indicator without printing keys. Stop on any production endpoint/account identification.

| Journey | Rehearsal and expected observation | Actual evidence |
| --- | --- | --- |
| Signup/verify/resend | Synthetic account; email delivered to approved inbox, correct identity/host, verification-before-login, single-use expiry/resend and failure feedback. | Pending; local fixtures verify links, not real SMTP. |
| Recovery | Non-enumerating request, delivered reset, correct staging host, expiry/reuse denied, password update, old sessions revoked; observe sender authentication/spam placement. | Pending; synthetic regression exists. |
| Google, if enabled | Approved test identity, correct callback, refusal/error path, no surprise account linking or user role escalation. | Pending; do not enable just to test. |
| Checkout | Existing £3.99 test price; success, abandoned/failed checkout, no entitlement from success URL, paid access only after verified webhook. | Pending; no new price/product authorised. |
| Renewal/payment failure | Test-clock or approved Sandbox events; recognised current subscription state controls access; failed invoice/recovery handled. | Pending. |
| Portal/cancel | Actual portal opens for paid account; method/invoice access; cancel-at-period-end confirmation and effective date; access until active period ends, correct downgrade afterwards. | Pending; local state tests do not certify portal configuration. |
| Duplicate/stale events | Concurrent duplicate, failure/retry, out-of-order delivery and recovery from webhook downtime; current provider state reconciled exactly once. | Synthetic tests pass; actual destination rehearsal pending. |
| Deletion/support | Export plus cancellation support, blocked automatic paid/shared deletion, resolution workflow and provider-record retention. | Local export/deletion safeguards tested; provider/support handling pending. |
| Operations | Staging copy backup/restore, integrity/foreign keys, session/note/attempt/export fidelity, WAL/disk headroom and restore-erasure reconciliation. | Existing synthetic SQLite restore tested; actual production restore pending. |

For each completed provider case store: environment/release, timestamp, case ID, expected/actual result, synthetic account label, redacted delivery/event reference, tester and follow-up. Evidence must not contain email message bodies, source, tokens, customer details or keys. Record failed cases just as clearly as successful ones. Do not send customer communications or issue refunds during rehearsal.

## Human accessibility worksheet

Pending: desktop keyboard-only and VoiceOver/NVDA reading of task, textarea label, diagnostic live status/error links, result expansion and return focus; light/dark/forced colours; 200%/400% zoom; long source scrolling/line alignment; iOS Safari and Android with software keyboard while accessing input/output and Run/Stop; no accidental reset; screen-size orientation changes. Browser-width emulation/DOM assertions are supporting evidence, not these completed checks.

## Promotion/rollback decision

Use RELEASE_REPORT.md for current automated results, unresolved gates and the exact local application base. Request explicit production approval after independent academic review, owner/legal policy facts, provider/device checks and support ownership. No paid coding bank is enabled until genuine review records exist.

If a later approved rollout fails: stop promotion; revert the application build to the recorded prior reviewed revision; retain additive coding_practice_attempts/pilot_events tables (the old app ignores them). Preserve any newer account/notes/billing changes. A database restore is a separate incident decision requiring a fresh snapshot, reconciliation and approval; never overwrite current users with a stale backup. Test rollback in staging against the additive schema and the existing raw-asset/paywall restrictions before deployment. Reverted builds must not expose draft banks or resurrect unsupported automatic marks.
