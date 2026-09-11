"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTopics } = require("./services/contentRepository");
const { VERSION, COMPONENT_ONE_QUIZZES, attachAuthoredQuizzes, availableQuiz } = require("../component-one-quizzes");
const { REPAIR_LESSONS, isRepairReleased, publicRepair, assessRepair } = require("../repair-lessons");
const review = require("../content-review.json");

test("authored C1 quizzes cover every topic with unique, mapped options and explanations", () => {
  const topics = loadTopics();
  assert.equal(Object.keys(COMPONENT_ONE_QUIZZES).length, 16);
  assert.equal(Object.values(COMPONENT_ONE_QUIZZES).flat().length, 48);
  for (const [id, questions] of Object.entries(COMPONENT_ONE_QUIZZES)) {
    const topic = topics.find((item) => item.id === id);
    for (const question of questions) {
      assert.ok(topic.cards.some((card) => card.id === question.cardId));
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options.map((option) => option.trim().toLowerCase())).size, 4);
      assert.ok(question.prompt && question.explanation);
    }
  }
});

test("authored choices require their own version-specific approval, without blocking existing flashcards", () => {
  const topic = loadTopics()[0];
  const card = topic.cards.find((item) => item.quiz);
  assert.ok(availableQuiz(card, topic, false));
  assert.equal(availableQuiz(card, topic, true), null);
  assert.equal(topic.reviewStatus, "published_unreviewed");
  const approved = attachAuthoredQuizzes(topic, { quizApprovals: [{ topicId: topic.id, contentVersion: VERSION, reviewer: "Synthetic fixture", reviewedAt: "2026-09-11T12:00:00Z", decision: "approved" }] });
  assert.ok(availableQuiz(approved.cards.find((item) => item.quiz), approved, true));
  const stale = attachAuthoredQuizzes(topic, { quizApprovals: [{ topicId: topic.id, contentVersion: "old", reviewer: "Synthetic fixture", reviewedAt: "2026-09-11T12:00:00Z", decision: "approved" }] });
  assert.equal(availableQuiz(card, stale, true), null);
});

test("worked examples address the eight recorded gaps as drafts, not published coverage", () => {
  assert.equal(REPAIR_LESSONS.length, 9);
  for (const objective of ["1.1.3(c)", "1.2.2(b)", "1.2.3(c)", "1.4.1(b)", "1.4.1(e)", "1.4.1(f)", "1.4.1(h)", "1.4.3(a)"]) {
    assert.ok(REPAIR_LESSONS.some((lesson) => lesson.objective === objective));
  }
  for (const item of REPAIR_LESSONS) {
    assert.equal(item.steps.length, 3);
    assert.equal(item.checks.length, 2);
    assert.equal(isRepairReleased(item, review, true), false);
    assert.equal(isRepairReleased(item, review, false), true);
    assert.equal("checks" in publicRepair(item), false);
    item.checks.forEach((question, index) => {
      assert.equal(assessRepair(item, question.answer, index).correct, true);
      assert.equal(assessRepair(item, "not an answer", index).correct, false);
      assert.ok(question.explanation);
    });
  }
});

test("numeric worked checks are independently calculated", () => {
  const answers = Object.fromEntries(REPAIR_LESSONS.map((item) => [item.id, item.checks.map((q) => q.answer)]));
  assert.deepEqual(answers["repair-positive-binary"], [38, 73].map((n) => n.toString(2).padStart(8, "0")));
  assert.deepEqual(answers["repair-positive-hex"], [77, 94].map((n) => n.toString(16).toUpperCase()));
  assert.deepEqual(answers["repair-base-conversion"], [parseInt("10101111", 2).toString(16).toUpperCase(), parseInt("3C", 16).toString(2).padStart(8, "0")]);
  assert.deepEqual(answers["repair-floating-addition"], [String(0.5 * 2 ** 3 + 0.5 * 2 ** 2), String(0.75 * 2 ** 3 - 0.5 * 2 ** 2)]);
  assert.deepEqual(answers["repair-algorithm-trace"], [String([10, 4, 15, 11].filter((n) => n >= 10).length), String([10, 4, 15, 11].filter((n) => n > 10).length)]);
});

test("repair quarantine overrides local preview and an approval", () => {
  const item = REPAIR_LESSONS[0];
  const quarantined = { ...review, quarantinedConceptIds: [`${item.topicId}:${item.cardIds[0]}`], repairApprovals: [{ lessonId: item.id, contentVersion: item.contentVersion, reviewer: "Synthetic", reviewedAt: "2026-09-11T12:00:00Z", decision: "approved" }] };
  assert.equal(isRepairReleased(item, quarantined, false), false);
  assert.equal(isRepairReleased(item, quarantined, true), false);
});
