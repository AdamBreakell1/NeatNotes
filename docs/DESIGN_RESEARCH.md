# Neat Notes Design Research

Updated: 24 August 2026

## Product question

Neat Notes must help an OCR A-Level Computer Science student answer four questions quickly:

1. What should I revise?
2. Why this topic?
3. What should I do now?
4. Am I improving?

The design therefore optimises for active study, a low planning burden, trustworthy progress and rapid teacher intervention. It does not optimise for maximum dashboard density or decorative gamification.

## Learning research

### Retrieval before exposure

Roediger and Karpicke found that retrieval testing improved delayed retention more than repeated study, even where repeated study produced greater confidence. Dunlosky et al. rated practice testing and distributed practice as high-utility techniques, while rereading and highlighting had low utility.

Design decisions:

- The student home leads with a short retrieval session, not notes or analytics.
- Flashcards require an answer reveal and confidence judgement rather than passive swiping.
- Quick Practice, Exam Practice and CS Labs produce stronger mastery evidence than note viewing.
- Progress labels distinguish learning evidence from self-reported confidence.

Sources:

- [Roediger & Karpicke, Test-Enhanced Learning (2006)](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/)
- [Dunlosky et al., Improving Students' Learning With Effective Learning Techniques (2013)](https://www.psychologicalscience.org/journals/pspi/1529100612453266/)

### Spacing and temporal relevance

Cepeda et al. found that the useful study gap changes with the intended retention interval. A fixed daily repetition rule is therefore weaker than a scheduler that responds to prior retrieval and distance from assessment.

Design decisions:

- Reviews are scheduled from concept-level evidence and retrievability.
- Exam dates are user-controlled profile data, visible in the home plan.
- Due knowledge, recent weakness and older retrieval are mixed in short sessions.
- The interface explains why an item appears instead of presenting an unexplained score.

Source:

- [Cepeda et al., Spacing Effects in Learning (2008)](https://digitalcommons.usf.edu/psy_facpub/1766/)

### Feedback and misconception repair

Multiple-choice distractors can reinforce false knowledge when feedback is absent. Feedback should be immediate, specific and followed by a nearby attempt that lets the learner repair the model.

Design decisions:

- Quick Practice marks one question at a time and explains corrections immediately.
- Exam Answer Coach shows matched and missing rubric points and invites an improved answer.
- Mistakes become a repair queue rather than a permanent failure count.
- Confidence mismatch is shown separately from accuracy.

Source:

- [Butler et al., Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing (2008)](https://gwern.net/doc/psychology/spaced-repetition/2008-butler.pdf)

### Cognitive load and split attention

Mayer's coherence and signalling principles support removing extraneous material and visually identifying structure. Kalyuga et al. showed that split attention imposes additional cognitive load when learners must search between related representations.

Design decisions:

- One primary action is visible in each major region.
- Feedback, correction and the next action stay in the same task surface.
- Secondary formatting and export controls use progressive disclosure.
- Teacher overview prioritises intervention signals, then exposes tables and reports in dedicated sections.
- Page width and typography create a stable reading line rather than a wall of full-width cards.

Sources:

- [Mayer, Principles for Reducing Extraneous Processing](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-reducing-extraneous-processing-in-multimedia-learning-coherence-signaling-redundancy-spatial-contiguity-and-temporal-contiguity-principles/C98AB3A6CE760DD63C048936EA0B3B44)
- [Kalyuga, Chandler & Sweller, Managing split-attention and redundancy (1999)](https://doi.org/10.1002/%28SICI%291099-0720%28199908%2913%3A4%3C351%3A%3AAID-ACP589%3E3.0.CO%3B2-6)

### Motivation without coercion

Recent meta-analysis reports a small positive overall effect for educational gamification and stronger effects on autonomy and relatedness than competence. This argues against treating streaks, points or scarcity as proof of learning.

Design decisions:

- Badges are quiet evidence of deck completion, not the main navigation.
- No public leaderboard, punitive streak loss or random reward loop.
- Session length remains a learner choice.
- Progress language emphasises recoverable states: New, Learning, Fragile, Due, Secure and Misconception detected.

Source:

- [Gamification and student intrinsic motivation: meta-analysis (2023)](https://link.springer.com/article/10.1007/s11423-023-10337-7)

## Competitor analysis

### Smart Revise

Strengths observed:

- Clear Computer Science specialism and supported OCR H446 course.
- Weekly milestones make spacing legible.
- Separate teacher and student registration paths.
- Strong credibility through a teacher-built position.

Opportunity for Neat Notes:

- Make the next action more prominent than the overall dashboard.
- Connect personal lesson notes to the revision loop with explicit provenance.
- Avoid flight-path or target mechanics that can feel punitive or imply unsupported grade prediction.

Source: [Smart Revise product site](https://smartrevise.craigndave.org/)

### Seneca

Strengths observed:

- Small sections move from explanation to a question and immediate feedback.
- Teacher assignment, completion and reporting pathways are easy to describe.
- Paid value is breadth, recommendations, wrong-answer practice and reporting.

Opportunity for Neat Notes:

- Stay narrower and deeper in OCR A-Level Computer Science.
- Be explicit when marking is deterministic and when teacher review is appropriate.
- Use fewer simultaneous modes and less promotional visual noise inside study tasks.

Sources:

- [What is Seneca Learning?](https://help.senecalearning.com/en/articles/2483292-what-is-seneca-learning)
- [Seneca school feature list](https://help.senecalearning.com/en/articles/13431366-detailed-feature-list-by-school-pricing-plan)

### Isaac Computer Science

Strengths observed:

- High subject credibility and broad Computer Science question practice.
- Verified teacher accounts, groups, assignments, start dates, due dates and CSV progress.
- Clear data-sharing expectations when students join teacher groups.

Opportunity for Neat Notes:

- Offer a faster daily independent-study loop.
- Preserve the strong class consent model while making weak-topic intervention more immediately visible.
- Combine concept recall, exam responses and deterministic interactive CS tasks in one progress model.

Source: [Isaac Computer Science teacher support](https://isaaccomputerscience.org/support/teacher)

### Quizlet and Anki

Strengths observed:

- Quizlet makes set creation, import and cross-device continuation obvious.
- Its Learn mode mixes question formats and focuses on difficult material.
- Anki establishes a strong expectation that spaced review should be due-driven and user controlled.

Opportunity for Neat Notes:

- Replace generic set libraries with specification-bound, teacher-authored OCR content.
- Move beyond term-definition recall into answer construction, algorithms, SQL and examination reasoning.
- Make confidence calibration and teacher intervention first-class without exposing scheduling complexity.

Sources:

- [Quizlet Learn](https://quizlet.com/features/learn)
- [Quizlet Flashcards](https://quizlet.com/us/features/flashcards)
- [Anki manual](https://docs.ankiweb.net/)

### Save My Exams

Strengths observed:

- Specification and exam-board routes make discovery predictable.
- Revision notes, topic questions and progress live in a coherent subject hierarchy.
- The free-versus-premium explanation is explicit about the access difference.

Opportunity for Neat Notes:

- Lead with an adaptive next action rather than a document library.
- Connect a learner's own notes to specification-bound retrieval and exam practice.
- Keep free access meaningful while explaining locked depth at the relevant topic, not through repeated interruption.

Sources:

- [Save My Exams OCR Computer Science](https://www.savemyexams.com/a-level/computer-science/ocr/17/revision-notes/)
- [Save My Exams Computer Science](https://www.savemyexams.com/a-level/computer-science/)
- [Why pay for Save My Exams?](https://www.savemyexams.com/learning-hub/support/why-pay-for-save-my-exams/)

## Interface and accessibility standards

WCAG 2.2 adds requirements including focus not being obscured, minimum target size, consistent help and accessible authentication. The GOV.UK type scale uses tested steps and relative units to preserve hierarchy and zoom. Apple's HIG emphasises hierarchy, consistency and adaptation across screen sizes.

Design decisions:

- A visible 3px focus indicator and minimum 40px controls, increasing to 44px for primary mobile actions.
- Relative type scale with restrained display sizes and no viewport-scaled body text.
- No horizontal navigation trap on mobile; the five student destinations become a bottom navigation.
- Motion is brief, functional and disabled under `prefers-reduced-motion`.
- Status, error and success messages use live regions where action feedback matters.
- Colour never carries mastery or validation meaning alone.

Sources:

- [W3C: What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [GOV.UK type scale](https://design-system.service.gov.uk/styles/type-scale/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Home Office layout and typography accessibility guidance](https://design.homeoffice.gov.uk/accessibility/page-structure/layout-typography)

### Reading measure, typography and motion

Reading studies do not support one universal line length, but consistently show that extremely long lines harm speed or preference and that typography changes eye movement. Animation can also increase extraneous processing when it moves faster than a learner can inspect or mentally integrate it.

Design decisions:

- Long-form prose is constrained to a moderate reading measure; dense data uses grids and tables instead of artificially narrow columns.
- Type size and line height change by content role, not viewport width.
- Study-state transitions are brief and interruptible; continuous motion is reserved for the optional brand arrival.
- Progressive disclosure is used for secondary controls while primary task state remains visible.

Sources:

- [Shaikh and Chaparro, line length on online reading](https://journals.sagepub.com/doi/10.1177/154193120504900514)
- [Moderate screen line length and reading](https://journals.uc.edu/index.php/vl/article/view/5671)
- [Typography and eye movements during reading](https://pmc.ncbi.nlm.nih.gov/articles/PMC6722069/)
- [Animation and cognitive load](https://onlinelibrary.wiley.com/doi/10.1002/acp.1348)
- [Layered interfaces and progressive disclosure](https://journals.sagepub.com/doi/10.1177/10648046241273291)

## Visual-system outcome

- Typeface: a privacy-safe system sans stack, led by Inter when locally available and platform UI fonts otherwise. A serif is reserved for optional long-form note reading, not navigation.
- Type scale: 12, 14, 16, 20, 28, 40 and 56px equivalents with readable line heights and tabular numerals for metrics.
- Colour: neutral off-white surfaces, charcoal text, restrained teal actions, amber for due/attention, green for secure and red only for errors/destructive actions.
- Shape: 4px controls, 6px cards and 10px dialogs. Circles are reserved for progress, avatars and icon controls.
- Elevation: borders for document structure; shadows only for dialogs, lifted popovers and focused task surfaces.
- Motion: 120-220ms state changes, no decorative continuous animation outside the brief brand arrival.
- Density: student pages favour one task per viewport; teacher tables remain compact and scannable.

## Deliberate exclusions

- No claim of OCR endorsement.
- No AI marking claim.
- No arbitrary grade prediction.
- No public leaderboard.
- No fake social proof or fabricated usage metrics.
- No exposed Component 02 or NEA content until authored and reviewed.
