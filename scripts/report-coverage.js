"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { loadTopics } = require("../backend/services/contentRepository");
const { QUESTION_BANK } = require("../exam-content");
const { LABS } = require("../cs-labs");
const { SPECIFICATION, buildCoverage } = require("../curriculum-coverage");
const topics = loadTopics();
const rows = buildCoverage(topics, QUESTION_BANK, LABS);
const c1 = rows.filter((row) => row.componentId === "h446-01");
const supplementary = topics.flatMap((topic) => topic.cards.filter((card) => card.mappingStatus === "supplementary").map((card) => ({ ...card, topicId: topic.id })));
const text = (value) => String(value || "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
const lines = [
  "# H446 objective coverage", "", `Generated from structured content against OCR specification ${SPECIFICATION.version} (${SPECIFICATION.checkedAt}).`, "", `[Official specification](${SPECIFICATION.url})`, "",
  "This is an editorial mapping, not a completeness or academic-quality certificate. C1 remains published but academically unreviewed; C2 remains draft pending human academic review. A mapped card does not establish depth across every sub-bullet. Blank gap notes are not a claim of full coverage. Numbers in 1.5.2 square brackets are local references to unlettered specification bullets, not OCR IDs. MCQs reuse flashcards and are NOT additional authored exam questions. NEA remains integrity guidance only.", "",
  `C1: ${c1.filter((row) => row.flashcards).length} of ${c1.length} objective rows have directly mapped cards; ${c1.filter((row) => row.status === "missing").length} have no direct mapped card. ${supplementary.length} supplementary cards are retained but excluded from objective coverage. These are inventory counts, not a mastery percentage.`, "",
  `Bank inventory: ${topics.reduce((count, topic) => count + topic.cards.length, 0)} unique cards, ${QUESTION_BANK.length} independent written prompts, ${LABS.length} fixed applied tasks. A card or activity may relate to multiple objectives: never add row totals to estimate unique questions. Written/applied counts are concept links, not proof that an activity assesses the whole objective. Quarantined content and dependent activities are excluded from available row counts.`, "",
  "Legacy C1 MCQs choose other available flashcard answers at runtime; they have no dedicated authored distractor sets. C2 MCQs require three authored distractors. The derived-MCQ column counts offered card-based questions, not independently reviewed question sets. Dedicated C1 distractor authoring/review remains an explicit quality gap.", "",
  "| Objective | Focus | Status | Cards | Derived MCQs | Written prompts | Applied tasks | Review notes / gaps |",
  "| --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
  ...rows.map((row) => `| ${row.id} | ${text(row.title)} | ${row.status} | ${row.flashcards} | ${row.derivedMcqs} | ${row.writtenQuestions} | ${row.appliedTasks} | ${text(row.gaps)} |`), "",
  "## Supplementary material", "", "These cards provide background or need closer editorial review before being treated as direct objective evidence.", "",
  ...supplementary.map((card) => `- \`${card.topicId}:${card.id}\`: ${card.mappingNote}`), "",
  "Regenerate with `npm run coverage:content`. Generate a local review pack with `npm run review:content -- --component h446-02`. Review records belong in `content-review.json`; approvals must match the exact content version. Original resources and generated review packs remain local and are not served.", "",
];
fs.writeFileSync(path.join(__dirname, "../docs/H446_COVERAGE.md"), lines.join("\n"));
console.log(`Wrote objective coverage: ${rows.length} rows.`);
