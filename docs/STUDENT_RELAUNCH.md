# Student relaunch checkpoint

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
- Publication state for this increment must be recorded after push/deployment verification; the earlier deployment record is not proof that these new changes are live.
