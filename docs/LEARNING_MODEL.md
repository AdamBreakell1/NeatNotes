# Learning Model

Neat Notes tracks evidence, not a single decorative completion percentage.

## Evidence hierarchy

The model defines evidence weights, but a weight is not a validation result. Current student evidence comes from self-rated flashcards, quiz choices and bounded applied checks. Written rubric review is excluded from mastery and scheduling until semantic marking is independently validated. Revealing an answer alone is not demonstrated recall. The model is a heuristic, not a grade predictor or empirically calibrated learning algorithm.

## State model

Concepts can be New, Learning, Fragile, Secure, Due for review or Misconception detected. Confidence is stored separately from demonstrated performance. Repeated high-confidence incorrect responses are surfaced as a calibration mismatch.

## Scheduling

Each concept stores difficulty, stability, retrievability, last review, next review, successful retrievals and lapses. Successful retrieval expands the interval according to difficulty and rating; failure shortens it. Today's Revision prioritises due concepts, misconceptions and fragile knowledge, then mixes topics to avoid massed practice.

## Data boundaries

`learning_evidence` is append-only within a bounded retention window. `review_schedules` is the current scheduling projection. `mistake_journal` records unresolved corrections. Locked revision content is filtered before dashboard/session generation.

## Student-facing vocabulary

- Reviewed/completed: an activity was attempted; completion badges recognise participation, not an exam result.
- Evidence: recorded learning interactions. The denominator is currently available concepts in the selected component and entitlement, not every OCR objective.
- Confidence: the learner's own rating; distinct from a correct multiple-choice answer.
- Secure/fragile/due: heuristic states informed by retained evidence and recency, not guaranteed knowledge.
- Coverage: objective-level editorial availability and review status in `H446_COVERAGE.md`.

An adaptive session stores its own ordered completion IDs. Historic completion never excludes an otherwise-due card. Preview and delivery share that queue; persisted references are rehydrated against current authorised content. Changing component or losing access invalidates incompatible queues.

Account history is restored through `/api/revision/history`. Local learning caches are account-scoped; unowned legacy browser records are left on disk but never silently imported. Guest/demo interactions remain separate. Historic written keyword marks remain exportable history, not current learning evidence. Their affected schedule projections are rebuilt from retained non-exam evidence without modifying the original records.
