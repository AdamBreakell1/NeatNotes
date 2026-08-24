const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSession,
  calculateMastery,
  calculateRetrievability,
  getDueItems,
  updateMemoryState,
} = require("../../learning-model");

test("exam evidence carries more mastery value than passive note viewing", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");
  const passive = calculateMastery([
    { activityType: "note_view", score: 1, occurredAt: "2026-08-24T11:00:00.000Z" },
    { activityType: "note_view", score: 1, occurredAt: "2026-08-24T11:30:00.000Z" },
  ], now);
  const applied = calculateMastery([
    { activityType: "exam_response", score: 1, occurredAt: "2026-08-20T11:00:00.000Z" },
    { activityType: "short_answer", score: 1, occurredAt: "2026-08-24T11:30:00.000Z" },
  ], now);

  assert.ok(applied.score > passive.score);
  assert.equal(applied.state, "Secure");
});

test("high confidence with repeated incorrect answers flags a mismatch", () => {
  const mastery = calculateMastery([
    { activityType: "quick_quiz", correct: false, confidence: "confident", occurredAt: "2026-08-23" },
    { activityType: "short_answer", correct: false, confidence: "confident", occurredAt: "2026-08-24" },
  ], new Date("2026-08-24T12:00:00.000Z"));

  assert.equal(mastery.confidenceMismatch, true);
  assert.equal(mastery.state, "Misconception detected");
});

test("adaptive scheduler expands intervals after successful retrieval", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");
  const first = updateMemoryState({}, "good", now);
  const second = updateMemoryState(first, "easy", new Date("2026-08-25T12:00:00.000Z"));

  assert.ok(second.stabilityDays > first.stabilityDays);
  assert.ok(new Date(second.nextReviewAt) > new Date(second.lastReviewAt));
  assert.equal(calculateRetrievability(second, new Date(second.lastReviewAt)), 1);
});

test("due queue and session builder prioritise misconceptions and due work", () => {
  const now = new Date("2026-08-24T12:00:00.000Z");
  const items = [
    { conceptId: "mar", topicId: "1.1.1", nextReviewAt: "2026-08-20", evidence: [], misconceptionId: "MAR_MDR" },
    { conceptId: "cache", topicId: "1.1.1", nextReviewAt: "2026-09-01", evidence: [{ activityType: "exam_response", score: 1 }] },
    { conceptId: "sql", topicId: "1.3.2", nextReviewAt: "2026-08-21", evidence: [{ activityType: "quick_quiz", score: 0.4 }] },
  ];

  assert.deepEqual(getDueItems(items, now).map((item) => item.conceptId).sort(), ["mar", "sql"]);
  const session = buildSession({ items, durationMinutes: 5, now });
  assert.equal(session.items[0].conceptId, "mar");
  assert.equal(session.durationMinutes, 5);
});
