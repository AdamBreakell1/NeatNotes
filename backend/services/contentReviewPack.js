"use strict";
const { createHash } = require("node:crypto");
const { SPECIFICATION, buildCoverage } = require("../../curriculum-coverage");

const CHECKLIST = [
  "Check each explanation for factual accuracy, scope and exceptions.",
  "Work every calculation, trace and applied task independently.",
  "Check distractors are plausible, unambiguous and genuinely incorrect.",
  "Check objective links and record missing subtopics or depth.",
  "Check wording, notation, accessibility and appropriate difficulty.",
  "Check provenance and permissions; do not reproduce assessed NEA work.",
];

function contentFingerprint(topic, questions, labs) {
  // Stable authoring data only: recording approval must not change the content fingerprint.
  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.keys(value).sort().filter((key) => !["reviewStatus", "reviewedBy", "reviewedAt"].includes(key)).map((key) => [key, canonical(value[key])]));
  };
  return createHash("sha256").update(JSON.stringify(canonical({ topic, questions, labs }))).digest("hex");
}

function tableText(value) {
  return String(value || "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function quote(value) {
  return String(value || "").split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function buildReviewPack({ topics, questions, labs, review, componentId, topicCode, generatedAt = new Date().toISOString() }) {
  const selected = topics.filter((topic) => (!componentId || topic.componentId === componentId) && (!topicCode || topic.code === topicCode));
  if (!selected.length) throw new Error("No topics match the requested review selection.");
  const coverage = buildCoverage(topics, questions, labs, review);
  const manifest = { schemaVersion: 1, generatedAt, specification: SPECIFICATION, purpose: "Editorial review only; this file cannot release content.", topics: [] };
  const documents = selected.map((topic) => {
    const written = questions.filter((item) => item.topicId === topic.id);
    const applied = labs.filter((item) => item.topicId === topic.id);
    const fingerprint = contentFingerprint(topic, written, applied);
    const quarantined = review.quarantinedTopicIds.includes(topic.id);
    const conceptWithheld = (id) => quarantined || review.quarantinedConceptIds.includes(id);
    const filename = `${topic.code}.md`;
    manifest.topics.push({ topicId: topic.id, code: topic.code, contentVersion: topic.contentVersion, fingerprint, file: filename, reviewer: "", reviewedAt: "", status: "awaiting_human_review", checks: CHECKLIST.map((prompt) => ({ prompt, checked: false })), corrections: [] });
    const lines = [
      `# ${topic.code} ${topic.title}`, "", "## Review record", "",
      `- Topic: \`${topic.id}\``, `- Version: \`${topic.contentVersion}\``, `- Source fingerprint: \`${fingerprint}\``,
      `- Publication status: ${quarantined ? "quarantined" : topic.reviewStatus}`, `- Generated: ${generatedAt}`,
      `- ${topic.cards.length} cards; ${written.length} independent written prompts; ${applied.length} fixed applied tasks.`, "",
      "Reviewer: ____________________    Review date: ____________________", "",
      "This pack does not approve or publish anything. Review every item; record corrections against its stable ID. Approval requires a separate explicit human decision after corrections and validation. Written prompts use guided self-review, not validated automatic marks.", "",
      ...CHECKLIST.map((item) => `- [ ] ${item}`), "", "## Objective links and gaps", "",
      `[OCR H446 specification ${SPECIFICATION.version}](${SPECIFICATION.url}). Links are editorial judgements, not a completeness certificate. Empty gaps do not mean an objective is fully covered.`, "",
      "| Objective | Focus | Available mapped cards | Review notes / gaps |", "| --- | --- | ---: | --- |",
      ...coverage.filter((row) => row.topicId === topic.id).map((row) => `| ${row.id} | ${tableText(row.title)} | ${row.flashcards} | ${tableText(row.gaps || "Check depth and application during review.")} |`), "", "## Flashcards and derived choices", "",
    ];
    for (const card of topic.cards) {
      const id = `${topic.id}:${card.id}`;
      lines.push(`### ${card.id}`, "", `Stable ID: \`${id}\`${conceptWithheld(id) ? " - WITHHELD" : ""}`, "", `Objective links: ${(card.objectives || []).join(", ") || "Supplementary / not mapped"}`, "");
      if (card.mappingNote) lines.push(`Editorial note: ${card.mappingNote}`, "");
      lines.push("**Question**", "", quote(card.front), "", "**Answer**", "", quote(card.back), "");
      if (card.distractors?.length) lines.push("**Incorrect choices to check**", "", ...card.distractors.map((choice) => `- ${tableText(choice)}`), "");
      else lines.push(topic.componentId === "h446-01" ? "No authored distractors. Legacy Quick Practice chooses other available card answers at runtime; reviewing this answer does not certify those generated choices. Author and review dedicated incorrect options before claiming reviewed MCQ quality." : "No authored multiple-choice distractors; this card is not offered as a C2 MCQ.", "");
      if (card.commonMisconceptions?.length) lines.push("**Misconceptions**", "", ...card.commonMisconceptions.map((item) => `- ${item}`), "");
      lines.push("Review notes / correction: ____________________", "");
    }
    lines.push("## Independent written prompts", "");
    for (const question of written) {
      lines.push(`### ${question.id}`, "", `${question.commandWord}; ${question.marks} rubric points (not an automatically validated score).${question.conceptIds.some(conceptWithheld) ? " WITHHELD: linked content is quarantined." : ""}`, "", quote(question.prompt), "", "**Rubric**", "", ...question.rubric.map((point, i) => `${i + 1}. ${point.description}`), "", "**Reasoning guide**", "", quote(question.modelReasoning), "", "Review notes / correction: ____________________", "");
    }
    if (!written.length) lines.push("No independent written prompts in this topic.", "");
    lines.push("## Fixed applied tasks", "");
    for (const lab of applied) {
      lines.push(`### ${lab.id}: ${lab.title}`, "", `Type: ${lab.activityType}.${conceptWithheld(lab.conceptId) ? " WITHHELD: linked content is quarantined." : ""}`, "", quote(lab.prompt), "");
      if (lab.options?.length) lines.push("**Choices**", "", ...lab.options.map((option) => `- ${tableText(option)}`), "");
      lines.push("**Expected response**", "", quote(lab.answer), "", "**Explanation**", "", quote(lab.explanation), "", "Review notes / correction: ____________________", "");
    }
    if (!applied.length) lines.push("No fixed applied tasks in this topic.", "");
    return { filename, markdown: lines.join("\n") };
  });
  return { manifest, documents };
}

module.exports = { buildReviewPack, contentFingerprint };
