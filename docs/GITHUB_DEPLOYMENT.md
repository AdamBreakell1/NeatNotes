# RecallStride GitHub deployment

Every push to `main` runs [the production workflow](../.github/workflows/deploy-cloudflare.yml). It installs the locked dependencies with Node.js 24, checks syntax and content, rebuilds every public app asset, and deploys the complete Worker/API to https://recallstride.breakellsystems.workers.dev. The committed Git SHA is supplied as `RELEASE_SHA`; the workflow checks the live revision and persistent database after deployment. Manual reruns through Actions are available on `main`.

## One-time credential setup

The repository `AdamBreakell1/NeatNotes` needs one Actions secret: **`CLOUDFLARE_API_TOKEN`**. Create a deployment token with **Account → Workers Scripts → Edit**, restricted to account **`7656ff3b3eaa33f5eb0e17d1b026f7f0`**, then store it under GitHub repository Settings → Secrets and variables → Actions. No zone permissions are needed for the existing `workers.dev` hostname. The account ID is public configuration in the workflow, not a credential. Wrangler's local OAuth sign-in cannot authenticate a GitHub runner. Do not store its OAuth credentials, email/password, SMTP or Stripe secrets in GitHub.

This setup is not operational until the secret is stored and an actual workflow deployment succeeds. See Cloudflare's [GitHub Actions instructions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

## Data, provider settings and maintenance

Deployments retain the existing `recallstride` Worker, `RecallStrideDatabase` class, `RECALLSTRIDE_DB` binding and named production database. The workflow refuses a missing database and checks the namespace identity before and after publishing. Do not rename the Worker, class or the `recallstride-production` object name without a planned data migration.

SMTP, Stripe and other provider secrets stay in Cloudflare. Wrangler [preserves secrets](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth), and the workflow uses `--keep-vars` to retain operational Cloudflare variables, including `BASE_URL`, `CORS_ORIGIN` and `MIGRATION_MODE`. The shared `wrangler.jsonc` also sets `keep_vars=true`, so ordinary committed deployments from Codex preserve these settings. The repository's ordinary limits/configuration and current `RELEASE_SHA` are applied on each deployment. Production email links and CORS must match the current production hostname; update the deployment script's origin when a custom domain is adopted.

`MIGRATION_MODE` is an operational variable, deliberately absent from `wrangler.jsonc`. A push during data transfer preserves its `true` value and confirms HTTP 503; after cutover, deployments preserve the active state and require HTTP 200, the correct revision, and persistent storage without a fallback. Enable/disable maintenance through the controlled production configuration only after the transfer/recovery procedure has completed.

Production runs are serialized so a newer run cannot interrupt a deployment halfway through. GitHub has read-only repository permissions and the deployment token is supplied only to the final deployment step. Failed builds or preflight checks publish nothing. A failed post-deployment check reports failure and does not automatically roll back student data. Use the migration runbook for recovery; do not reset or delete the database to fix a deployment.
