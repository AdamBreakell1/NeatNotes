# Learning Model

Neat Notes tracks evidence, not a single decorative completion percentage.

## Evidence hierarchy

Passive note viewing and card reveals provide weak evidence. Self-rated flashcards, multiple choice, free recall, short answers, applied questions and exam responses progressively provide stronger evidence. Mastery is weighted by evidence strength, recency, spacing and activity diversity.

## State model

Concepts can be New, Learning, Fragile, Secure, Due for review or Misconception detected. Confidence is stored separately from demonstrated performance. Repeated high-confidence incorrect responses are surfaced as a calibration mismatch.

## Scheduling

Each concept stores difficulty, stability, retrievability, last review, next review, successful retrievals and lapses. Successful retrieval expands the interval according to difficulty and rating; failure shortens it. Today's Revision prioritises due concepts, misconceptions and fragile knowledge, then mixes topics to avoid massed practice.

## Data boundaries

`learning_evidence` is append-only within a bounded retention window. `review_schedules` is the current scheduling projection. `mistake_journal` records unresolved corrections. Locked revision content is filtered before dashboard/session generation.

