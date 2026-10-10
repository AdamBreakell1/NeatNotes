# RecallStride commercial readiness — 10 October 2026

**The full Cloudflare app, verified production transfer, working SMTP connection and automatic GitHub deployment are in place. Cloudflare remains closed while the repaired release is prepared for publishing and final account/app checks.** Render is frozen and retained until the Cloudflare app/account system works, after which the owner authorised service and paid-disk retirement. Custom domain and support email are deferred.

All 60 coding tasks, the complete embedded interpreter and revised navigation are included. Older documents withholding coding tasks, requiring local-only work or describing empty approval-dependent features are superseded. Development tests are not independent academic certification.

| Area | Current evidence | Remaining concrete work |
| --- | --- | --- |
| Full app | Complete Express API and public app assets deployed to Cloudflare; workerd checks cover revision, notes, teaching, coding, account isolation and persistence | Publish the repaired release, open the new host, confirm its live revision and account behaviour |
| GitHub deployment | Actual [run 38041652049](https://github.com/AdamBreakell1/NeatNotes/actions/runs/38041652049) deployed `main` revision `78b10336da079f416dc93b3cc1192bb166c3c1c2`; database, secrets and maintenance state preserved | Use the same workflow for the final fix and future maintenance |
| Accounts/email | Existing password hashes/salts and account records transferred; recoverable signup and retry/link handling implemented; existing SMTP settings copied | SMTP compatibility repair passed six focused tests and an actual Cloudflare handshake: HTTP 200, configured/verified true, no error. No email was sent; recipient inbox acceptance has not been exercised |
| Subscriptions | Existing Stripe settings copied; signed/idempotent handling and plan boundaries pass synthetic checks; live endpoint updated to the Cloudflare webhook URL with the existing signing secret | Confirm actual Checkout/portal/webhook behaviour on the new origin; no purchase or financial test has been performed |
| Student data | Verified transfer of 1,002 rows in 39 tables; matching counts/hashes, zero foreign-key violations, integrity `ok`; protected production backup retained | Preserve the backup and complete cutover; after Cloudflare accepts writes, the frozen Render copy is stale |
| Render retirement | Source frozen, health 200/session 503; original service/disk retained | After the new app/account system works, retire the service and paid disk and remove temporary migration access |
| Domain/support email | Free `workers.dev` origin available; no domain purchased | Owner deferred RecallStride.com and custom support email |
| Policies | Implementation-specific policy drafts exist | Ensure operator/contact/provider/retention/refund facts match the actual service; do not invent these |
| Content | 24 topics, 474 concepts, 60 coding tasks; examples/benchmarks execute | Independent subject review and real student outcomes unestablished; avoid exam-grade certification claims |
| Accessibility | Previous automated navigation/interpreter checks and responsive layouts | Incorporate actual screen-reader/device feedback; no universal accessibility claim |
| Expansion | Static assets bypass database; indexes and fewer repeated writes; production data fits the migration | Measure actual traffic/quota headroom; one database is not horizontal sharding or unlimited free scale |

Publish the verified SMTP repair and finish the controlled cutover. Do not restart a broad audit or add computer-use feature tests to a deployment request. Confirm exactly which live revision, provider checks, account checks and Render retirement actions completed.
