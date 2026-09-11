"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTopics } = require("./contentRepository");
const { buildReviewPack, contentFingerprint } = require("./contentReviewPack");
const { QUESTION_BANK } = require("../../exam-content");
const { LABS } = require("../../cs-labs");
const review = require("../../content-review.json");
const { REPAIR_LESSONS } = require("../../repair-lessons");

function fixture(extra = {}) {
  return { topics: loadTopics({ ...review, quarantinedConceptIds: [] }), questions: QUESTION_BANK, labs: LABS, review, generatedAt: "2026-09-08T12:00:00Z", ...extra };
}

test("C1 review packs contain authored choices and all worked-example drafts", () => {
  const source = fixture({ componentId: "h446-01" });
  const pack = buildReviewPack(source);
  for (const topic of source.topics.filter((item) => item.componentId === "h446-01")) {
    const text = pack.documents.find((item) => item.filename === `${topic.code}.md`).markdown;
    for (const card of topic.cards.filter((item) => item.quiz)) {
      assert.ok(text.includes(card.quiz.prompt));
      for (const option of card.quiz.options) assert.ok(text.includes(option));
      assert.ok(text.includes(card.quiz.explanation));
    }
    for (const item of REPAIR_LESSONS.filter((item) => item.topicId === topic.id)) {
      assert.ok(text.includes(item.id));
      item.checks.forEach((check) => assert.ok(text.includes(check.explanation)));
    }
  }
  assert.deepEqual(review.quizApprovals, []);
  assert.deepEqual(review.repairApprovals, []);
});

test("review packs contain the complete selected bank without fabricating approval", () => {
  const before = JSON.stringify(review);
  const source = fixture({ componentId: "h446-02" });
  const pack = buildReviewPack(source);
  assert.equal(pack.documents.length, 8);
  assert.equal(pack.manifest.topics.length, 8);
  for (const record of pack.manifest.topics) {
    const topic = source.topics.find((item) => item.id === record.topicId);
    const document = pack.documents.find((item) => item.filename === record.file).markdown;
    assert.equal(record.status, "awaiting_human_review");
    assert.equal(record.reviewer, "");
    assert.equal(record.reviewedAt, "");
    assert.ok(record.checks.every((item) => item.checked === false));
    assert.match(record.fingerprint, /^[a-f0-9]{64}$/);
    for (const card of topic.cards) {
      assert.ok(document.includes(`### ${card.id}\n`));
      assert.ok(document.includes(card.front));
      assert.ok(document.includes(card.back));
      for (const distractor of card.distractors) assert.ok(document.includes(distractor));
    }
    for (const question of QUESTION_BANK.filter((item) => item.topicId === topic.id)) {
      assert.ok(document.includes(question.id));
      for (const point of question.rubric) assert.ok(document.includes(point.description));
    }
    for (const lab of LABS.filter((item) => item.topicId === topic.id)) assert.ok(document.includes(lab.explanation));
  }
  assert.equal(JSON.stringify(review), before);
});

test("review fingerprints are deterministic and detect answer or rubric changes", () => {
  const source = fixture({ topicCode: "2.1.1" });
  const original = buildReviewPack(source).manifest.topics[0].fingerprint;
  assert.equal(buildReviewPack({ ...source, generatedAt: "2026-09-09T12:00:00Z" }).manifest.topics[0].fingerprint, original);
  const changed = structuredClone(source);
  changed.topics.find((topic) => topic.code === "2.1.1").cards[0].back += " Changed explanation.";
  assert.notEqual(buildReviewPack(changed).manifest.topics[0].fingerprint, original);
  const rubric = structuredClone(source);
  rubric.questions[0].rubric[0].description += " Changed rubric.";
  assert.notEqual(buildReviewPack(rubric).manifest.topics[0].fingerprint, original);
  const topic = source.topics[0];
  assert.equal(contentFingerprint(topic, [], []), contentFingerprint({ ...topic, reviewStatus: "academically_reviewed" }, [], []));
});

test("review selection rejects unknown topics and labels quarantined answers", () => {
  assert.throws(() => buildReviewPack(fixture({ topicCode: "9.9.9" })), /No topics/);
  const state = { ...review, quarantinedTopicIds: ["cs-2-1-1"] };
  const pack = buildReviewPack(fixture({ topicCode: "2.1.1", review: state }));
  assert.equal(pack.documents.length, 1);
  assert.match(pack.documents[0].markdown, /Publication status: quarantined/);
  assert.match(pack.documents[0].markdown, /WITHHELD: linked content is quarantined/);
});
