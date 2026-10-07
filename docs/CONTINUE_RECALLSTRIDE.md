# Continue RecallStride from this checkpoint

**Latest instruction, 7 October:** the user then requested “deploy it”, authorising the guarded rollout to the existing Render service. Read [DEPLOYMENT_2026_10_07.md](DEPLOYMENT_2026_10_07.md) for the actual application commit, serving evidence and rollback revision. The uncommitted/local-only statements below describe the earlier checkpoint and are superseded for this deployment only. Provider checks and genuine review approvals remain pending; do not unlock the coding drafts.

Saved 7 October 2026. Workspace `/Users/adambreakell/Desktop/Notes App`; branch `main`; base `3f8b02e14881ca3ccacdd04f3d0b5b69c5b7d01d`. The commercial/pseudocode increment is **local and uncommitted**. Read [RELEASE_REPORT.md](RELEASE_REPORT.md) first, then [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md). Earlier relaunch/deployment permission is historical. The current brief forbids production deployment/provider changes, real-data testing and publication of unreviewed banks. The user explicitly selected **provider checks pending**; do not ask for credentials or retry production checks.

## What is complete

Bounded engine/editor/Run/Stop/check/trace/guidance; eight versioned original draft tasks; truthful unscored feedback; transfer/revisit; account-isolated drafts/resume/offline retries; metadata export/delete/access boundaries; consent-controlled enum pilot measurement; sales-copy consistency; local policy drafts; human-review packets; pilot/operations/cost worksheets. The missing release report and this handoff are now saved. Nothing is deployed; no review approval is fabricated.

Latest verification: **85 unit/API tests, 64 syntax files, 24 topics/474 concepts, 44 existing browser groups, 29 coding browser groups all pass**. JS errors/source-marker payload leaks: zero in tested journeys. Small development benchmark: 17 correct alternatives, 17 seeded faults, 0 false positives/negatives within that unreviewed corpus. Durable results: `docs/validation/`; screenshots: `docs/pseudocode/evidence/`. All test servers and temporary fixture databases are cleaned up after completion.

## Next action

Arrange independent review using `docs/pseudocode/review/` and the existing C1/C2 packs. Obtain actual owner/legal decisions using `POLICY_REVIEW.md`; complete approved provider/device checks only when the required environment/approval is supplied. Then run the controlled pilot from `PILOT_PLAN.md`. These external actions remain pending, not silently completed. Do not repeat branding selection, classroom retirement, C2 migrations or another visual redesign. Do not unlock coding tasks by adding invented entries to `pseudocode-review.json` (currently `[]`). Do not re-lock existing owner-authorised C2 publication.

## Safe repeatable validation

Run from the workspace with Node 24+ (current local Node v26.3.0). The tests create their own disposable fixture DBs and bypass dotenv/provider configuration. These commands do not read the runtime application database.

```sh
npm test
npm run check
npm run validate:content
npm run benchmark:coding
npm run benchmark:storage
npm run review:coding
git diff --check
```

Local Playwright/Brave paths used for both browser suites:

```sh
NEAT_PLAYWRIGHT_PATH='/Users/adambreakell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright' \
NEAT_BROWSER_EXECUTABLE='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' \
npm run test:browser

NEAT_PLAYWRIGHT_PATH='/Users/adambreakell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright' \
NEAT_BROWSER_EXECUTABLE='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' \
npm run test:coding-browser
```

Browser outputs are ignored under `test-results/`; checked-in validation/screenshot evidence is the 7 October snapshot. If code changes, rerun the affected journeys and refresh the snapshot before claiming new results. The local preview flag is `RECALLSTRIDE_CODING_PREVIEW=true` outside production only; use isolated fixtures, not the default `data/` database or `.env`. No new npm package is required.

## Files to review

Frontend: `pseudocode-engine.js`, `pseudocode-worker.js`, `pseudocode-drafts.js`, `pseudocode-practice.js`, `pseudocode.css`, `policy-content.js`, plus integration in `app.js`, `index.html` and `service-worker.js`. Backend: `backend/services/pseudocodeTasks.js`, `pseudocodePractice.js`, `pilotTelemetry.js`, auth continuation and `server.js`. Tests/scripts and review/contract documents are linked from the release report. Inspect `git status --short`: new files are still untracked and must be included in any later authorised review/commit. Preserve the working tree; no stash/reset/deletion is needed.
