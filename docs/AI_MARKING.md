# Marking and Feedback

## Current Implementation

Neat Notes does not currently use AI to mark exam answers. The Exam Answer Coach uses a deterministic, published Neat Notes rubric for original questions. The server normalises an answer and matches explicit acceptable points, returning:

- a **suggested mark**;
- matched credit;
- missing rubric points;
- a reasoning guide;
- a marking-confidence flag;
- an action to improve and resubmit the same answer.

The interface and API explicitly say this is not OCR examiner marking. Semantically equivalent wording can escape deterministic matching, so longer unmatched responses receive a teacher-review recommendation.

## Learning Evidence

Exam responses carry more evidence weight than recognition tasks in `learning-model.js`. The original and improved attempts are stored separately. A successful improvement can correct a mistake-journal entry; high stated confidence with a weak response creates a gentle confidence-mismatch signal.

Student answers are stored in Neat Notes for progress and feedback. They must not be sent to third-party analytics.

## Future AI Boundary

An AI marker may only be introduced behind a structured pipeline that accepts a question, maximum mark, command word, rubric, acceptable alternatives, misconceptions and candidate answer. Output must be schema-validated and include evidence, awarded points, missing points, confidence and an uncertainty reason.

Low-confidence responses must be labelled for teacher review. Teacher overrides must be stored alongside, rather than replacing, the machine proposal. No future implementation may claim equivalence to OCR examiner marking without independent validation.
