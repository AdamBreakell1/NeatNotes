# H446 past-paper alignment — 13 September 2026

## Scope and provenance

The owner's PastPapers.zip supplied question papers, mark schemes and examiner reports covering 2019–2025: seven Component 1 question papers and six Component 2 question papers. The 2024 folder contains Component 1 only. Duplicate DOCX copies were not treated as extra papers; NEA moderator material was not used to generate assessment content.

Scope was checked against [OCR H446 specification v3.0, April 2026](https://www.ocr.org.uk/images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf), printed pages 6–12 and the programming/SQL appendix. The historical internal qualification ID remains unchanged. The specification, not the frequency of past-paper topics, determines inclusion. Component 2 builds on Component 1 knowledge; legitimate overlap is retained.

Papers and schemes informed command words, expected detail, working and contextual application only. No paper questions, diagrams, mark-scheme extracts or uploaded resources are bundled or served. New prompts, values and explanations were authored for the app. Extracted source PDFs/text remain in ignored `.resource-review/past-papers/`.

This was a targeted editorial alignment and correctness pass, not an independent academic review or a claim that every possible examination task is covered.

## Evidence informing the changes

| Source reviewed | Pattern used (paraphrased) | App response |
| --- | --- | --- |
| 2019 C1/C2 papers and schemes | Register/assembly working, hashing structures, SQL, binary representations; recursion, pointers and traversals | Explicit working and pointer conventions, not isolated terminology |
| 2020 C2 paper | Tree traversals, insertion-sort code and queue operations | Original traversal and bounded stack/code exercises |
| 2022 C1 paper/report | Scenario application, SQL and signed floating-point representation | Context-specific explanations, executable original SQL, specified binary formats |
| 2022 C2 Q1(b)(ii) and report | Parameter passing must distinguish caller state from a local copy | Original scalar trace explicitly follows both parameter modes |
| 2023 C1/C2 examiner reports | Generic definitions alone miss scenario requirements; problem recognition needs input/output data; traversal needs concrete backtracking | Data-not-device examples, problem-recognition scenario, six-node traversal |
| 2024 C1 paper | Signed floating-point interpretation and normalisation | Explicit sign-bit/binary-point/exponent conventions |
| 2025 C1 paper and scheme | Scheduling, utilities, SQL insertion/subqueries, binary working and floating-point subtraction | Original scheduling, utility, SQL and aligned-mantissa drills |
| 2025 C2 paper and scheme | Sort passes, code repair, stack operations, parameter/OOP code and traversals | Original bubble pass, stack push, constructor, sentinel and traversal exercises |

## Corrections to existing content

- Corrected carry-out versus signed overflow, fixed-width shifts, negative mantissa sign extension, and unsafe universal XOR-precedence guidance.
- Qualified RISC/CISC speed/compatibility claims, embedded storage and real-time timing claims; clarified interrupt handling and both system/process virtual machines.
- Distinguished hash-table, cryptographic and password-hashing requirements. Removed the claim that packet switching itself makes interception harder.
- Corrected composite primary keys, foreign-key/null rules, referential integrity, 2NF/3NF definitions, junction tables, frame-versus-packet terminology and Karnaugh group adjacency.
- Remapped abstraction purpose/limitations to their actual objectives. Replaced generic decomposition/testing wording with identified sub-procedures.
- Written rubrics now explicitly request boundary tests, highest-reward branch changes and binary-search stopping conditions where those are checklist points. The broken OR condition is correctly described as accepting every numeric value, including both endpoints.
- Removed the unsupported RISC cycle-count marking point, aligned SSD and legislation prompts with their checklists, and supplied matching command-word labels.
- Recruitment ethics now targets automated decisions, 1.5.2[2], rather than workforce effects. Bracketed ethics references are local labels for OCR's unlettered bullets.
- Standard binary search belongs to 2.3.1(f), not the C1 array-representation objective. Its replacement lab has a new activity ID; historic records are not relabelled.

## New original flashcards

31 C1 additions and 12 C2 additions; existing card IDs are retained. Reworded cards keep their existing concept identity; genuinely new drills use new IDs. Both component content versions are dated 2026-09-13.1.

| Topic | New card IDs | Objectives |
| --- | --- | --- |
| 1.1.3 | `ram-rom`, `magnetic-storage` | 1.1.3(c), 1.1.3(b) |
| 1.2.1 | `paging-segmentation`, `round-robin-trace`, `scheduling-compare` | 1.2.1(b), 1.2.1(d) |
| 1.2.2 | `utility-choice`, `syntax-code-generation` | 1.2.2(b), 1.2.2(e) |
| 1.2.3 | `algorithm-trace` | 1.2.3(c) |
| 1.2.4 | `oop-example`, `inheritance-polymorphism`, `lmc-trace-original` | 1.2.4(e), 1.2.4(c) |
| 1.3.1 | `rle-worked` | 1.3.1(b) |
| 1.3.2 | `sql-insert`, `sql-subquery`, `normalisation-worked`, `acid-meaning` | 1.3.2(d), 1.3.2(c), 1.3.2(f) |
| 1.3.3 | `nic-access-point` | 1.3.3(d) |
| 1.4.1 | `positive-binary-worked`, `positive-hex-worked`, `base-conversion-worked`, `signed-integer-worked`, `binary-signed-overflow`, `floating-representation-worked`, `floating-subtract-worked`, `floating-negative-add`, `shift-mask-worked` | 1.4.1(b), 1.4.1(e), 1.4.1(f), 1.4.1(c), 1.4.1(d), 1.4.1(g), 1.4.1(h), 1.4.1(i) |
| 1.4.2 | `linked-list-operations`, `stack-operations`, `hash-table-collision` | 1.4.2(b), 1.4.2(c) |
| 1.4.3 | `boolean-model`, `boolean-laws-worked` | 1.4.3(a), 1.4.3(b), 1.4.3(c) |
| 2.1.1 | `model-original` | 2.1.1(d) |
| 2.1.2 | `input-output-original` | 2.1.2(a) |
| 2.1.3 | `subprocedures-original` | 2.1.3(d) |
| 2.1.4 | `condition-trace-original` | 2.1.4(c) |
| 2.2.1 | `parameter-trace-original`, `sentinel-trace-original`, `oop-constructor-original` | 2.2.1(d), 2.2.1(a), 2.2.1(f) |
| 2.2.2 | `recognition-original` | 2.2.2(b) |
| 2.3.1 | `postorder-original`, `stack-code-original`, `bubble-pass-original`, `linked-list-delete-original` | 2.3.1(e), 2.3.1(f) |

## Mapping, release and verification

- Inventory: 474 cards, 32 written prompts and 16 applied tasks across 24 topics. Explicit objective fields now accompany every written/applied activity. The generated coverage report counts those fields rather than borrowing all objectives of a linked concept.
- Flashcard and written-question views display their specification points; authenticated deck hydration retains the metadata. Supplementary background remains visibly outside direct objective coverage.
- Production publication authority for the new C2 version is the owner's explicit instruction to deploy. Academic, C1 quiz and repair approvals remain empty. Existing self-assessment notices and access restrictions are unchanged.
- No database-schema change or history deletion is needed. Startup upserts update current card wording and add new IDs. Existing card IDs and user-owned progress remain intact.
- Automated checks cover signed integers/overflow, signed floating-point alignment, round robin, sorting/traversals, SQL against a synthetic database, Boolean/shift working, activity mappings, publication gates and prompt/rubric consistency.
- Run `npm run check`, `npm run validate:content`, `npm test`, `npm run coverage:content` and the existing isolated browser regression suite before deployment. Browser assertions check visible specification labels alongside existing access, resume and responsive-layout checks.

## Remaining limits

Having a card on all 119 objective rows is not comprehensive examination preparation. Remaining depth gaps include full register-transfer traces, separate worked examples for every scheduling policy, complete 1NF-to-3NF exercises, rounding/exponent overflow, more logic diagrams and data-structure operations, broader algorithm writing and contextual extended responses. These remain explicit in [H446_COVERAGE.md](H446_COVERAGE.md).

The written checklist is guided self-assessment, not an automatic examiner mark. The app must not claim OCR endorsement or an independent academic sign-off.
