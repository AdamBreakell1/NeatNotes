# RecallStride guarded deployment, 7 October 2026

The user explicitly requested **“deploy it”** after reviewing the local release summary. This authorises commit/push and deployment of this increment to the existing `https://neatnotes.onrender.com` service. It supersedes this increment's earlier local-only restriction. It does not constitute academic/legal approval, permit publication of the eight unreviewed coding tasks, or authorise financial/provider changes or customer communications. Provider checks remain pending by the prior explicit decision.

## Before deployment

The live health response at `2026-10-07T11:36:55.630Z` reports release `3f8b02e14881`, persistent database, no fallback, 24 decks and configured email/Stripe flags. The full rollback application revision is `3f8b02e14881ca3ccacdd04f3d0b5b69c5b7d01d`; local HEAD and fetched `origin/main` match it. Configuration flags are not email/payment lifecycle verification.

Deploy through the existing GitHub `AdamBreakell1/NeatNotes` → Render `main` connection. No new service, environment/provider edits or paid infrastructure. Changes are additive; existing accounts/notes/billing data remain. Coding reviews remain empty and the preview flag cannot override the production gate. Policy text remains visibly a draft.

The computer-use tool refused Safari access, so no dashboard inspection or fresh production backup is claimed. The historical backup/snapshot evidence remains historical. No production database contents or credentials were read, no restore was attempted, and the app rollback must preserve current data rather than overwrite it with an older database.

## Deployment evidence

Application commit: pending. Push: pending. Serving revision and post-deploy checks: pending. Update this record after the health endpoint and delivered assets demonstrate the actual release. Public read-only checks must not create accounts, send support/email messages or initiate checkout/provider operations.

## Rollback

Use the recorded previous application revision if a release regression requires rollback; retain additive `coding_practice_attempts`/`pilot_events` tables. Rehearse/verify old application compatibility and draft raw-asset restrictions. Do not restore a stale database, remove newer notes/billing records or manufacture review approvals. Provider, independent content/legal review, real-device accessibility and pilot outcome gates remain open after deployment.
