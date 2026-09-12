# Student-only product brief

11 September 2026. Local implementation from `2903927`; no push, deployment, domain purchase or provider change authorised for this increment. This direction supersedes the earlier plan to keep classroom workflows in the app. Historic documents remain release records, not the current product specification.

## Product decision

One learner, one OCR H446 course, one useful next step. The product is a personal revision system, not a school management tool or a general-purpose notes competitor. Keep Today, Revise, Practice, Progress and Notes; remove role switching, class codes, rosters, assignments and institutional selling. Notes support learning rather than becoming a second product.

Visual thesis: a quiet, compact study workspace with teal actions, readable neutral surfaces, stable mobile navigation and one dominant action per learning state. Preserve the current typography and accessibility baseline until a deliberate visual redesign is tested. Do not solve complexity with more dashboard panels.

## Competitive evidence

Public pages and documentation inspected on 11 September; not a hands-on audit of paid accounts.

| Reference | Observed positioning / interaction | Product judgement for this app |
| --- | --- | --- |
| [Save My Exams OCR Computer Science](https://www.savemyexams.com/a-level/computer-science/ocr/17/) and [flashcards](https://www.savemyexams.com/a-level/computer-science/flashcards/) | Exam-board-specific notes and practice resources; convenient prepared flashcards and educator credibility. | A generic resource library is not enough to differentiate. Make the recommended session explain why a concept is due, then connect retrieval to an original worked application. Never imply our content is official OCR material. |
| [Seneca's learning approach](https://senecalearning.com/en-gb/blog/what-is-the-best-way-to-revise/) | Explicit retrieval, spacing and interleaving positioning. | Learning-science language is already common. Compete on clear implementation and useful corrections, not a claim to have invented these methods or a guaranteed improvement. |
| [Anki study workflow](https://docs.ankiweb.net/studying.html) | Questions precede answers; review ratings affect scheduling; new, learning and due states are distinguished. | Preserve the focused retrieval interaction. Make self-ratings understandable and keep them separate from independently marked correctness. A badge is participation recognition, not a predicted grade. |

These observations do not establish that competitors lack our proposed features. Conversion rates, retention, paid functionality and learning effects were not independently measured.

## Learning evidence and implications

- Retrieval: [Yang et al.'s classroom meta-analysis](https://pubmed.ncbi.nlm.nih.gov/33683913/) supports quizzing across studies, with effects varying by implementation, repetition and feedback. Product implication: require an attempt before revealing an answer, and make correction actionable. This is not evidence that Neat Notes itself improves grades.
- Spacing: [Mawson and Kang's applied classroom review](https://pubmed.ncbi.nlm.nih.gov/40564553/) reports a moderate pooled advantage for distributed practice over massed practice. Product implication: return to previously studied concepts on later days rather than equating a completed deck with permanent knowledge. The exact app scheduling intervals still need calibration.
- Feedback: [EEF's retrieval-and-feedback guidance](https://educationendowmentfoundation.org.uk/news/voices-from-the-classroom-beyond-the-quiz-feedback-and-retrieval-practice) stresses addressing incorrectly recalled material. Product implication: explain the error, let the learner repair it, then reassess later. Keyword overlap remains insufficient to mark written reasoning.
- Cognitive load and worked examples: [NCCE's computing pedagogy guidance](https://media.teachcomputing.org/QR_2_Worked_examples_fd8c8f5064.pdf) recommends integrated, subgoal-labelled examples paired with related practice and gradually reduced support. Product implication: show one algorithm trace step at a time, then give a structurally similar problem; do not replace application with definition cards.
- Limits: [EEF's evidence review](https://educationendowmentfoundation.org.uk/education-evidence/evidence-reviews/cognitive-science-approaches-in-the-classroom) cautions that translation to classroom practice is context-dependent. Treat the proposed loop as an evidence-informed hypothesis; test it with OCR students rather than claiming universal effectiveness.

## Naming and domain findings

Current registry evidence captured at 18:12:34 UTC on 11 September 2026, using Verisign's authoritative `.com` RDAP service. No domains were bought or reserved.

| Candidate | Rationale | Current evidence / decision |
| --- | --- | --- |
| RecallStride | Combines retrieval with steady progress; pronounceable and not restricted to notes. | [recallstride.com registry query](https://rdap.verisign.com/com/v1/domain/recallstride.com) returned HTTP 404 with no registered record. Strongest provisional candidate, not confirmed purchasable or trademark-cleared. |
| RecallCircuit | Memorable Computer Science association and a repeat-learning loop. | [recallcircuit.com](https://rdap.verisign.com/com/v1/domain/recallcircuit.com) returned an existing registered domain. Do not pursue without explicit acquisition authority. |
| ReviseLoop | Immediately describes repeated revision. | [reviseloop.com](https://rdap.verisign.com/com/v1/domain/reviseloop.com) returned an existing registered domain. More descriptive and less distinctive. |

The subsequent [learning increment](STUDENT_LEARNING_INCREMENT.md) selects RecallStride for local implementation and verifies an Add to cart listing on Namecheap. The user authorised a defensible naming choice, so a further aesthetic approval is not required. UKIPO screening encountered a security challenge; no legal clearance or domain purchase is claimed. Stable operational identifiers and support addresses remain unchanged. Public rollout still requires clearance and an approved provider/domain transition.

## Target learning experience

1. Try a short, honest session without an account. Save the current task across signup and verification.
2. Choose the component and topics already studied; exam dates and targets stay optional.
3. Today offers a bounded session based on due work and recent mistakes, with its reason visible and details expandable.
4. Retrieve first; compare with the explanation; record self-confidence separately from objective correctness.
5. Repair a misconception using a worked example, then attempt a related question with less support.
6. Finish with the next review expectation and evidence gained. Avoid streak-loss pressure, grade predictions and false claims of whole-course mastery.

## Readiness and backlog

| Priority | Work | State / acceptance |
| --- | --- | --- |
| P0 | Remove classroom product surfaces and endpoints | Implemented locally. Retired endpoints return 410; no deletion of stored records or subscription identifiers. |
| P0 | Protect student history and billing | Tests cover owned historic class-tagged attempts in personal revision, cross-account isolation, legacy paid student access and unchanged free gates. |
| P0 | Component 2 release decision | Eight draft packs: 115 cards, 16 written prompts, eight applied tasks, 35 mapped objective rows. Zero recorded academic approvals. Local editorial preview is usable; production content stays withheld. |
| P1 | Academic content work | Review every C2 answer, distractor, trace and rubric using the existing packs. The learning increment replaces C1 runtime distractors with 48 authored drafts and supplies worked-example drafts for eight gaps. Human review and deeper objective coverage remain outstanding. |
| P1 | Naming clearance | RecallStride implemented locally with stable account/content/customer IDs retained. Registrar listing checked; trademark clearance and public rollout remain outstanding. |
| P1 | Signup/verification return-to-task | Implemented and exercised across browser profiles. Practice draft resume additionally covers reload, same-browser account switching, changed content versions and offline retries. See `STUDENT_PRACTICE_AUDIT.md`. |
| P1 | Retired-contract migration | Before release, inventory active obligations with approval, arrange retained-record exports and support handling. Do not silently change prices, cancel subscriptions or publish this breaking retirement without sign-off. |
| P2 | Worked-example repair loop | Nine progressive original drafts and 18 related checks are implemented with account-scoped resume. Human review, broader examples and later unseen retrieval remain outstanding; same-screen guidance does not count as mastery. |
| P2 | Learning and retention pilot | With consent, measure first-session completion, return-to-revision, delayed retrieval and support friction. Segment by starting knowledge; do not equate engagement with attainment. |
| P2 | Visual and accessibility validation | Test with students, touch devices and screen readers; simplify any competing actions before adding features. Automated screenshots are a baseline, not usability research. |

Commercial hypothesis: Free demonstrates the complete learning loop in one released deck; Pro buys breadth and useful personal study tools. Keep feedback quality equal. Validate willingness to pay before adding aggressive limits. Main risks remain content depth/accuracy, untested real provider lifecycles, under-18/privacy review, active legacy obligations and unproven conversion/retention. No guaranteed revenue or superiority claim is justified.
