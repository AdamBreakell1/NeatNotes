# Student practice and journey audit

11 September 2026. Local continuation from `56db0bc` on `codex/student-only-product`. No purchases, push, deployment or provider changes. This supersedes the earlier checkpoint's empty production Quick Practice flow and non-resumable worked examples.

## Released practice without unreviewed questions

Quick Practice uses authored MCQs only when the server supplies released questions. For a released topic without MCQs, it offers a bounded 5/10/20-question recall session using existing released flashcards. The learner recalls an answer, optionally writes it, reveals the explanation, then selects "Needs another look" or "I recalled the key ideas". A summary identifies questions to revisit. Subsequent sessions rotate through the deck rather than always starting with the same cards.

Self-assessment is explicitly labelled. It does not update quiz scores, correct-answer streaks, badges, schedules or mastery evidence. The production browser test confirms the learning-evidence row count does not change. Existing flashcard IDs, MCQ scores/history and server entitlements are unchanged. Draft MCQs, worked examples and C2 remain behind their independent academic review gates. No approval was fabricated.

## Resume contract

- Practice drafts are scoped to the signed-in account and topic on this browser. Guest responses are memory-only and are not transferred at signup. No cross-device sync is claimed.
- Recall saves question IDs, a content checksum, position, current response, reveal state and self-ratings. It resumes only against the currently served cards. Changed/withdrawn cards invalidate the draft. No answer key or full lesson is saved in the draft.
- Worked examples save lesson ID/version, step, transfer-question variant, response and whether feedback was previously requested. Reopening first fetches the authorised lesson catalogue. A changed version or withdrawn lesson cannot restore the old step/answer into different content.
- Previous feedback is not trusted from browser storage. After reload, the saved response is shown and the learner checks it again against the server. This check creates no mastery evidence. The second transfer question resumes as the second question, not the first.
- Navigation away/back retains the current state. Reload can resume via Quick Practice or Today > More study tools > Resume saved practice. Completed self-assessment sessions are not advertised as unfinished.
- Offline interruptions keep typed drafts. Checking an answer or loading/reopening an example requires a connection, with explicit retry messaging. No protected resource is added to the shared service-worker cache and no answer is silently submitted on reconnect. A session already loaded can retain its in-memory content; reload needs the current server response to restore protected content.
- Drafts become ineligible after 30 days without an update and are removed on the next read. Storage denial/quota errors do not crash the draft player; the save status explains that the page must remain open.
- Account deletion now removes only that account's browser learning records and drafts. It no longer calls `localStorage.clear()`, which would remove unrelated guest notes and other users' local drafts. Shared preferences remain, with the deleted account's avatar preference removed.

## Journey audit

| Journey | Evidence and outcome |
| --- | --- |
| Visitor and demo | Visible RecallStride brand, no teacher navigation/class workflow, single-card demo with reveal before rating. Browser assertions cover visible branding and absence of teacher controls. |
| Signup and verification | Existing cross-browser verification test passes; only the owning account resumes the intended topic/mode, with no automatic free-deck claim. |
| Signed-in identity | Account profile replaces Login. Same-browser switching between two accounts cannot restore the other account's repair draft. |
| Recommended task | Today retains a clear bounded session. An existing secondary Continue area now links to the latest unfinished local practice draft. Completed goal display no longer shows confusing fractions such as 12/10. |
| Quick Practice | Actual production-mode fixture runs released recall with no draft MCQs. Pause, reload, summary and targeted revisit work. Pending C2 still has no start action. |
| Mistake repair | Progressive steps, changed transfer question, saved response, offline load/check retries and stale-version feedback are exercised. Guided answers remain separate from mastery. |
| Notes | Browser creates an account-owned note, edits it and verifies its content after reload. Existing API ownership, limits, export and restore tests remain passing. |
| Returning progress | Existing ordered adaptive-session, timed/written/quiz resume and account-owned evidence tests remain passing. New local drafts add return-to-task without importing guest or other-user answers. |
| Upgrade boundaries | Existing Free/Pro, retired endpoints, legacy paid access and production draft-denial tests remain passing. A subscription cannot publish academic drafts. Real Stripe lifecycle testing remains external. |
| Layout and interaction | Active Quick Practice collapses repeated curriculum/marketing headings while keeping practice-mode navigation and a Pause/Back action. Pausing restores topic selection. Mobile controls wrap; answer prompts no longer inherit all-caps styling. |
| Keyboard | Practice tabs now support arrows/Home/End with a roving tab stop. Players use labelled forms, semantic buttons, visible focus, status messages and focus movement after reveal/advance. This is not a completed assistive-technology audit. |
| Contact/legal copy | Residual class-space/class-feature copy was corrected. Browser draft handling is described factually. No claim of legal approval or verified live email delivery. |

The layout applies the existing brief's retrieval, feedback, worked-example and progressive-disclosure rationale. It preserves the restrained teal identity and existing typeface rather than adding a parallel design system or dependencies. Automated visual checks are not evidence of improved learning outcomes or conversion.

## Verification

Final counts are recorded in `STUDENT_RELAUNCH.md`. The suite includes a disposable server restart into `NODE_ENV=production`; it does not weaken review gates or mutate production data. Browser artefacts are ignored under `test-results/student-relaunch/`. Account deletion scope, malformed/expired draft validation, content changes and storage failure are covered by unit tests.

## Remaining external dependencies

Real academic review and deeper objective coverage for drafted content; trademark/confusion clearance for RecallStride; approved handling of retained historic subscription obligations before retiring live endpoints; live-provider sandbox email/billing tests; real-device/screen-reader and student usability work; and explicit deployment permission. No additional aesthetic decision is needed for the local implementation. These are not solved by publishing drafts or by granting Pro access.
