# Student relaunch: design and evidence

Research and design decisions, 7 September 2026. These are hypotheses informed by external evidence, not findings from a Neat Notes efficacy trial.

## Learning loop

The EEF cognitive-science review supports investigating retrieval, spacing and cognitive-load approaches while stressing implementation and context. The interface therefore asks for retrieval before reveal, offers manageable sessions and repeats due material. It does not claim the custom interval calculation is scientifically calibrated or that completing a streak improves an exam grade. [EEF evidence review](https://educationendowmentfoundation.org.uk/education-evidence/evidence-reviews/cognitive-science-approaches-in-the-classroom).

Feedback must lead somewhere useful. Incorrect quiz answers now include the concept explanation; missed concepts can become a follow-up retrieval set. Written practice presents reasoning and a rubric followed by an improvement action. This follows the EEF emphasis on meaningful feedback and opportunities to use it, rather than treating a score as the end of practice. Guided feedback still needs academic and student review. [EEF feedback guidance](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback).

The qualification contains distinct examined components and assessed project work. The component selector uses those boundaries. The editorial matrix distinguishes draft cards, independent written questions, derived MCQs and fixed applied checks; no content count is presented as proof of full syllabus mastery. The inspected PDF was version 3.0, copyright 2026. [Official OCR H446 specification](https://www.ocr.org.uk/images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf).

## Interaction decisions

Progressive disclosure informed the Today screen: one session action, optional duration choices, an expandable preview and secondary study tools. It also informed collapsible Notes tools and hiding the topic catalogue during an active quiz. This is established UX practice guidance, not a controlled experiment showing a conversion effect for this app. [Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/).

The five student navigation destinations use familiar task names. Account, billing, settings and help have one consistent menu across views. This reduces choice competition without hiding essential controls. A bounded content column, predictable spacing and stable component selector group related decisions; secondary actions have quieter styling. The existing teal palette, neutral backgrounds and type family are retained. No speculative typeface or framework dependency was added.

Flashcards expose only the question before reveal. After reveal, rating controls receive focus; keyboard-visible outlines and reduced-motion handling remain. Native buttons/details/selects provide familiar interaction semantics. Responsive QA checks document overflow at 320, 390, 768 and 1280px. These checks do not replace real-device, screen-reader, touch-target, contrast and zoom testing. In particular, WCAG 2.2 requires attention to focus not being obscured and minimum target sizing. [W3C focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), [WCAG 2.2 changes](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

## Competitive position

Isaac Computer Science's published workbook provision demonstrates that substantial free subject practice exists. Its workbook overview spans GCSE and A-Level resources, so its aggregate question count must not be compared directly with this app's A-Level catalogue. Neat Notes should not charge merely for possessing notes: the hypothesis is that an easier daily retrieval/repair/return journey can be valuable. No claim is made that competitors lack these capabilities. [Isaac workbook overview](https://isaaccomputerscience.org/pages/workbooks_2020?examBoard=ocr&stage=all).

The supplied audit's Linear/Notion/Stripe/Apple aspirations are interaction benchmarks, not a licence to copy visual identity or claim those products were exhaustively tested. This pass applies familiar navigation, focused working modes, progressive disclosure, readable controls and recoverable interruptions. A commercial benchmark study still needs measured task comparisons with students; polished screenshots alone are insufficient.

## Under-18 privacy review

The ICO Children's Code describes standards for relevant services likely to be accessed by children, including best interests, high-privacy defaults, minimisation, transparency and careful treatment of profiling. Student-only positioning does not remove those responsibilities. [ICO code standards](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/).

Implementation facts: essential sessions and account-owned learning data; explicit opt-in before client usage-analytics transmission; no notes or answer text in event payloads; per-account local learning caches; no silent import of guest/sample learning history; no location/social leaderboard/advertising SDK added. Quiz, written and timed-practice drafts use local storage for interruption recovery. On shared school devices this is an important disclosure and retention/clear-on-sign-out decision, not an invisible implementation detail.

Questions for qualified review: applicability and DPIA; lawful bases and age-appropriate explanation of adaptive profiling; controller/contact identity; processor contracts and international transfers; actual retention and backup deletion periods; privacy defaults; accessibility of rights requests; handling of shared ownership and paid-account deletion; policy wording and cancellation/refund rights. No legal clearance is claimed.

## Payments and operating trust

Stripe describes subscriptions as an asynchronous lifecycle requiring webhook processing and state handling. Configuration alone cannot establish successful collection, provisioning, renewal or cancellation. Local event-processor tests are useful but separate from a provider Sandbox journey. [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks).

## Pilot before broad promotion

Recruit a small, appropriately consented group across Year 12/13 and differing confidence/access needs. Begin with 5-8 moderated usability sessions, then a limited two-week pilot; this is exploratory, not a powered efficacy study. Do not require payment to participate in research.

Tasks: find the right component; select the free deck; start and finish a short session; explain a wrong quiz answer; resume after refresh; distinguish confidence from mastery; find Billing/Help on a phone; understand what Pro adds. Record task success, errors, assistance, comprehension and participant explanations. Do not collect raw note/answer text in product analytics.

Measure activation as a meaningful completed session, D7/D30 return when sample size permits, delayed successful retrieval, correction followed by later retrieval, free-to-Pro conversion, cancellations and support requests. Define cohort windows and denominators before analysis. Report uncertainty and selection bias. Time on site, streaks and heuristic scores are not proof of learning. Use observed confusion and support burden to prioritise the next increment; do not invent testimonials or national-leadership claims.
