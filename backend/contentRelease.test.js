const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTopics, isReleased, hasAvailableConcepts } = require("./services/contentRepository");
const { buildCoverage, validateCoverage } = require("../curriculum-coverage");
const { QUESTION_BANK } = require("../exam-content");
const { LABS } = require("../cs-labs");
const review = require("../content-review.json");

test("C1 IDs are unchanged and owner-authorized C2 has mapped material without claiming academic review", () => {
  const topics = loadTopics();
  assert.equal(topics.filter((topic) => topic.componentId === "h446-01").reduce((n, t) => n + t.cards.length, 0), 347);
  assert.deepEqual(topics.filter((topic) => topic.componentId === "h446-02").map((topic) => topic.code), ["2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5", "2.2.1", "2.2.2", "2.3.1"]);
  const result = validateCoverage(topics, QUESTION_BANK, LABS, review);
  assert.equal(result.valid, true, result.errors.join("\n"));
  const coverage = buildCoverage(topics, QUESTION_BANK, LABS).filter((row) => row.componentId === "h446-02");
  assert.equal(coverage.length, 35);
  assert.ok(coverage.every((row) => row.flashcards > 0 && row.status === "published_unreviewed"));
  const c2 = topics.filter((topic) => topic.componentId === "h446-02");
  assert.equal(c2.reduce((total, topic) => total + topic.cards.length, 0), 127);
  assert.ok(c2.every((topic) => isReleased(topic, true) && topic.publicationAuthorization === "content_owner"));
  assert.equal(QUESTION_BANK.filter((item) => item.topicId.startsWith("cs-2-")).length, 16);
  assert.equal(LABS.filter((item) => item.topicId.startsWith("cs-2-")).length, 9);
});

test("drafts are blocked in production; version-specific human approval is required", () => {
  const pending = { ...review, publicationAuthorizations: [] };
  const topic = loadTopics(pending).find((item) => item.code === "2.1.1");
  assert.equal(isReleased(topic, false), true);
  assert.equal(isReleased(topic, true), false);
  const approved = { ...pending, academicApprovals: [{ topicId: topic.id, contentVersion: topic.contentVersion, reviewer: "Synthetic review fixture", reviewedAt: "2026-09-07T12:00:00Z", decision: "approved" }] };
  const reviewed = loadTopics(approved).find((item) => item.id === topic.id);
  assert.equal(isReleased(reviewed, true, approved), true);
  approved.academicApprovals[0].contentVersion = "old-version";
  assert.equal(isReleased(loadTopics(approved).find((item) => item.id === topic.id), true), false);
});

test("owner publication permission is version-specific and does not approve C1 quizzes or repairs", () => {
  const state = { ...review, publicationAuthorizations: review.publicationAuthorizations.map((entry) => ({ ...entry, contentVersion: "obsolete" })) };
  assert.ok(loadTopics(state).filter((topic) => topic.componentId === "h446-02").every((topic) => !isReleased(topic, true, state)));
  assert.deepEqual(review.academicApprovals, []);
  assert.deepEqual(review.quizApprovals, []);
  assert.deepEqual(review.repairApprovals, []);
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
