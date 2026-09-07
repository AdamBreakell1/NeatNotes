"use strict";
const { updateMemoryState } = require("../../learning-model");

function trustedSchedule(existing, evidence) {
  if (!evidence.some((item) => item.activity_type === "exam_response")) return existing;
  const reliable = evidence.filter((item) => item.activity_type !== "exam_response")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!reliable.length) return null;
  let state = {};
  for (const item of reliable) {
    const rating = item.score < 0.4 ? "again" : item.score < 0.65 ? "hard" : item.score < 0.85 ? "good" : "easy";
    state = updateMemoryState(state, rating, item.created_at);
  }
  return { ...existing, difficulty: state.difficulty, stability_days: state.stabilityDays,
    retrievability: state.retrievability, last_review_at: state.lastReviewAt,
    next_review_at: state.nextReviewAt, successful_retrievals: state.successfulRetrievals, lapses: state.lapses };
}
module.exports = { trustedSchedule };
