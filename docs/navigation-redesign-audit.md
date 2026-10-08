# RecallStride navigation and product coherence audit

Date: 8 October 2026. Scope: the student application shell, public landing page and the relationship between revision, question practice, coding, notes and progress.

## Evidence and diagnosis

The in-place audit captured 20 surfaces: landing, Today, Revise, Progress, Notes and all five Practice modes at 1440 px and 390 px. Baseline screenshots and the text/control inventory are in `/tmp/recallstride-nav-audit/`; key examples are `landing-desktop-viewport.png`, `practice-coding-desktop-viewport.png` and `practice-coding-mobile-viewport.png`. These are local inspection evidence, not a new student usability study.

The students' feedback is consistent with specific structural problems:

| Finding | Effect on students | Redesign decision |
|---|---|---|
| Pseudocode is the fifth item in a second navigation strip under Practice. The landing page does not mention it. | A substantial working feature looks incidental and requires students to guess where to search. | Make Code a primary destination, advertise its 60 tasks and interpreter, and provide a direct guest launch. |
| The primary and Practice navigation strips compete visually. The Practice strip wraps to two rows on the captured mobile view. | Students must interpret two navigation systems before reaching the activity. | Use one stable product shell and a Practice overview of visible activity cards. |
| Course component/topic controls appear around activities with different scopes. | Students may assume every tool depends on the current flashcard topic. | Show course controls where they affect the activity; let Code retain its own task catalogue. |
| Today hides alternative tools under “More study tools”. | Students cannot see the breadth of the product or make an informed first choice. | Keep the suggested session primary, with direct, visible routes to revision, practice and coding. |
| Notes presents workspace, sharing, badges and review controls together. | A supporting study activity introduces a different product model and competing exits. | Put Notes with course revision and retain workspace/account utilities in consistent secondary locations. |
| Screen changes primarily update internal application state rather than a destination URL. | Browser Back and bookmarked links cannot reliably represent the student's route through the product. | Use a canonical route per destination and restore the previous view state on Back. |
| Public copy explains publication/review processes while omitting working coding functionality. | Internal implementation details displace the information students need to choose an activity. | Describe real capabilities and plan differences plainly, without claiming academic endorsement. |

## Before and after destination map

| Before | After | What belongs there |
|---|---|---|
| Today, with additional tools concealed in a disclosure | **Today** | The next useful session, continuation and visible activity choices |
| Revise, with Notes as a separate primary destination | **Revise** | Course topics, flashcards and supporting notes |
| Practice → Quick / Exam / Mini mock / CS Labs / Pseudocode | **Practice** | A visible choice of quick questions, exam questions, mini mocks and CS Labs |
| Practice → Pseudocode | **Code** | The complete task catalogue, scratchpad, editor, interpreter, files and checks |
| Progress, surrounded by revision context | **Progress** | Recall evidence, gaps and links to the next relevant activity |
| Settings/contact exposed through assorted controls | Consistent utility area | Account/settings, help/contact and legal information |

The five main destinations now remain in the same relative order. Notes is a supporting activity within Revise, with a visible “My notes” link on Today and revision screens. A Today card, a programming-topic link, global search and the Code navigation entry all open the same workspace. The public “Try Code studio” action opens it directly for guests. Existing note data, permissions, practice engines and coding drafts are retained.

## Implementation and verification contract

- Use one visual shell, one destination title and one current-location indicator. Native links navigate; buttons perform actions. Avoid presenting ordinary site navigation as an ARIA `menu`.
- Make Code visible on desktop and compact screens. The public hero has one action group: Start free, Try revision and Try Code studio. The latter opens the actual workspace without requiring an account.
- Show Practice choices before an activity starts. Within an activity, keep one clearly labelled return to its overview rather than several competing exits.
- Keep mobile navigation labelled and consistent with desktop. Fixed headers and bottom navigation must not cover focused controls or the final editor actions.
- Give Code one canonical page heading. Keep Browse tasks, Scratchpad and the current-task selector visible; the selected task has an h2 heading. On compact screens, retain a short prompt summary and collapse instructions and optional editor tools so Run is available above the editor.
- Change the URL, page title and current-destination state together. On an intentional screen transition, move focus to the destination heading; on Back, restore meaningful focus, filters and the prior view. Do not steal focus during background progress updates.
- Preserve typed exam responses, mini-mock state, notes and local code drafts when a student changes destination. Stop any active coding worker when leaving its workspace.
- Verify the journey from landing to Code, guest and authenticated entry, Practice overview/activity/return, Notes within Revise, browser Back/Forward, keyboard focus, small-screen layout and existing study behaviour.

## Verification results

- **93 unit/API tests passed**, including navigation route parsing and formatting.
- **48 general browser evidence groups passed**, with no browser errors. Coverage includes the visible Practice overview and native Tab/Enter operation, topic catalogue to flashcards, notes, quiz/exam/mock/repair draft persistence, account isolation, production recall behaviour, and no false mastery writes. All main destinations, Code, Notes and Contact were checked for document overflow at 1280, 768, 390 and 320 px.
- **23 coding browser groups passed after the final Code heading/toolbar polish**, with no browser errors or private source/file markers in API payloads. Interactive input, multidimensional arrays, virtual files, Run/Check/Stop, saved drafts, imports/exports, account isolation, offline execution and responsive layout remain working.

Browser evidence is saved in `test-results/student-relaunch/results.json` and `test-results/pseudocode/browser-results.json`. After-design screenshots are in `/tmp/recallstride-nav-audit/after/`; final Code screenshots are in `/tmp/recallstride-nav-audit/final/`. Visual inspection confirms that the duplicate Code introduction is removed and Run is fully visible above the fixed navigation on the initial 390 × 844 and 320 × 844 views. Its lower edge is approximately 670 px and 710 px respectively; the navigation begins at 774 px. The task prompt summary and expandable full instructions remain available.

The dedicated navigation suite passes 18 workflow groups with zero browser exceptions or private-source leaks. Evidence is saved in `test-results/navigation-redesign/browser-results.json`. It separately verifies task/history links, topic return loops, cross-component search, focus exit, mobile notes, account return, answer preservation and late-request isolation. Automated and visual checks do not replace student usability feedback; deployment status is recorded below.

## Primary guidance and rationale

These sources inform the design decisions; they do not prescribe RecallStride's exact destination names.

- [W3C: Consistent Navigation](https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation) explains the importance of stable order and location in repeated navigation.
- [GOV.UK: Navigate a service](https://design-system.service.gov.uk/patterns/navigate-a-service/) recommends simplifying journeys before adding navigation and separating service navigation from broader utilities.
- [GOV.UK: Tabs](https://design-system.service.gov.uk/components/tabs/) warns that tabs hide content and should not function as page navigation. This supports visible Practice choices instead of another mode strip.
- [W3C: Multiple Ways](https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html) supports more than one way of finding content. Contextual links and direct Code navigation can coexist while sharing one destination.
- [Android: Adaptive navigation](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation) describes compact navigation bars and larger-screen rails. Adapting that principle to the web shell is a design inference, not a web accessibility requirement.
- [GOV.UK: Back link](https://design-system.service.gov.uk/components/back-link/) says returning should restore the previous page in the state the user saw it, with an explicit destination label for complex journeys.
- [W3C: Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order) requires meaningful keyboard order. Destination-heading focus and state restoration are the implementation choices used to support it here.
- [W3C: Disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) explains why ordinary navigation does not need the ARIA menu role.
- [W3C: Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) and [Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) inform fixed-navigation spacing and touch controls. The target minimum is 24 × 24 CSS pixels or a qualifying exception; larger targets are preferable for primary controls.

## Final validation and continuation

The redesign was implemented and validated on base revision `df4500f1b9c8c1232c49aa1d92934460b54e826b`. No database migration or additional dependency is required. Deployment completion and the confirmed live revision are recorded separately in `docs/validation/navigation-redesign-deployment.json`; earlier deployment evidence is preserved.

| Check | Result |
|---|---|
| JavaScript syntax | 68 files pass |
| Unit/API tests | 93 pass |
| General browser regression | 48 groups pass |
| Coding browser regression | 23 groups pass |
| Navigation journeys | 18 groups pass; zero exceptions/source leaks |
| Course content validation | 24 topics / 474 concepts valid |
| Responsive layout | No horizontal overflow at 320, 390, 768 and 1440 px |
| Keyboard visual inspection | 55 navigation focus checks; visible and unobscured |
| Light/dark visual inspection | Sampled Today, Practice, Code and Notes; sampled text contrast passes |

All browser checks use disposable synthetic accounts and databases. Screenshots under `test-results/navigation-redesign/` include Today, topics and Practice on desktop plus Code and Notes on mobile. Final light/dark inspection images are under `/tmp/recallstride-nav-audit/final/`. This is an implementation and accessibility inspection, not a formal accessibility certification or a new student usability study.

The router owns explicit activity intent and page history. Render functions do not push or replace history entries. Browser Back restores destination and scroll position; navigation leaves focus mode safely. Topic-specific written answers and component-specific mini mocks retain their owning context; late requests cannot overwrite a different visible activity. Coding source and answers never enter route URLs or auth-continuation records.

To deploy next: use the established repository/Render deployment path and confirm the live revision. Do not repeat computer-use feature tests during a literal deployment request. Provider checks previously recorded as pending remain outside this UI redesign.
