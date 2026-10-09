# RecallStride commercial readiness — 9 October 2026

**The app has functioning revision, notes, teaching and coding features, but its revenue and email providers have not been verified.** Hosting migration alone does not establish readiness to take paying customers. The owner previously chose to record provider checks as pending.

The owner authorised the previous feature deployments and now a suitable free hosting migration. Older documents about withholding coding tasks, local-only work or approval-dependent empty screens are superseded. All 60 coding tasks, the complete interpreter and revised navigation are available in production. Development tests are not independent academic certification.

| Area | Current evidence | Remaining concrete work |
| --- | --- | --- |
| Live app | Render health 200, revision `99844836957d`, persistent database, no fallback | Preserve service/disk through cutover |
| Free hosting | Full Express/SQLite port, real-runtime checks and safe transfer tools | Cloudflare app deployed closed; finish temporary Render SSH access, actual customer export/import and cutover; see [runbook](CLOUDFLARE_MIGRATION.md) |
| Signup/email | Generic500 after failed verification delivery fixed locally; retries preserve one account and valid links | Fix is deployed on Render; verify real sender/recipient delivery. School email domain/provider response unknown; no platform restriction established |
| Subscriptions | Signed/idempotent webhooks, state reconciliation and plan boundaries pass synthetic checks | Real Stripe prices, Checkout, portal, webhook delivery and cancellation/refund behaviour on the chosen origin remain unverified |
| Student data | Account isolation/export/deletion and synthetic backup/transfer checks pass | Actual production backup, verified transfer and recovery evidence |
| Domain | RecallStride/BreakellSystems displayed; no domain purchased | Confirm chosen domain/price, register with owner authority, configure DNS/TLS/sender records |
| Policies | Implementation-specific policy drafts exist | Supply actual operator/contact/provider/retention/refund facts and complete owner review; do not invent these |
| Content | 24 topics, 474 concepts, 60 coding tasks; examples/benchmarks execute | Independent subject review and real student outcomes unestablished; avoid exam-grade certification claims |
| Accessibility | Previous automated navigation/interpreter checks and responsive layouts | Actual screen-reader/device feedback remains bounded; no universal claim |
| Expansion | Static assets bypass database; indexes and fewer repeated writes | Measure real usage/latency/quota headroom; one database is not horizontal sharding or unlimited free scale |

Next: finish the prepared Render SSH access and complete the controlled data transfer/cutover. Cloudflare authentication/deployment are complete. Do not restart a broad audit or redo computer-use feature tests when asked to deploy. Confirm the live revision and precisely which provider/customer-data/domain actions happened.
