# RecallStride migration — 10 October 2026

## Status and architecture

**The complete app is live at https://recallstride.breakellsystems.workers.dev. Production data and the real SMTP connection are verified.** Cutover code revision `14f3820838e6` returned health 200 with persistent storage, no fallback, 24 decks and email/Stripe configuration. The coding-task API returned all 60 tasks with `preview=false`; anonymous session access correctly returned 401. [GitHub run 38042175469](https://github.com/AdamBreakell1/NeatNotes/actions/runs/38042175469) deployed that active release while preserving the database and provider secrets. Future `main` pushes publish newer revisions; query `/api/health` for the current live SHA. See [the current checkpoint](CONTINUE_RECALLSTRIDE.md) and [automatic GitHub deployment](GITHUB_DEPLOYMENT.md).

The owner confirmed existing-account sign-in and authorised retirement. Render NeatNotes and its attached 1 GB disk are deleted; the project has zero services and the temporary SSH key is revoked. Temporary transfer/provider-check Workers, tokens and generated credential copies are removed. Protected backup/export files are retained under `/Users/adambreakell/.codex/backups/RecallStride/2026-10-10/`, in a 0700 directory with 0600 files. Import `474e22e3-0a0e-4d46-9ec1-1bba900b99ae` completed **1,002 rows across 39 tables in 28 chunks**; counts/hashes match, foreign-key violations are zero and integrity is `ok`. Artifact SHA-256: `2feccf6e36e368bc413bea08d1fff5eb4d5468ceb1ce8d30462ef19c05eae694`.

Eleven existing SMTP/Stripe settings were copied privately. Existing live Stripe endpoint `we_1Tp7dD5atRAfVJNk9PxB1vVK` now points to the Cloudflare webhook URL, with its signing secret preserved. Google sign-in was not configured on the source. The SMTP compatibility repair connects to the original hostname, requires TLS and verifies certificates, avoiding Nodemailer's resolved-IP proxy failure. Six focused tests passed, and an actual Cloudflare handshake returned HTTP 200, `configured=true`, `verified=true`, `errorCode=null`. No email was sent. The repair is now published and the account API is active. Users must sign in on the new hostname using their existing account/password. The owner confirmed that existing-account sign-in works; Render and its paid disk are now retired. Custom domain and support email are deferred.

The target is a Cloudflare Worker for static assets/routes and one SQLite-backed Durable Object running the complete Express API. This preserves existing SQLite transactions, foreign keys, passwords and workspace relationships. Students' code runs in their browsers. Static assets avoid database requests. One database preserves joins and Stripe idempotency but does not provide horizontal database sharding.

## Free-plan limits

Checked against [Cloudflare pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [limits](https://developers.cloudflare.com/durable-objects/platform/limits/) on 9 October 2026:

| Meter | Free allowance |
| --- | --- |
| Durable Object requests | 100,000/day |
| Active duration | 13,000 GB-s/day |
| SQLite rows read | 5 million/day |
| SQLite rows written | 100,000/day, including deletes and index writes |
| Storage | 5 GB/account; 1 GB for this single database |
| Database CPU | 30 seconds per invocation by default |

The calling Worker has its own request/CPU quota. Free daily quotas reset at 00:00 UTC; exceeding them causes errors. This can remove the current hosting charge within those limits, but it does not promise unlimited free growth. Measure actual database size, migration writes and daily traffic before cutover. The Western Europe placement hint is not a legal residency guarantee.

## Verification

`npm test` covers ordinary APIs, failed email delivery, auth links, transfer integrity and source maintenance. `npm run test:cloudflare` runs real workerd against disposable fixtures, including password compatibility, transactions, app routes, isolation, restart persistence, throttling and private migration/resume. These development tests use no customer records or live providers. Separately, the authorised real data transfer verified counts/hashes/integrity, the actual GitHub workflow deployed successfully, and six focused SMTP tests and a real Cloudflare provider handshake confirmed the repair above. No email was sent or financial test performed. A bundle dry run alone is not a deployment.

## Cutover and recovery procedure

All cutover steps are complete: verified transfer, provider settings/webhook, SMTP connection, live full app, owner account confirmation, temporary cleanup and authorised Render/disk retirement. Historical accrued Render charges of $2.20 remain payable; no new service/disk charges are projected. Keep this procedure for recovery and future migrations, not as an instruction to repeat the completed production import.

1. Have the owner sign in at https://dash.cloudflare.com, complete `wrangler login`, then confirm the correct account with `wrangler whoami`. Use its Free plan. Do not use anonymous temporary hosting or select a paid upgrade. Check source bytes and expected row/index import costs fit the free allowance before scheduling downtime.
2. Copy `wrangler.jsonc` to ignored `.cloudflare-production.json`. Configure the actual HTTPS `BASE_URL`, matching `CORS_ORIGIN` and `MIGRATION_MODE=true`. Resolve `main`/`assets.directory` relative to that file. Keep the production Worker named `recallstride` and mock billing disabled. Deploy the committed branch with `npm run deploy:cloudflare -- --config .cloudflare-production.json`. This rebuilds assets and supplies `RELEASE_SHA`; APIs must remain 503 while closed.
3. Preserve existing provider values through protected Cloudflare secret input, without writing secrets to Git, command arguments or logs. Names: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `CONTACT_TO`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO` (legacy `STRIPE_PRICE_PLUS`), `STRIPE_PRICE_PRO_ANNUAL` if used, `STRIPE_PRICE_TEACHER`, `STRIPE_PRICE_INSTITUTION`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Cloudflare [blocks outbound SMTP port 25](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/); use supported 465/587 or the provider's HTTPS API. Bundling does not establish delivery.
4. Deploy this compatible Node revision to Render first, preserving secrets/disk. Then set Render `MIGRATION_MODE=true` and wait for old processes and in-flight requests to stop. Health stays 200; other APIs return 503, and background retries/startup data changes stop. Make a consistent SQLite backup including WAL state; never copy only a live `.sqlite` file during writes. Keep the original disk. Export the explicit frozen/backup path from a trusted environment:

   ```sh
   node scripts/export-migration.mjs --source /explicit/frozen/source.sqlite --output /private/path/recallstride.migration-private.json
   ```

   The source is read-only and the snapshot consistent. The export creates a new 0600 file exclusively, without overwriting backups.
5. Generate a random token of at least 32 characters in owner-only `.cloudflare-migration-token`. Set it as `MIGRATION_SECRET` on temporary Worker `recallstride-transfer` and deploy `backend/cloudflare/migration-wrangler.jsonc`. It binds the production database through account-local RPC. The public application exposes no transfer route. Import with:

   ```sh
   node scripts/import-migration.mjs --input /private/path/recallstride.migration-private.json --url https://ACTUAL-PRIVATE-TRANSFER-HOST --token-file /private/path/.cloudflare-migration-token
   ```

   Full file integrity is checked before target contact. Ordered atomic chunks resume from durable receipts; repeats do not duplicate rows. An occupied destination is refused. Completion requires matching table counts/hashes and valid foreign keys. Require `status:complete`; a failed import stays closed. Do not reset a failed import to hide corruption.
6. Update Stripe's webhook URL to the new `/api/billing/stripe/webhook` and preserve the existing endpoint's signing secret. Update Google's callback `/api/auth/google/callback` and origin only if Google sign-in was configured on the source. Update sender links and provider/policy facts. Remove Cloudflare `MIGRATION_MODE` only after data integrity succeeds and the configured providers work in the new runtime. Redeploy; health must show the committed revision, persistent database and no fallback. Health alone does not establish email delivery or the complete payment lifecycle.
7. Keep Render frozen and set `MIGRATION_REDIRECT_URL` to the new canonical HTTPS origin. Old GET links, including verification/reset, redirect; old mutations remain 503, preventing two writable databases. Users must sign in on the new hostname because cookies belong to the old host. Update promoted links. Delete the temporary transfer Worker and token, clear staging exports and retain only the controlled backup. Keep the old service/disk until rollback retention and new operation are confirmed.

## Rollback and domain

The old Render service is deleted. The retained source backup is a point-in-time snapshot, not the current database. Recovery requires preserving and reconciling newer Cloudflare data/provider events before restoring into a newly provisioned service. Do not discard new student records or leave two stores writable. No full production restore was performed during this migration.

No domain was purchased. The owner deferred RecallStride.com and a custom support email. The free `workers.dev` hostname serves the application; any later domain purchase requires its current availability and price to be checked.

School mail acceptance and the full Stripe purchase/cancellation lifecycle have not been exercised by this migration. The retained production backup has integrity evidence; a full restore has not been performed. See [commercial readiness](COMMERCIAL_READINESS.md) for the actual remaining work.
