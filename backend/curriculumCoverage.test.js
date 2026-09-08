"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTopics } = require("./services/contentRepository");
const { specificationObjectives, buildCoverage, validateCoverage } = require("../curriculum-coverage");
const { QUESTION_BANK } = require("../exam-content");
const { LABS } = require("../cs-labs");
const review = require("../content-review.json");

test("C1 mappings use named OCR objectives and preserve all existing cards", () => {
  const topics = loadTopics();
  const c1 = topics.filter((topic) => topic.componentId === "h446-01");
  assert.equal(specificationObjectives().length, 119);
  assert.equal(specificationObjectives().filter((row) => row.componentId === "h446-01").length, 84);
  assert.equal(c1.flatMap((topic) => topic.cards).length, 316);
  assert.ok(c1.every((topic) => topic.cards.every((card) => ["mapped", "supplementary"].includes(card.mappingStatus))));
  assert.ok(specificationObjectives().every((row) => !row.title.startsWith("Specification objective")));
  assert.deepEqual(c1.find((topic) => topic.code === "1.3.2").cards.find((card) => card.id === "normalisation").objectives, ["1.3.2(a)", "1.3.2(c)"]);
});

test("missing content and supplementary concepts cannot become coverage or academic approval", () => {
  const topics = loadTopics();
  const rows = buildCoverage(topics, QUESTION_BANK, LABS);
  for (const id of ["1.1.3(c)", "1.2.2(b)", "1.2.3(c)", "1.4.1(b)", "1.4.1(e)", "1.4.1(f)", "1.4.1(h)", "1.4.3(a)"]) {
    const row = rows.find((item) => item.id === id);
    assert.equal(row.status, "missing", id);
    assert.equal(row.flashcards, 0, id);
    assert.ok(row.gaps.length, id);
  }
  assert.ok(rows.filter((row) => row.flashcards && row.componentId === "h446-01").every((row) => row.status === "published_unreviewed"));
  assert.ok(rows.filter((row) => row.componentId === "h446-01").every((row) => row.derivedMcqs === row.flashcards && row.authoredChoiceSets === 0));
  const background = topics.find((topic) => topic.code === "1.4.1").cards.find((card) => card.id === "number-bases");
  assert.equal(background.mappingStatus, "supplementary");
  assert.deepEqual(background.objectives, []);
  assert.ok(background.mappingNote);
});

test("coverage validation catches unmapped additions, stale IDs and cross-topic objectives", () => {
  const topics = loadTopics();
  assert.equal(validateCoverage(topics, QUESTION_BANK, LABS, review).valid, true);
  const added = structuredClone(topics);
  added[0].cards.push({ ...added[0].cards[0], id: "new-unmapped-card", objectives: [], mappingStatus: "unmapped" });
  assert.match(validateCoverage(added, QUESTION_BANK, LABS, review).errors.join("\n"), /Unmapped C1 concept/);
  const removed = structuredClone(topics);
  removed[0].cards.shift();
  assert.match(validateCoverage(removed, QUESTION_BANK, LABS, review).errors.join("\n"), /Stale C1 mapping/);
  const wrong = structuredClone(topics);
  wrong[0].cards[0].objectives = ["1.1.2(a)"];
  assert.match(validateCoverage(wrong, QUESTION_BANK, LABS, review).errors.join("\n"), /Invalid objective/);
});

test("quarantined content is not reported as published practice coverage", () => {
  const state = { ...review, quarantinedTopicIds: ["cs-1-1-1"] };
  const rows = buildCoverage(loadTopics(state), QUESTION_BANK, LABS, state);
  assert.ok(rows.filter((row) => row.code === "1.1.1").every((row) => row.status === "quarantined" && row.flashcards === 0 && row.writtenQuestions === 0 && row.appliedTasks === 0));
  const question = QUESTION_BANK[0];
  const conceptState = { ...review, quarantinedConceptIds: [question.conceptIds[0]] };
  const filtered = buildCoverage(loadTopics(conceptState), [question], LABS, conceptState);
  assert.ok(filtered.every((row) => row.writtenQuestions === 0));
});
