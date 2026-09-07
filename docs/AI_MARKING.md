# Written practice and feedback

Updated 7 September 2026. Supersedes the keyword-marking description.

Written answers receive guided rubric review, not an automated semantic mark. `markAnswer` keeps its compatibility name but returns `proposedMark: null`, `validated: false`, a checklist and reasoning guidance. Students compare meaning, then improve their answer. Incorrect sentences containing expected keywords cannot earn marks. No external AI provider receives the answer.

Original and improved submissions remain in `exam_attempts`. Its legacy NOT NULL numeric column stores a compatibility zero; the result JSON and API expose a null mark, never a zero-grade claim. Do not reinterpret that column as a validated result. The interface does not show a total mark for a mini mock.

## Evidence boundary

New guided responses do not create strong learning evidence. Historic `exam_response` records remain stored but are excluded from current mastery calculations. Scheduling projections containing old keyword marks are rebuilt in memory from retained non-exam evidence (`trustedSchedule.js`). Original records are not destructively migrated. Reconstruction is heuristic, not recovery of an examiner-validated mark.

The benchmark tests paraphrases, negated claims, keyword stuffing, partial reasoning, irrelevant material, spelling, units and repeated calls. Passing means these never receive validated marks; it does not establish semantic marking accuracy.

## Future reviewed marking

Require an independently reviewed benchmark, rubric/version provenance, calibration, uncertainty handling, false-positive limits, appeals and a separate validated-mark field. Never upgrade a suggested match to mastery because a model sounds confident. Retain the NEA boundaries in `NEA_INTEGRITY.md`. Answers must not be sent to product analytics.
