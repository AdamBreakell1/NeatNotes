const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTopics, isReleased, hasAvailableConcepts } = require("./services/contentRepository");
const { buildCoverage, validateCoverage } = require("../curriculum-coverage");
const { QUESTION_BANK } = require("../exam-content");
const { LABS } = require("../cs-labs");
const review = require("../content-review.json");

test("C1 IDs are unchanged and C2 covers every objective with review-pending material", () => {
  const topics = loadTopics();
  assert.equal(topics.filter((topic) => topic.componentId === "h446-01").reduce((n, t) => n + t.cards.length, 0), 316);
  assert.deepEqual(topics.filter((topic) => topic.componentId === "h446-02").map((topic) => topic.code), ["2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5", "2.2.1", "2.2.2", "2.3.1"]);
  const result = validateCoverage(topics, QUESTION_BANK, LABS, review);
  assert.equal(result.valid, true, result.errors.join("\n"));
  const coverage = buildCoverage(topics, QUESTION_BANK, LABS).filter((row) => row.componentId === "h446-02");
  assert.equal(coverage.length, 35);
  assert.ok(coverage.every((row) => row.flashcards > 0 && row.status === "draft"));
});

test("drafts are blocked in production; version-specific human approval is required", () => {
  const topic = loadTopics().find((item) => item.code === "2.1.1");
  assert.equal(isReleased(topic, false), true);
  assert.equal(isReleased(topic, true), false);
  const approved = { ...review, academicApprovals: [{ topicId: topic.id, contentVersion: topic.contentVersion, reviewer: "Synthetic review fixture", reviewedAt: "2026-09-07T12:00:00Z", decision: "approved" }] };
  const reviewed = loadTopics(approved).find((item) => item.id === topic.id);
  assert.equal(isReleased(reviewed, true, approved), true);
  approved.academicApprovals[0].contentVersion = "old-version";
  assert.equal(isReleased(loadTopics(approved).find((item) => item.id === topic.id), true), false);
});

test("quarantine removes served concepts without changing stable IDs and overrides approval", () => {
  const topic = loadTopics()[0];
  const state = { ...review, quarantinedConceptIds: [`${topic.id}:${topic.cards[0].id}`], quarantinedTopicIds: [topic.id] };
  const filtered = loadTopics(state)[0];
  assert.equal(filtered.cards.length, topic.cards.length - 1);
  assert.equal(filtered.id, topic.id);
  assert.equal(isReleased(filtered, false, state), false);
});

test("quarantining a concept also withdraws dependent written questions and labs", () => {
  const question = QUESTION_BANK[0];
  const lab = LABS[0];
  const topics = loadTopics();
  assert.equal(hasAvailableConcepts(question, topics), true);
  assert.equal(hasAvailableConcepts(lab, topics), true);
  const filtered = loadTopics({ ...review, quarantinedConceptIds: [question.conceptIds[0], lab.conceptId] });
  assert.equal(hasAvailableConcepts(question, filtered), false);
  assert.equal(hasAvailableConcepts(lab, filtered), false);
});
