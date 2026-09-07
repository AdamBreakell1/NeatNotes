# Student relaunch checkpoint

Baseline: `96410c0`, 7 September 2026. Work branch: `codex/student-centric-relaunch`.
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
- [ ] Human academic approval and C1 objective-level editorial mapping.
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
- 119-objective coverage matrix, including all 35 C2 lettered objectives. C1 mapping remains explicitly pending; draft coverage is not complete academic coverage.
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

## Next action

Code and evidence are committed locally as `39fce97` on `codex/student-centric-relaunch`. The initial HTTPS push failed because no GitHub credential was available. GitHub CLI has since been installed from Homebrew and browser authentication requested. The GitHub connector is not connected. Render's existing Safari session is available; live health confirmed baseline `96410c0034f0`, persistent storage and configured email/Stripe on 7 September 2026. Deployment is not complete merely because it is authorised.

After authentication, compare the current remote deployment branch with the verified baseline, publish the feature branch and promote without force-pushing or discarding remote changes. Check the Render service branch and backup state, deploy the guarded release, then record the resulting commit and live checks here. Keep C2 academic approvals empty until a human review actually occurs.

Do not restart the relaunch from scratch. Review the feature-branch commit and these documents. Next authorised work is editorial C1 mapping and human review of the C2 draft bank, followed by the staged provider/device/legal checks. Validate shared-device draft retention, long-session/load limits and signup/verification return-to-task across devices before broad release. These are explicit remaining acceptance items, not claims of completion.

The user has approved deployment to the existing Render service. No Stripe objects, customer communications, DNS or content-review approvals have been changed. An unrestricted commercial relaunch remains **NO-GO pending the listed gates**, even after the guarded engineering release is deployed.
