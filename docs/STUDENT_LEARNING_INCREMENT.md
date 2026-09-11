# Student learning increment

11 September 2026. Continuation from local commit `711f495` on `codex/student-only-product`. No push, deployment, domain purchase or live provider change.

## Implemented

- **Account return path:** signup stores a validated, account-bound section/topic/practice-mode destination for 24 hours. Verification in another browser still returns that account to the intended context after login. No redirect URL, guest answer, guest note or payment choice is stored. Acknowledgement clears it. Free-deck selection and paywalls remain explicit.
- **Login repair:** account loading now chooses a workspace present in the authenticated workspace list, not an obsolete guest workspace ID. This was reproduced by the new cross-browser test. Completing optional onboarding preserves the current task unless the learner explicitly chooses a diagnostic.
- **Authored C1 quizzes:** 48 original checks, three per topic across all 16 C1 decks. Options express specific confusions; explanation text distinguishes them. Removed runtime selection of unrelated card answers and the heuristic that altered answer text. Existing flashcards and their stable IDs remain unchanged.
- **Worked examples:** nine three-step drafts, with 18 related short-answer checks. These address the eight recorded C1 objective gaps plus a CPU address/data repair. A learner can open worked examples from Quick Practice or after an incorrect answer, read one step at a time, attempt a related question, see the correction and try a different question. Guided correctness does not increment a quiz score/streak or create validated mastery evidence.
- **Review safeguards:** C1 authored quizzes and repairs have independent version-specific approval lists. They are usable in local editorial preview but withheld in production until actual review. Review packs now include all authored options, corrections, worked steps and transfer checks in their fingerprints. Quarantine overrides repair release. No human approvals were recorded.
- **Local rebrand:** RecallStride replaces Neat Notes across the UI, account emails, public-topic pages, web manifest and favicon, with matching RS marks. BreakellSystems ownership and the restrained teal identity remain. Cookie names, local-storage keys, database/content/customer IDs, Stripe prices, support inbox and deployment host are unchanged. Historical content provenance retains its original authoring label.

## Deliberate product trade-offs

The earlier C1 quiz generator offered nominally 316 derived questions, but did not provide academically useful incorrect options. There are now 48 authored drafts, not 316 reviewed MCQs. Until these drafts are reviewed, **production C1 Quick Practice is withheld**, with a clear academic-review message rather than a payment prompt. Existing released C1 flashcards, written practice and labs remain usable. Do not deploy this branch as an unrestricted relaunch before resolving that content gate.

The eight C1 objective gaps are addressed with initial worked-example drafts, not declared complete. Binary floating-point examples cover exact positive arithmetic; they do not cover signed arithmetic, finite-precision rounding or the full objective depth. Utility/device scenarios and algorithm traces require broader practice before a completeness claim. The published coverage matrix is intentionally unchanged.

Component 2 remains eight packs, 115 cards, 16 written prompts and eight applied tasks, with zero approvals. Neither new lessons nor a Pro subscription bypass this gate.

## Naming decision and evidence

Selected **RecallStride** for local implementation: clear retrieval association, steady-progress meaning, and room beyond note taking. RecallCircuit and ReviseLoop remain less useful candidates because their `.com` domains are registered (see the preceding brief's registry evidence).

The [Namecheap registration search](https://www.namecheap.com/domains/registration/results/?domain=recallstride.com) visibly offered `recallstride.com` with an Add to cart action on 11 September 2026. This supports provisional availability at that moment, not reservation or a guaranteed future price. Nothing was added to a cart or bought.

Exact-name searches for “RecallStride” and “Recall Stride” returned no results in this run. That is weak negative evidence, not clearance. The [official UK trademark search](https://www.gov.uk/search-for-trademark) links to [UKIPO's keyword search](https://trademarks.ipo.gov.uk/ipo-tmtext/start), which returned a security challenge in the browser. No challenge was bypassed. Similar-name, relevant-class and legal clearance therefore remain unresolved. This is a defensible provisional product choice, not a legal assertion. A manual clearance check is required before public rollout; no further aesthetic naming approval is needed to continue local development.

## Learning and design rationale

The [student-only brief](STUDENT_ONLY_BRIEF.md) retains the competitor comparison and academic sources. This increment applies the findings: retrieve before feedback; explain a misconception rather than merely showing red/green; use short labelled worked steps; reduce support for a related task; keep guided success distinct from later unassisted recall. It makes no claim of proven grade improvement.

The repair panel uses the existing surface, text, border and accent tokens, one step and one primary action at a time, semantic forms/buttons, visible focus styles, readable widths and reduced-motion support. It hides the catalogue while active. Numeric/text answers have explicit formatting instructions. Desktop and mobile screenshots are verification evidence, not a substitute for student usability research.

## Verification and remaining work

- Final local verification: 57 unit/API tests passed; 47 JavaScript files passed syntax checks; content validation passed for 24 topics and 431 concepts. All 36 browser check groups passed across 320/390/768/1280 widths, with no JavaScript errors. `git diff --check` passed. Both component review packs were regenerated without approvals.
- Unit/API checks cover authored-bank integrity, independent approval gating, all eight draft objective links, calculated binary/hex/algorithm/floating answers, account isolation, expired continuation, production draft denial, student paywalls, historical data and backup restoration.
- Browser checks cover verification in a separate browser profile; the original account still has no automatically claimed free deck. They exercise progressive worked steps, an incorrect response, a changed transfer question, correct guidance and mobile width, alongside the pre-existing auth/practice/resume/offline journeys.
- Review packs: `npm run review:content -- --component h446-01`; output remains ignored under `.resource-review/review-packs/h446-01/`. Blank reviewer fields remain blank.
- Remaining dependencies: human academic review/corrections of all new banks, deeper objective coverage, manual trademark security check and professional clearance where appropriate, approved legacy-contract handling, real provider/device/accessibility checks and explicit deployment permission. No actual email delivery, payment or production restore was performed in this increment.

The lesson player's current step and typed repair answer are not persisted across reload. Normal quiz, written, timed and adaptive drafts retain their existing resume behaviour. Repair completion is not a long-term learning record; later unassisted retrieval remains the appropriate evidence source.
