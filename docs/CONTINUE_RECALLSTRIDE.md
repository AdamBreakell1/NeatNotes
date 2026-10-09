# Continue RecallStride — 9 October 2026

The owner authorised finding a suitable free host and migrating RecallStride. Continue from branch `codex/cloudflare-migration`; do not repeat the hosting research or navigation redesign.

**The migration is not live.** The Cloudflare Workers / SQLite Durable Object port and safe data-transfer tools are implemented locally. Safari is on the Cloudflare login page and `wrangler whoami` reports unauthenticated. The owner has been asked to sign in; no confirmation has arrived. No remote database, production customer export, provider configuration or domain purchase has been created by this work.

Render still serves https://neatnotes.onrender.com, release `d239cfe253f766a8de5dfffa07adef59c189a699` (health prefix `d239cfe253f7`). The 9 October health read returned HTTP 200, `ok:true`, persistent storage and no fallback. Its dashboard showed paid Starter hosting on 8 October. Preserve its disk and original data until cutover succeeds. Prior rollback release: `df4500f1b9c8c1232c49aa1d92934460b54e826b`.

Prepared work:

- The complete Express application runs inside a SQLite Durable Object; static files bypass it. Passwords, permissions, notes, learning records and subscription processing retain their API contracts. All 60 coding tasks and the embedded interpreter remain available.
- Real SQLite exercises, rollback-capable transactions, content seed fingerprints, indexes, reduced last-seen writes and persistent authentication throttling work in workerd.
- Signup failures return recoverable mail-delivery errors instead of generic 500. Retry preserves one pending account and valid earlier links. Actual school email delivery remains unverified.
- Private data transfer uses consistent read-only snapshots, chunk/table hashes, foreign-key checks, owner-only files and durable resumable receipts. It refuses an occupied destination.
- Maintenance freezes API callbacks/writes and background/startup data changes during import. Incomplete/failed imports stay closed after restarts. The old host can redirect existing GET links after cutover.
- `npm start` remains Node/Render-compatible. Cloudflare deployment rebuilds assets and supplies the committed revision to live health.

See [the migration runbook](CLOUDFLARE_MIGRATION.md) for account access, quotas, provider settings, cutover and rollback, and [commercial readiness](COMMERCIAL_READINESS.md) for externally unverified work. Hosting changes alone do not establish working payments or school mail delivery.

Verification passed: 105 Node tests; 12 workerd compatibility checks; 15 full-app checks; 5 actual-workerd transfer checks; syntax for 85 files; content validation and bundle dry run. Compressed Worker size: 639.87 KiB. Dependency audit reported zero vulnerabilities. [Local evidence](validation/cloudflare-migration-local.json) records the limits of this verification.

Test scripts use disposable synthetic databases and blank provider settings. Do not read `.env` or use the production disk as a test fixture. Run only checks justified by new changes:

```sh
npm test
npm run check
npm run validate:content
npm run test:cloudflare
npm run build:cloudflare
git diff --check
```

Do not use anonymous `wrangler deploy --temporary` for production/customer records. After account login, finish normal Wrangler OAuth, preserve provider settings without printing secrets, deploy closed, freeze and export Render, import/verify, then switch traffic. A domain purchase or paid hosting upgrade was not authorised by the request for a free migration.

Preserve unrelated untracked historical evidence: `docs/validation/production-deployment.json`, `docs/validation/code-studio-deployment.json`, `docs/validation/navigation-redesign-deployment.json`.

The owner requires complete features with real tasks, context and behaviour. Do not substitute empty screens or describe unfinished work as “gated” or “awaiting approval”; identify the actual missing dependency. When explicitly told to deploy, deploy and confirm the live revision using concise essential checks. The owner tests features; do not add computer-use feature tests to a deployment request. Preferences are saved in `/Users/adambreakell/.codex/AGENTS.md`.

The worksheet/interpreter and later navigation overhaul were already deployed. Older documents about withholding coding tasks or a local-only rollout are historical and superseded.
