# RecallStride migration — 9 October 2026

## Status and architecture

The owner authorised a suitable free migration. Cloudflare and Wrangler are now authenticated. The app is deployed at https://recallstride.breakellsystems.workers.dev in maintenance mode, revision `99844836957d`; the protected transfer service is deployed. **Customer data has not moved.** Render now serves the same compatible revision and remains writable with its original disk. Next: finish the prepared temporary Render SSH-key registration, then follow the source-freeze/backup/import procedure. See [the current checkpoint](CONTINUE_RECALLSTRIDE.md).

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

`npm test` covers ordinary APIs, failed email delivery, auth links, transfer integrity and source maintenance. `npm run test:cloudflare` runs real workerd against disposable fixtures, including password compatibility, transactions, app routes, isolation, restart persistence, throttling and private migration/resume. No live mail, payment, customer data or hosting capacity is tested. A bundle dry run is not a deployment.

## Cutover

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
6. Update Stripe's webhook URL to the new `/api/billing/stripe/webhook` and use the correct signing secret. Add Google's callback `/api/auth/google/callback` and origin. Update sender links and provider/policy facts. Remove Cloudflare `MIGRATION_MODE` only after data integrity succeeds and real provider configuration is present. Redeploy; health must show the committed revision, persistent database and no fallback. Provider delivery/payment checks remain incomplete until tested in the owner's chosen environment or by the owner; health alone does not establish revenue readiness.
7. Keep Render frozen and set `MIGRATION_REDIRECT_URL` to the new canonical HTTPS origin. Old GET links, including verification/reset, redirect; old mutations remain 503, preventing two writable databases. Users must sign in on the new hostname because cookies belong to the old host. Update promoted links. Delete the temporary transfer Worker and token, clear staging exports and retain only the controlled backup. Keep the old service/disk until rollback retention and new operation are confirmed.

## Rollback and domain

Before opening Cloudflare, keep it closed and remove Render maintenance to resume the original source. After new writes are accepted, Render is stale: freeze the new host, preserve and reconcile its data/provider events, then reopen a restored source. Do not discard new student records or leave both stores writable.

No domain was purchased. The 8 October registry checks showed no registration for `recallstride.com` or `recallstride.co.uk`; availability/checkout price still need confirmation. A free `workers.dev` hostname can serve the application. A branded domain normally has registration/renewal costs and is outside the free-migration spending authority.

Real school mail delivery, Stripe lifecycle, actual production recovery and owner/operator facts remain unverified. See [commercial readiness](COMMERCIAL_READINESS.md).
