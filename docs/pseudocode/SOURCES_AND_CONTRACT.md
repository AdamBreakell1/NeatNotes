# H446 sources and executable contract

Researched 13 September 2026. Current contract: **rs-h446-2.0.0**. This is the RecallStride worksheet execution dialect, not the set of answers OCR examiners may credit. Parser failure is not an exam mark. No J277 assessment rules are imported.

Revalidated 7 October 2026: fetched the official H446 specification again; version 3.0 / April 2026 and the SHA-256 below remain unchanged. Current ICO/GOV.UK policy guidance and its review limitations are separately linked in [POLICY_REVIEW.md](../POLICY_REVIEW.md). Library alternatives were inspected on 13 September and have not been adopted; no later maintenance claim is made.

## Source register

| Source | Version / inspected location | Use and evidence |
| --- | --- | --- |
| [OCR H446 specification](https://www.ocr.org.uk/images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf) | Version 3.0, April 2026; §5d, printed pp.32–37 (PDF pp.38–43); §2.2.1 and §2.3.1 | Retrieved directly from OCR after web-text retrieval failed. Extracted using pypdf and visually inspected PDF pp.39–42. SHA-256 `8551bc2636fa4d8718d97901b462b0642b4bb6148e06407f662c507750764a44`. Search indexing still advertised 2.7: the downloaded cover and footers establish 3.0. |
| [OCR assessment-format support](https://support.ocr.org.uk/hc/en-gb/articles/14509726681362-In-what-format-will-pseudocode-programming-questions-be-presented-in-the-exam) | Updated 20 January 2026, main answer | The paper style is guidance; memorising it is unnecessary. Candidates may use it under the same assessment principles as high-level languages. |
| [H446/02 specimen and mark scheme](https://www.ocr.org.uk/images/170853-unit-h446-2-algorithms-and-programming-sample-assessment-materials.pdf) | ©2014 specimen, Q8 and Q10; PDF pp.43–47, mark-scheme printed pp.18–22 | Method and annotated reasoning are distinct assessment considerations. Historical specimen, not a current question bank. No questions copied. |
| [OCR ERL interpreter](https://github.com/Lauriethefish/ocr-erl) | README, Cargo workspace and licence listing, inspected 13 September | Rust lexer/parser/bytecode CLI; explicitly GCSE ERL; GPL-3.0. No verified browser isolation or accessibility contract; maintenance SLA unknown. Not adopted. |
| [Pseudonaja](https://github.com/PseudocodeEditor/editor) | README and repository structure, inspected 13 September | CIE dialect; CodeMirror 6 browser editor and PS2 interpreter. Documentation described as in development. No licence confirmed in inspected root listing; no licence permission assumed. Not copied or adopted. |
| [CodeMirror](https://codemirror.net/) and [view source](https://github.com/codemirror/view) | Project documentation/source, inspected 13 September | MIT, browser editor, accessible editing support. GitHub view/dev repositories were archived on 15 April 2026 and point to code.haverbeke.berlin; archival is a move, not evidence of abandonment. Current maintenance SLA unverified. Viable future editor adapter; still needs a custom dialect. No third-party editor code used in this increment. |
| [Monaco](https://github.com/microsoft/monaco-editor) | README FAQ, inspected 13 September | MIT, browser editor; officially excludes mobile browsers. Poor fit for the required phone journey. |
| [ICO privacy information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) | Current web guidance, inspected 13 September | Policy review checklist: identity, purpose, lawful basis, recipients, retention and rights. Generated policy drafts require owner facts and legal review. |

The official appendix supplies spelling and examples, not a complete executable semantics specification. The conventions below belong to RecallStride. Source positions use one-based lines and UTF-16 columns.

## Current executable contract: 2.0.0

The task library is adapted from the user's five CodingTasks worksheets. Their reference editor, [Exam Reference Language](https://www.examreferencelanguage.co.uk), was inspected on 7 October 2026 for task/editor/console/file workflow. Its [terms](https://www.examreferencelanguage.co.uk/terms.php) were also inspected. No proprietary code or editor was adopted. School starter links required sign-in; labelled replacement fixtures make every task self-contained.

| Area | Supported behaviour |
| --- | --- |
| Layout | One statement per line; blank lines and // comments. Keywords/built-ins ignore case, variable/routine names are case-sensitive. Straight quotes; no string escapes. |
| Values | Finite binary64 numbers up to ±(2^53−1), strings, true/false, arrays and virtual file handles. Variables keep their assigned type. |
| Operators | = assigns; == != < <= > >= compare same-type scalars. ^ is right-associative and above unary signs; then * / DIV MOD, +/−, comparisons, NOT, AND, OR. AND/OR short-circuit. DIV truncates towards zero; MOD keeps the dividend's sign. |
| Input/output | input(prompt) returns text and pauses Run for interactive input if the queue is exhausted. print(value) adds one output line. int/float/real/str provide explicit conversions. |
| Selection | if/elseif/else/endif and switch expression: / case value: / default: / endswitch. CASE may have an inline statement. First matching case executes; no fallthrough. switch true: supports Boolean cases. |
| Loops | for i=start to end [step integer] / next i, inclusive bounds; while/endwhile; do/until; break/continue inside loops. Step cannot be zero. Loop counters cannot be assigned inside the body. |
| Strings | Zero-based UTF-16 indexes; length, upper/lower, subString(start,count), left/right(count), split(separator), ASC(character), CHR(code). Strict bounds; strings immutable. |
| Arrays | One, two or three declared dimensions; nested array literals; comma indexes or successive brackets; length of an array or row. Fixed bounds; declared cells must be assigned before reading. Whole arrays are copied on assignment. |
| Numbers | random(min,max) inclusive integers; floor, ceil, round(value[,decimals]), sqrt, abs, min, max, format(value,decimals). Fixed-seed checks and stable-seed interactive replay; fresh Run seed. |
| Files | Simple virtual filenames only. existsFile, newFile, delFile/deleteFile, open, openRead, openWrite. Handles support readLine, writeLine, endOfFile, close. open reads/appends; openWrite clears or creates. Reopen to reset the read position. No host filesystem or networking. |
| Timing | wait/sleep(seconds) records output delays; cancellable console playback honours them without blocking the main thread. |
| Routines | Top-level functions/procedures, positional parameters, optional :byVal. Local scopes; scalar/array arguments copied by value. Scalar returns. Recursion, globals, byRef and classes are outside this worksheet language. |
| Trace | First 120 after-statement events, 12 variables, 8 cells per array and 80 characters per string. Inspection, not a live step debugger. |

Hard ceilings and isolation are documented in [ARCHITECTURE.md](ARCHITECTURE.md). Check task executes public cases against original task files; edited files remain intact. Random-character and generated-file cases validate allowed outputs and file-derived counts. File-creation cases compare contents; timed karaoke also checks event timing. Passing finite tests does not prove algorithm correctness or award an OCR mark. Independent review metadata is not presented as a prerequisite for using these owner-authorised tasks.
