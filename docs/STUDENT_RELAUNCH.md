# Student relaunch checkpoint

## Current release: student-only and Component 2, 12 September 2026

This section supersedes the historical no-deploy and C2-lock instructions below. The user explicitly authorised commit, push and deployment to the EXISTING https://neatnotes.onrender.com/ site, and confirmed: "Component 2 content all needs to be shipped onto live as its ready."

- All eight prepared C2 packs are authorised for publication: 115 cards, 16 guided written prompts and eight applied tasks. `content-review.json.publicationAuthorizations` records the content owner's permission for each exact topic/version. Academic, C1 quiz and repair approval arrays remain empty. This is not an invented independent academic review or a full-specification-coverage claim.
- Read the C2 cards, written rubrics and applied answers; checked topic/objective mapping against the OCR H446 specification and validated stable IDs/references. Corrected the train-change graph task to retain station AND service state, with zero-cost same-service travel and one-cost transfers. All prepared C2 activities are released through the existing topic gate, while plan checks and quarantine remain enforced.
- Published component/concept metadata follows the release records; no stale academic lock in component selection. Free accounts can select one C2 deck; additional decks remain paid. C1 authored MCQs and repair drafts remain independently gated. Existing C1 recall practice remains usable.
- Retired classroom routes stay authenticated 410. Account export now includes the owner's archived classes/assignments and their own attempts/completions, without other learners' answers or join codes. Account deletion cannot cascade through owned historic classroom/centre records. Legacy paid student access and subscription pricing are preserved; account settings explains retirement and routes to Billing/Contact/export.
- Verification: 62 unit/API tests, 49 JavaScript syntax files, 42 disposable Brave browser groups; 24 topics/431 concepts and 119 objective rows. Production-mode tests deliver all C2 packs, enforce Free one-deck limits and preserve separate C1 draft gates. No browser JS errors. Responsive checks include 320/390/768/1280 widths.
- Render recovery: daily snapshot displayed 12 September 2026 at 12:56 AM, `/var/data`, 1 GB. Fresh non-destructive `VACUUM INTO` backup at `/var/data/backups/before-student-release-2026-09-12T14-46-56-146Z.sqlite`, 651264 bytes, integrity `ok`, zero foreign-key errors. Aggregate inspection found zero historic class groups/assignments. No live data was deleted, no snapshot restored, no provider configuration changed. A production restore was not performed.
- Application rollback target before this release: `2ec7b6ae0790343c65cffd889449c0c1e177ac65`. New `auth_continuations` table is additive; reverting application code does not require destroying it or replacing the database.
- Remaining caveats: independent content depth/review, real-provider email/Stripe sandbox lifecycle, manual device/screen-reader and legal/naming clearance. RecallStride is provisional on the existing domain; no domain purchase, DNS change or claim of trademark clearance. Existing account-note offline saving is not promised; local practice drafts are browser/account scoped, not cross-device sync.

Deployment commit and live evidence will be recorded after Render serves the new revision. Do not repeat the relaunch implementation or treat earlier C2 draft-only checkpoints as the current release decision.

## Previous checkpoint: released practice and resume, 12 September 2026

Branch: `codex/student-only-product`, continuing from `56db0bc`. No push, Render deployment, purchases or live provider changes. Read `STUDENT_PRACTICE_AUDIT.md` for the current journey audit and resume contract. This checkpoint supersedes the previous empty production Quick Practice flow and non-resumable repairs.

- Production C1 Quick Practice now offers short recall/reveal/self-assessment sessions using already released flashcards when authored MCQs are withheld. It includes pause, resume, a bounded finish, targeted revisit and rotation through the deck. Self-reflections do not write mastery evidence or change quiz scores/streaks. Authored MCQs, repair drafts and C2 still require genuine academic approvals.
- Recall and worked-example drafts save per account/topic on this browser. Worked steps, transfer-question variant and typed answers survive navigation/reload. Current access and content version are checked before restoration. Offline failures retain responses and offer an explicit retry, never automatic answer submission or protected-content caching. Drafts expire from resume after 30 days; guest responses are not imported.
- Today links to unfinished local practice. Active sessions collapse repeated headings/selectors; Pause restores navigation. Practice tabs have arrow/Home/End support, long prompts use sentence case, and completed daily goals avoid overrun fractions. Account deletion no longer wipes another user's browser drafts or guest notes. Remaining class-related public copy was removed.
- Verified: 61 unit/API tests, 49 JavaScript syntax checks, content validation for 24 topics/431 concepts, and 42 disposable Brave browser check groups with no JavaScript errors. The browser fixture restarts in production mode and checks that recall writes no learning evidence and C2 stays gated. Coverage includes account switching, stale lesson versions, offline load/check retries, Today resume, note edits/reload, keyboard tabs, and 320/390/768/1280 layouts. Mobile focused recall and desktop Today screenshots reviewed. `git diff --check` clean.
- Next release dependencies: real academic review/corrections and deeper coverage, trademark/confusion clearance, approved handling of retained historic subscription obligations, live-provider sandbox email/billing checks, real-device/screen-reader/student usability checks and explicit deployment permission. RecallStride remains a local provisional brand. No new aesthetic decision is required. Local-only drafts are intentionally not cross-device sync.

Local checkpoint commit subject: `Restore released quick practice and isolated draft resume`. Do not repeat GitHub setup, classroom removal or the authored-bank work. Ignored browser evidence remains under `test-results/student-relaunch/`; review packs remain under `.resource-review/` and contain no fabricated approvals.

## Previous checkpoint: learning increment, 11 September 2026

Branch: `codex/student-only-product`, continuing from `711f495`. Local implementation only: no push, Render deployment, domain purchase or live provider changes. Read `STUDENT_LEARNING_INCREMENT.md` for the current implementation and release caveats before resuming. The preceding student-only retirement is complete locally; do not repeat it.

- Fixed authenticated workspace selection and added account-bound, 24-hour return-to-task after signup, verification and login, including verification in another browser. Guest data is not imported and a free deck is not chosen automatically.
- Replaced C1 runtime distractor selection with 48 authored checks across 16 topics. Added nine progressive worked-example drafts with 18 transfer checks, addressing the eight recorded C1 gaps plus CPU address/data confusion. Guided success does not manufacture mastery evidence.
- New quizzes and repairs require independent, version-specific human approval before production release. **Production C1 Quick Practice is withheld pending review.** Existing released flashcards, written practice and labs remain available. C2 remains draft-gated; the 431-concept coverage matrix is unchanged. Do not call this full OCR coverage or an unrestricted production relaunch.
- Implemented RecallStride locally, with matching RS marks. Registrar availability was observed, not purchased; UKIPO screening encountered a security challenge. Legal/confusion clearance remains unresolved. Operational identifiers, support addresses and historic records remain unchanged.
- Verified: 57 unit/API tests, 47 JavaScript syntax checks, content validation for 24 topics/431 concepts and 36 disposable Brave browser check groups. Browser error list is empty; responsive checks cover 320/390/768/1280 widths. Review packs regenerated for both components without any approvals. Mobile repair and desktop Today screenshots reviewed; `git diff --check` clean.
- Next: human academic review and corrections, deeper objective coverage, manual naming clearance, approved retained-contract handling, actual provider/device/accessibility checks and explicit deployment permission. The repair player's step/answer does not survive reload yet; existing quiz/written/timed/adaptive resume behaviour remains intact.

Local checkpoint commit subject: `Improve student practice, account continuity and local branding`. Do not commit ignored review packs, browser artefacts, credentials or databases.

## Previous checkpoint: student-only retirement, 11 September 2026

Branch: `codex/student-only-product`, from `2903927`. The latest request explicitly prohibits push/deployment; it supersedes earlier rollout permission for this increment. Work directly in this checkout; do not repeat GitHub setup or the September 8 mapping work.

- Product direction is now student-only. Read `STUDENT_ONLY_BRIEF.md` for current competitor/academic evidence, naming/domain findings, the target loop and priorities. Earlier classroom-compatibility descriptions below are historical.
- Removed teacher navigation, mode switching, class/join-code/assignment/centre UI, demo classroom seeding, dashboard panels and their frontend data loading. Old browser mode preferences are ignored without deleting browser records. Removed teacher priority boosts from session ranking.
- Retired class/centre/assignment/workspace-dashboard routes with authenticated 410 responses across methods. No SQL tables/records were dropped, and no live data or provider configuration was changed. New classroom workspaces and class-scoped revision requests are rejected. Student resource access for legacy paid contracts survives through the existing Stripe identifiers; public accounts show the student plan rather than internal legacy labels.
- Personal deck history now includes the learner's own historic class-tagged attempts; it never includes another learner's records. Old roles and archival profile/membership records are preserved for authorised exports, not exposed as active product workflows. Existing collaborative note ownership remains unchanged.
- C2 is already structurally integrated: eight topics, 115 cards, 16 written prompts, eight applied tasks. There are **zero academic approvals**. No content was unlocked. The component notice now counts pending packs and distinguishes local drafts from publication; the review state is not labelled as a Pro purchase requirement.
- Naming: RecallStride is the provisional recommendation. Verisign `.com` RDAP returned 404/no record for `recallstride.com` at 18:12:34 UTC on 11 September; RecallCircuit and ReviseLoop `.com` names are registered. Registrar availability and trademark/confusion checks are incomplete, so no brand replacement or purchase occurred.
- Final verification: 49 unit/API tests passed; 42 JavaScript syntax checks passed; content validation passed for 24 topics/431 concepts; 33 disposable Brave browser check groups passed, including obsolete-mode preferences, no retired API calls, account login, paywalls, C2 local preview, resume and 320/390/768/1280 layouts. Browser JavaScript error list is empty and `git diff --check` is clean. Desktop/mobile Today screenshots were visually reviewed. Restore coverage now confirms startup leaves historical class join codes and owned attempts unchanged.
- Remaining decisions: naming clearance/selection; real human C2 academic review; approved retained-contract/export handling before deploying the retired endpoints. Continue with reviewed C1 distractors/content gaps and the signup-return/repair-loop priorities; do not claim the full relaunch, rebrand or commercial readiness is complete.

The local retirement is a deliberate breaking API change, not a production migration. Dormant schema and unused legacy styles remain; archival export helpers still support access to retained records. None restore the retired routes. Never delete production data to make the repository appear new.

Checkpoint commit: `Refocus the product on personal student revision`, on `codex/student-only-product`. Local only; no push or Render deployment. Resume with the P1 content and return-to-task items in `STUDENT_ONLY_BRIEF.md`, not another classroom-removal pass. No credentials, runtime databases or ignored browser artefacts belong in the commit.

## Historical release records

Baseline: `96410c0`, 7 September 2026. Work branch: `codex/student-centric-relaunch`; promoted to `main` with explicit user approval.
The original brief did not authorise deployment. On 7 September 2026 the user explicitly requested deployment to the existing Render service. This authorises the guarded application release, not publication of unreviewed content, live financial transactions, destructive data operations or unrelated provider changes.

## Inventory and decisions

| Surface | Decision | Acceptance |
| --- | --- | --- |
| Express, SQLite, auth, user-owned notes | Keep | Existing IDs, sessions and data remain compatible |
| Adaptive session / flashcards | Repair and simplify | Preview is ordered queue; due cards repeat; completion is session-specific |
| Written-answer keyword marks | Retire as scoring | Guided rubric review, no automated semantic score or strong mastery evidence |
| SQL token checker | Replace | Constrained synthetic evaluation rejects malformed and wrong queries |
| Curriculum files | Extend | C1 IDs unchanged, C2 component metadata and objective review matrix |
| Today / Revise / Practice / Progress / Notes | Simplify | Clear main action, accessible account and component selectors |
| Teacher tables, memberships, entitlements | Legacy support | No deletion, no ownership changes, existing paid access retained |
| New Teacher / Institution sales | Retire | Public Free/Pro offering; teacher price not required for readiness |
| Service worker, API cache | Review | No account data in shared offline cache |
| Billing and email integrations | Preserve and test locally | No live charges/provider mutations; external validation remains a gate |
| Brand | Prepare | Neat Notes retained until naming approved |

## Execution checklist

- [x] 1. Reproduced defects and implemented regression coverage for queues, truthful feedback and constrained SQL.
- [x] 2. Focused student navigation/retrieval, progressive disclosure, practice resume and account-scoped history.
- [x] 3. Component 2 extraction, original drafts, review pipeline and objective-level matrix implemented.
- [x] 4. Public Free/Pro contract and legacy compatibility implemented; local billing state tests added.
- [x] 5. Research, operational runbooks and automated desktop/mobile QA documented.
- [x] C1 objective-level editorial mapping and repeatable human-review pack generation (8 September increment).
- [ ] Human academic approval, missing objective content and dedicated C1 quiz distractor review.
- [ ] Real provider Sandbox/email, real-device/screen-reader, legal and approved rollout checks.

## Release gates

Human academic review of new content; legal/under-18 review; verified email delivery; Stripe Sandbox lifecycle and reconciliation; approved production-like backup rehearsal; manual real-device/screen-reader checks; explicit approval to deploy. A configured health response does not satisfy these gates. The isolated synthetic restore is now tested.

## Evidence

Initial audit verified against current checkout: global lifetime completion filters the adaptive queue; written-answer marking uses keyword matching; SQL correctness uses token inclusion. Baseline tests cover neither negative semantic answers nor malformed SQL.

## Working checkpoint

Implemented and locally verified; guarded Render deployment authorised:

- Session-specific ordered retrieval queues, preview-to-delivery consistency, reload state and retry-safe flashcard receipts.
- Guided written rubric review replaces keyword marks. Historic unreliable marks are excluded from current evidence and schedule projections without destroying records.
- SQL evaluation is constrained to a synthetic in-memory exercise; malformed/adversarial/wrong queries are rejected.
- Extracted 58 teaching resources without publishing originals. Eight C2 packs: 115 original cards, 16 written prompts and eight applied checks. All remain academic-review pending. Total: 24 topics, 431 cards, 32 written questions, 16 fixed applied tasks.
- 119-objective coverage matrix, including all 35 C2 lettered objectives. The 8 September increment completes explicit C1 editorial mapping; draft coverage is not complete academic coverage.
- Today/Revise/Practice/Progress/Notes, component/topic selection, one-card retrieval, bounded quizzes, saved written/timed drafts, editable generated-card drafts and universal account menu.
- Account-owned server history and scoped local learning caches prevent cross-account/demo contamination. Unowned legacy browser data remains untouched but is not silently imported.
- Free/Pro sales only; legacy Teacher/Institution contracts/data retained. Annual checkout disabled. Webhook deduplication, concurrent delivery and latest-state reconciliation tested locally.
- Updated transitive `qs` to 6.16.0; audit reports zero vulnerabilities at the time of this check. No new application dependency was added.

## Verification record

- Node 24.19.0 and local Node 26.3.0 used for compatibility checks.
- Final Node 24.19.0 run: **42/42 unit/API tests passed**, covering auth, expiry/recovery, ownership, downgrade/export, production draft gating, billing event processing and isolated restore.
- 32 browser assertions/check groups on disposable headless Brave: guest and verified accounts, Pro editorial preview, quiz/written/timed resume, adaptive preview through completion, account access, light/dark and widths 320/390/768/1280. Zero JavaScript errors in the recorded browser run.
- `npm run check`: all 37 repository JavaScript files checked; content validation: 24 topics/431 concepts; matrix: 119 rows.
- Browser evidence is local under ignored `test-results/student-relaunch/`: `today-390.png`, `today-1280.png`, `component2-desktop.png`, `retrieve-*.png`, `settings-*.png`, `quick-practice-desktop.png`, `written-review-desktop.png` and `results.json`. Reproduce with `scripts/browser-smoke.cjs`.
- Before: supplied audit at baseline `96410c0` and its screenshots. After: compact Today primary action with optional preview/tools; focused retrieval; catalogue hidden in active quizzes; accessible account menu; current Component 2 selection.

## Handoff documents

- `H446_COVERAGE.md` and `OCR_CONTENT_MODEL.md`: content totals, gaps, provenance, versioned academic release and quarantine.
- `AI_MARKING.md` and `LEARNING_MODEL.md`: truthful feedback and evidence vocabulary.
- `STUDENT_COMMERCIAL_CONTRACT.md`: Free/Pro features, billing limits, legacy migration and reversible brand options.
- `STUDENT_RELAUNCH_RESEARCH.md`: sources, design reasoning, under-18 legal questions and proposed pilot.
- `STUDENT_RELEASE_RUNBOOK.md`: staged verification, approvals, rollout and rollback.

## Deployment record

- GitHub CLI authenticated as `AdamBreakell1`; Git credential integration configured. Authentication blocker resolved. No token is recorded in the repository or this document.
- Published the feature branch, verified remote `main` remained at the baseline, then fast-forwarded and pushed `main` without force. Application release: `0d7cb8f4afd221dcb3d184effe565af1e78843da` (engineering changes in `39fce97`).
- Existing Render service: `srv-d93qpma8qa3s73b9k7jg`, linked to `AdamBreakell1/NeatNotes` / `main`. Deployment `dep-dafhfjss728c738va7j0` automatically started on 7 September 2026 at 21:00:15 BST and reported **Deploy succeeded | Live** after 1m02s.
- Live URL: https://neatnotes.onrender.com/. Health verified release `0d7cb8f4afd2`, persistent database with no fallback, 24 seeded decks, email and Stripe configured. Google remains unconfigured. These configuration flags do not prove real provider delivery or payment lifecycle checks.
- Daily Render disk snapshot verified for 7 September 2026 at 01:06 (dashboard display), mount `/var/data`, size 1 GB. A fresh manual backup was attempted through Web Shell, but the shell did not establish a working session; no fresh backup or production restore is claimed. No snapshot restore or destructive database action was performed.
- Live `app.js`, `student-layout.css`, `revision-session.js` and `service-worker.js` match the local release byte-for-byte. Catalogue has 24 metadata entries; all eight C2 packs have no delivered cards and `contentAvailable: false`. Guest access contains exactly one released deck; catalogue is private/no-store.
- Logged-out revision/deck, exam, labs and history API requests return 401. Public C1 topic returns 200; draft C2 topic returns 404 and is excluded from sitemap. `/component-two.js` returns the HTML app-shell fallback, not the raw draft module (its HTTP 200 must not be misreported as content exposure or as a 404).
- Browser checked Today/Revise, answer hidden before reveal, reveal/rating controls and the C2 academic-review screen on the deployed site. No real accounts, charges or customer emails were created for these checks.
- This documentation-only checkpoint uses `[skip render]`, as supported by https://render.com/docs/deploys#skipping-an-auto-deploy, to avoid another application restart. The deployed application SHA can therefore differ from the latest documentation commit on `main`.

## Next action

Deployment is complete; do not repeat GitHub setup or redeploy the baseline. Keep C2 academic approvals empty until a human review actually occurs.

Do not restart the relaunch from scratch or repeat C1 mapping. Next content work is dedicated, plausible C1 distractors and original draft material addressing the recorded gaps, followed by human academic review of both banks. Use the generated review packs; keep C2 approvals empty until real review occurs. Validate shared-device draft retention, long-session/load limits and signup/verification return-to-task across devices, then the staged provider/device/legal checks before broad release. These are explicit remaining acceptance items, not claims of completion.

The user has approved deployment to the existing Render service. No Stripe objects, customer communications, DNS or content-review approvals have been changed. An unrestricted commercial relaunch remains **NO-GO pending the listed gates**, even after the guarded engineering release is deployed.

## 8 September implementation increment

- Work branch: `codex/curriculum-review-tools`, starting from `015f243` on main. Scope: content metadata, editorial reporting and review tooling; no visual redesign, new paywall rules or database migration.
- All 316 C1 cards retain their IDs and content. Explicit links cover 76/84 objective rows; 10 supplementary cards do not count as direct objective evidence. Eight gaps remain: RAM/ROM, utilities, writing/following algorithms, positive binary representation, positive hexadecimal representation, actual base conversions, floating-point arithmetic and contextual Boolean modelling. Additional partial-depth gaps are recorded per objective.
- Review packs generated for all 24 topics under ignored `.resource-review/review-packs/`, including answers, authored choices, rubrics, applied tasks, fingerprints and blank review records. No fabricated approvals and no C2 unlocking.
- Confirmed legacy C1 MCQ distractors are chosen from other card answers at runtime. This increment documents that quality gap; it does not claim to fix it. C2 choices are authored but still require academic review.
- Verification: Node 24 unit/API suite 49/49, JavaScript syntax checks 42 files, content validation 24 topics/431 concepts and generated coverage 119 rows. All 32 browser assertion groups passed, including responsive widths 320/390/768/1280, account/paywall state, practice resume and adaptive session completion. No browser JavaScript errors.
- Published `2ec7b6ae0790343c65cffd889449c0c1e177ac65` to the work branch and fast-forwarded/pushed `main`. Render health confirmed release `2ec7b6ae0790` at 2026-09-08 07:41:46 UTC (08:41:46 BST), with persistent database, no fallback and 24 decks. No database migration, provider configuration, customer email or charge was performed.
- Read-only live verification: 24 catalogue topics, all eight C2 packs withheld with no cards, exactly one guest deck delivering cards, private/no-store catalogue; logged-out deck/exam/lab/history endpoints return 401; public C2 topic returns 404 and C1 topic returns 200. Existing email/Stripe configuration flags remain true; this is not a real delivery or payment lifecycle test. This documentation follow-up uses `[skip render]` to avoid a redundant restart.
