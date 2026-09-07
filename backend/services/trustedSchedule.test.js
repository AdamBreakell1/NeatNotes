const test = require("node:test");
const assert = require("node:assert/strict");
const { trustedSchedule } = require("./trustedSchedule");

test("legacy keyword exam marks cannot extend a review interval or count as successful retrieval", () => {
  const inflated = { stability_days: 999, successful_retrievals: 50 };
  const exam = { activity_type: "exam_response", score: 1, created_at: "2026-09-01T12:00:00Z" };
  assert.equal(trustedSchedule(inflated, [exam]), null);
  const real = { activity_type: "flashcard_rating", score: 0.72, created_at: "2026-09-02T12:00:00Z" };
  const rebuilt = trustedSchedule(inflated, [exam, real]);
  assert.equal(rebuilt.successful_retrievals, 1);
  assert.ok(rebuilt.stability_days < 999);
  assert.equal(trustedSchedule(inflated, [real]), inflated);
  assert.equal(inflated.successful_retrievals, 50);
});
