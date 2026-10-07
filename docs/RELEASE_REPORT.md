# RecallStride local release report

**Subsequent deployment authorisation, 7 October:** the user requested “deploy it”. [DEPLOYMENT_2026_10_07.md](DEPLOYMENT_2026_10_07.md) records the guarded rollout and actual serving evidence. The local-only statements below describe the preceding completed validation checkpoint. Coding drafts and academic/legal/provider gates remain pending; deployment is not approval of those gates.

7 October 2026. This completes the authorised local implementation and preparation from the 13 September brief. **The full commercial-readiness programme is not complete:** independent academic review, owner/legal policy decisions, provider rehearsal and real-device/screen-reader checks remain open. Provider checks are explicitly pending by the user's decision. No production deployment, push, charges/refunds, provider edits, recruitment, domains or real-data changes occurred.

Workspace: `/Users/adambreakell/Desktop/Notes App`, branch `main`, base `3f8b02e14881ca3ccacdd04f3d0b5b69c5b7d01d`. Changes are local and uncommitted; there is no new deployed revision. [CONTINUE_RECALLSTRIDE.md](CONTINUE_RECALLSTRIDE.md) is the entry point for the next session. Historical deployment permissions do not authorise this increment.

## Implemented and demonstrated

Pricing, the featured offer, FAQ, public Component 2 labels and current documentation now agree: existing C1/C2 packs are published under owner permission, with independent academic review pending. Separate new draft activities remain withheld. Marketing uses retrieval progress/self-review rather than unsupported mastery/marking claims. Free/Pro pricing, account IDs, data, billing mappings and existing learning journeys are preserved.

Practice → Pseudocode contains a complete local loop: task and prediction, labelled native editor with highlighting/line numbers/plain mode/undo/indent, bounded worker Run/Stop, non-blocking input fixtures, escaped output, inline/error-list diagnostics, bounded trace inspection, public functional checks, an unscored rubric, progressive clues, deliberate solution reveal, fresh transfer task and a three-day revisit suggestion. Independent mode gates runs/clues/solutions until the first check and records later assistance. It cannot certify unaided work.

Source, fixtures, predictions and rubric drafts stay in account-scoped browser storage. Latest task/source resume after reload; edits invalidate results; stale versions stay blocked even after editing an empty draft. Withdrawal/offline errors preserve recoverable work. Attempt metadata retries keep the exact identity, and server validation rejects source, marks, trusted/mastery claims and extra fields. Sign-out/account changes clear the local editor and notify other tabs. Account export/deletion includes coding metadata and pilot events; the browser export additionally includes local drafts.

Eight original tasks are versioned `2026-10-07.1`, with objective mapping, rationale, examples, 45 public cases, 17 alternative solutions, 17 seeded faulty variants, three-stage clues, rubric, misconceptions, provenance and exact review hashes. **All eight are drafts.** `pseudocode-review.json` remains empty. Explicit `RECALLSTRIDE_CODING_PREVIEW=true` works only outside production; authentication, academic release and existing selected-deck/Pro access are enforced server-side. Free accounts choosing 2.2.1 Programming techniques get seven draft tasks in local preview; the search task belongs to 2.3.1. Pro extends catalogue access, not feedback quality.

The original interpreter follows lexer → parser → AST → bounded evaluation, with no eval/generated host execution. `rs-h446-1.0.0` supports scalar expressions/I/O, selection/loops, strings, one-dimensional arrays and local by-value routines. Recursion, byRef, files, OOP, multi-dimensional arrays and other deferred constructs are explicitly unsupported. It has source/token/depth/work/wall/allocation/call/input/output caps, a disposable worker and parent watchdog. It exposes no host, network, DOM, database or credential operations. Exact syntax and local conventions are in [SOURCES_AND_CONTRACT.md](pseudocode/SOURCES_AND_CONTRACT.md); architecture and future trusted-execution requirements are in [ARCHITECTURE.md](pseudocode/ARCHITECTURE.md).

Expanded Privacy, Billing, Cookies, Terms and Data Protection pages are visibly **local drafts**, supported by a code-facts/legal-review worksheet. No legal identity, refund window or approval was invented. Policy dialogs now manage focus and keyboard containment. Opt-in pilot events accept only enums/IDs and never source/answers/personal text; authenticated admin aggregates distinguish observed completion, return dates and repeated weeks. They cannot infer unprompted return or willingness to pay. No LLM is used for deterministic execution or feedback; these records do not update verified mastery or protected entitlements.

## Validation, 7 October 2026

All tests use temporary synthetic databases/accounts. Browser fixtures bypass `.env`, blank provider credentials and clean up their database/server. No live customer fixtures or provider transactions were used.

| Check | Exact result | Evidence and limit |
| --- | --- | --- |
| `npm test` | 85 passed, 0 failed, 0 skipped | [Summary](validation/summary.json). Includes existing auth/recovery/billing-state/restore regressions and new runtime/access/trust/data tests. Mocks are not provider evidence. |
| `npm run check` | 64 JavaScript files passed | Syntax only. |
| `npm run validate:content` | 24 topics / 474 concepts valid | Stable references/schema; not sufficient-depth or academic certification. Existing inventory remains 32 written prompts / 16 applied tasks. |
| `npm run test:browser` | 44 groups passed, 0 JS errors | [Existing journeys](validation/existing-browser.json): demo, hidden answers, resume/accounts/notes, C1 fallback, authorised C2, responsive layouts and public-shell cache boundary. |
| `npm run test:coding-browser` | 29 groups passed, 0 JS errors, 0 source-marker API leaks | [Coding journeys](validation/coding-browser.json): run/check/debug, Stop/restart, offline/retry, transfer/resume, stale/withdrawal, keyboard, account isolation/export, policy focus, analytics opt-out, four widths and themes. |
| `npm run benchmark:coding` | 8 tasks / 45 cases; 17 correct alternatives accepted; 17 faults detected; 0 false negatives / 0 false positives in this corpus | [Benchmark](pseudocode/benchmark.json). Development-authored and internally checked; independently unreviewed. Finite public cases can be deliberately hard-coded. These are not general accuracy rates or numerical marks. |
| `npm run review:coding` | 8 exact-version review packets generated | [Review manifest](pseudocode/review/manifest.json). All decisions pending; no approval written. |
| Existing content packs | 16 C1 / 8 C2 editorial packets generated | Ignored `.resource-review/review-packs/`; reviewer fields pending. |
| `npm run benchmark:storage` | 1,200 attempts + 3,000 events; incremental 1,683,456 bytes | [Synthetic measurement](operational-storage-benchmark.json). Checkpointed SQLite page growth, not production load/cost. |
| `git diff --check` | Passed | Whitespace/patch hygiene. No new dependencies or lockfile change. |

Browser evidence uses Playwright/headless Brave on macOS and Node v26.3.0. Layouts: 320 / 390 / 768 / 1440 widths. Coding text/highlight checks meet 4.5:1 in light/dark themes for the inspected selectors. 200% CSS zoom reflow passes; this is not actual browser-zoom/assistive-technology certification. Infinite empty loops exhaust work; mocked elapsed time verifies wall limits independently; copied arrays/string/variable budgets are tested. The Stop browser fixture delays worker message delivery by 500ms to make cancellation deterministic, then verifies fresh execution. Production-mode API tests show an empty coding catalogue even if the preview flag is set.

## Visual evidence

Screenshots contain synthetic accounts/work only, and have been visually inspected. The before image is the earlier local landing page captured before the coding feature, **after** the initial pricing-copy edit; it is not evidence of the original contradictory live price copy. Coding did not exist before this increment. After images demonstrate the revised editor/feedback in the existing design system, not a new site redesign.

| Evidence | File |
| --- | --- |
| Before coding: existing landing | [Before](pseudocode/evidence/before-coding-landing.png) |
| After: desktop editor, Run/output | [Desktop](pseudocode/evidence/desktop-editor.png) |
| After: dark desktop | [Dark](pseudocode/evidence/desktop-dark-editor.png) |
| After: public checks/rubric/transfer | [Feedback](pseudocode/evidence/desktop-feedback.png) |
| After: 390px editor and Run controls | [Phone-width browser](pseudocode/evidence/mobile-editor.png) |

## Remaining gates and decision

**GO for local editorial review and synthetic demonstration. NO-GO for unrestricted public coding release or a commercially certified relaunch.** No reviewed coding bank or pilot outcomes are claimed.

1. Independent H446 content/benchmark review and corrections, exact-version approvals and coverage-depth work. Use the [review packets](pseudocode/review/README.md) and priority process in [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md). Published existing banks remain academically unreviewed; generated mapping is not approval.
2. Owner/legal confirmation of controller identity/address, provider agreements/regions, retention/backup erasure, under-18 handling, consumer cancellation/refunds, support ownership and naming clearance. Use [POLICY_REVIEW.md](POLICY_REVIEW.md). Keep the local draft notice.
3. Approved test-environment email/Stripe lifecycle checks, actual portal cancellation, webhook reconciliation and staged restore. **Pending by user instruction.** Use [OPERATIONAL_VALIDATION.md](OPERATIONAL_VALIDATION.md); never equate synthetic/configuration checks with delivered mail or settlement.
4. Real iOS/Android keyboards, VoiceOver/NVDA, forced colours, actual 200%/400% browser zoom and student usability. Automated DOM/width/contrast assertions support this review but cannot replace it.
5. Approved four-week 20–30-student pilot and actual evidence for unprompted return, repeated weekly use, confusion, willingness to pay and support minutes. [PILOT_PLAN.md](PILOT_PLAN.md) supplies the plan and measurement definitions. No recruitment, ad spend, purchases or conversion evidence exists.

Trusted server assessment is deliberately deferred. Browser outcomes stay untrusted and unscored. A future assessed/hidden-test service needs separate approved OS-isolated execution, reviewed methods/benchmark, quotas, abuse controls and measured costs; do not execute source inside Express or against its SQLite connection. Interactive stepping is also deferred: the current feature inspects a bounded after-statement trace.

## Future promotion and rollback

Obtain explicit approval only after the concrete reviewed increment and required gates are ready. Review the complete working tree including untracked source, docs and evidence; do not commit credentials, runtime databases or ignored scratch artefacts. Record the resulting commit, previous deployed application revision and release manifest. Stage first with existing pricing/provider objects preserved and the reviewed coding release records. Verify auth/deck/coding/export/deletion, old-account compatibility, shell-cache update, monitoring and support/incident ownership before separately authorised production promotion.

Schema changes are additive: `coding_practice_attempts` and `pilot_events`, with user foreign keys, indexes and 30-day cleanup. No existing IDs/data migration. A prior application can ignore these tables; rehearse that application rollback against the updated staging database. Clear superseded public-shell caches through the versioned service worker. On account/access/privacy/correctness/provider failure, stop promotion and revert the application to the recorded reviewed revision; keep newer account/notes/billing data. Database restore is a separate approved incident operation requiring a fresh snapshot and reconciliation, never an automatic overwrite with a stale backup. Preserve content quarantines and verify that a rollback cannot expose draft raw assets or resurrect automatic marks.
