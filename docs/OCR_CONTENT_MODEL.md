# OCR Content Model

## Purpose

Neat Notes treats curriculum identity as versioned product data rather than UI copy. `ocr-content.js` preserves existing Component 01 topic and card identifiers. Prior publication is not evidence of recorded academic review.

The hierarchy is:

`Qualification -> Component -> Section -> Topic -> Concept`

The current specification identifier is `ocr-h446-2020`. Evidence refers to concepts using the stable form `topic-id:card-id`, for example `cs-1-1-1:mar`. Historic evidence therefore remains attributable if a display title changes.

## Published Scope

- Component 01 Computer Systems: 16 existing topics, 316 cards, 16 original written questions and eight fixed applied tasks. Status remains `published_unreviewed`. Editorial mapping accounts for all 316 cards: 306 directly mapped and 10 supplementary. Of 84 specification objective rows, 76 have mapped cards and eight have no directly mapped card. This is not a completeness or mastery score.
- Component 02 Algorithms and Programming: eight draft topics, 115 original cards, 16 original written questions and eight bounded applied checks. Local previews work; production delivery is blocked pending version-specific human academic approval.
- Component 03/04 Programming Project: integrity guidance only. Neat Notes must not generate candidate-specific assessed NEA work.

The product may say that content is aligned to the OCR H446 specification structure. It must not say that it is OCR approved or endorsed.

## Content Metadata

New concepts include stable identity, component/objective mapping, category, explanation, misconceptions, prerequisites, difficulty, command word, activity types, review status and content version. See `H446_COVERAGE.md` for the generated 119-objective matrix, including all 35 Component 2 lettered objectives. A mapped draft card is not proof of comprehensive coverage.

## Validation

Run:

```bash
npm run validate:content
```

The validator checks duplicate identifiers, orphan concepts, explanations, objective mappings, prerequisites, distractor shape and review metadata. Server startup checks content structure. Run `npm run coverage:content` to regenerate the editorial matrix. Structural checks cannot certify academic accuracy.

`component-one-mapping.js` holds the explicit C1 objective links and partial-coverage notes. Its validator detects unmapped additions, stale card IDs and cross-topic objective references. Existing card IDs and answers are unchanged. Supplementary material remains available but cannot inflate objective coverage. Quarantined content and dependent activities are excluded from available coverage counts.

## Local review packs

Generate readable editorial packs without changing publication status:

```bash
npm run review:content -- --component h446-02
npm run review:content -- --component h446-01
npm run review:content -- --topic 2.1.1
```

Files are written under ignored `.resource-review/review-packs/`. Each topic includes objective links and gaps, stable IDs, answers, authored distractors, written rubrics and applied-task solutions. The manifest has blank human-review fields and unchecked criteria. SHA-256 fingerprints identify the source content inspected; they are evidence for review, not release credentials. Regenerate after edits. Completing a pack does not approve or unlock anything; the separate version-specific release process still applies.

C1 Quick Practice currently selects other card answers as incorrect options at runtime. There are no dedicated authored C1 distractor sets. The coverage report distinguishes these derived questions from authored choices; plausible, academically reviewed distractors remain a quality requirement. Reviewing flashcard answers alone cannot certify those generated quizzes.

## Versioning Rule

Never reuse an existing concept ID for a different learning objective. Minor wording corrections retain the ID. Substantive objective changes create a new specification/content version and a new concept ID, with an explicit migration or equivalence map if historic evidence should contribute.

The official PDF inspected is OCR H446 specification version 3.0, copyright 2026. The internal `ocr-h446-2020` identifier remains unchanged for historic evidence compatibility; it is not a claim about the current PDF edition.

## Academic release and quarantine

`content-review.json` is the release authority. Human approval requires the exact topic ID, content version, reviewer, review date and decision `approved`. No approvals have been invented. Admin review notes alone do not release a version. Bump the content version after material edits so approval cannot accidentally carry forward.

`quarantinedTopicIds` withdraws a topic in all environments. `quarantinedConceptIds` removes cards and dependent written/applied activities. Database records and history remain; public routes and practice submissions use the current repository view. Restart a reviewed build after a file change. Rollback must retain quarantine decisions.

## Teaching-resource provenance

The supplied Component2.zip remains unchanged and unpublished. `scripts/extract-teaching-resources.py` extracted 58 PPTX/DOCX/PDF resources into ignored `.resource-review/` for local editorial analysis. Original drafts are in `component-two.js`, `component-two-practice.js` and `component-two-labs.js`; copyrighted exam sheets were not copied into the app.

Review explicitly checks corrections to resource pitfalls: logarithmic work grows slowly rather than decreasing; merge sort is O(n log n); binary-search bounds move correctly; recursion has stack limits; iteration is not universally memory-safe; return values need not be assigned; and Dijkstra/A* guarantees require their stated conditions. Check every answer, distractor, objective mapping, notation and worked example before release.

Flashcard-derived MCQs are not independent written questions. Mini mocks are short practice selections, not complete OCR papers. NEA remains integrity guidance only.
