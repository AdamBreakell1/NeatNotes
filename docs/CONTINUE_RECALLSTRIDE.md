# Continue RecallStride — 9 October 2026

The owner authorised finding a suitable free host and migrating RecallStride. Continue from branch `codex/cloudflare-migration`; do not repeat the hosting research or navigation redesign.

**Cloudflare is deployed in maintenance mode; customer data has not moved.** The owner signed in to Cloudflare and authorised Wrangler with account/user read plus Workers deployment access. Do not repeat that authorisation. The new app is https://recallstride.breakellsystems.workers.dev, code revision `99844836957d`, Worker version `c412fd1b-2e7d-494c-abec-2f067c08cc13`. Its API returns503 and public migration routes return404. The temporary protected transfer service is deployed and reports `not_started`.

**Next required step:** the owner must finish the prepared Add SSH Public Key form in Safari/Render. Key name: `RecallStride temporary migration — 9 October 2026`; fingerprint `SHA256:z8GGZ8MnICxZjVuvz7/mlA01QUKEsJHFqBg5OYk2FPQ`. It has not been submitted. Confirmation is required by the computer-use policy for new security-sensitive access. The source has NOT been frozen; leave it writable until real access, size checks and backup are established. No production export, provider settings transfer or domain purchase has happened.

Local private state is in ignored `cloudflare-state.migration-private.json`; it records staging/key paths and remote IDs without provider values. The transfer token is in owner-only ignored `.cloudflare-migration-token`. Provider-copy helper: `/tmp/recallstride-copy-providers.mjs` (not executed), accepting `--ssh-target`, `--key-file`, `--config`; it streams an explicit allowlist from remote process.env into Wrangler stdin without printing values or reading .env. After the key is registered, read the exact SSH target in Render Connect, connect, check actual size/rows, freeze source, snapshot/export, copy providers, import/verify, update the existing Stripe webhook URL, then open Cloudflare. Revoke this temporary access and delete the transfer Worker after completion.

Render now serves https://neatnotes.onrender.com, revision `99844836957d`, after the compatible migration backend was pushed to main and auto-deployed. Health returned200 with email/Stripe configuration present and Google sign-in absent. This publishes the recoverable signup fix. It remains the writable production source on Starter with its original disk. Preserve it through cutover. The pre-migration rollback revision is `d239cfe253f766a8de5dfffa07adef59c189a699`.

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

Do not use anonymous `wrangler deploy --temporary` for production/customer records. Wrangler OAuth is complete. Once Render SSH access is established, preserve provider settings without printing secrets, deploy closed, freeze and export Render, import/verify, then switch traffic. A domain purchase or paid hosting upgrade was not authorised by the request for a free migration.

Preserve unrelated untracked historical evidence: `docs/validation/production-deployment.json`, `docs/validation/code-studio-deployment.json`, `docs/validation/navigation-redesign-deployment.json`.

The owner requires complete features with real tasks, context and behaviour. Do not substitute empty screens or describe unfinished work as “gated” or “awaiting approval”; identify the actual missing dependency. When explicitly told to deploy, deploy and confirm the live revision using concise essential checks. The owner tests features; do not add computer-use feature tests to a deployment request. Preferences are saved in `/Users/adambreakell/.codex/AGENTS.md`.

The worksheet/interpreter and later navigation overhaul were already deployed. Older documents about withholding coding tasks or a local-only rollout are historical and superseded.
