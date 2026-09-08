"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { COMPONENT_TWO_TOPICS } = require("../../component-two");
const review = require("../../content-review.json");
const { mapComponentOneTopic } = require("../../component-one-mapping");

function loadTopics(reviewState = review) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../revision-topics.js"), "utf8"), sandbox, { timeout: 1000 });
  return [...sandbox.window.REVISION_TOPICS.map(mapComponentOneTopic), ...COMPONENT_TWO_TOPICS].map((topic) => ({
    ...topic, componentId: topic.componentId || "h446-01",
    reviewStatus: hasApproval(topic, reviewState) ? "academically_reviewed" : topic.reviewStatus || "published_unreviewed",
    cards: topic.cards.filter((card) => !reviewState.quarantinedConceptIds.includes(`${topic.id}:${card.id}`)),
  })).sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
}
function hasApproval(topic, reviewState = review) {
  return reviewState.academicApprovals.some((approval) => approval.topicId === topic.id
    && approval.contentVersion === topic.contentVersion && approval.reviewer?.trim()
    && Number.isFinite(Date.parse(approval.reviewedAt)) && approval.decision === "approved");
}
function isReleased(topic, production = process.env.NODE_ENV === "production", reviewState = review) {
  return Boolean(topic && (!production || topic.reviewStatus !== "review_pending") && !reviewState.quarantinedTopicIds.includes(topic.id));
}
function hasAvailableConcepts(activity, topics) {
  const topic = topics.find((item) => item.id === activity.topicId);
  const concepts = activity.conceptIds || [activity.conceptId];
  return Boolean(topic && concepts.length && concepts.every((id) => topic.cards.some((card) => `${topic.id}:${card.id}` === id)));
}
module.exports = { loadTopics, isReleased, hasApproval, hasAvailableConcepts };
