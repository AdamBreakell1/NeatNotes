"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { COMPONENT_TWO_TOPICS } = require("../../component-two");
const review = require("../../content-review.json");
const { mapComponentOneTopic } = require("../../component-one-mapping");
const { attachAuthoredQuizzes } = require("../../component-one-quizzes");

function loadTopics(reviewState = review) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../../revision-topics.js"), "utf8"), sandbox, { timeout: 1000 });
  return [...sandbox.window.REVISION_TOPICS.map(mapComponentOneTopic).map((topic) => attachAuthoredQuizzes(topic, reviewState)), ...COMPONENT_TWO_TOPICS].map((topic) => ({
    ...topic, componentId: topic.componentId || "h446-01",
    reviewStatus: hasApproval(topic, reviewState) ? "academically_reviewed" : hasPublicationAuthorization(topic, reviewState) ? "published_unreviewed" : topic.reviewStatus || "published_unreviewed",
    publicationAuthorization: hasPublicationAuthorization(topic, reviewState) ? "content_owner" : null,
    cards: topic.cards.filter((card) => !reviewState.quarantinedConceptIds.includes(`${topic.id}:${card.id}`))
      .map((card) => hasPublicationAuthorization(topic, reviewState) ? { ...card, reviewStatus: "published_unreviewed" } : card),
  })).sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
}
function hasApproval(topic, reviewState = review) {
  return reviewState.academicApprovals.some((approval) => approval.topicId === topic.id
    && approval.contentVersion === topic.contentVersion && approval.reviewer?.trim()
    && Number.isFinite(Date.parse(approval.reviewedAt)) && approval.decision === "approved");
}
// Owner publication permission is not an independent academic review.
function hasPublicationAuthorization(topic, reviewState = review) {
  return (reviewState.publicationAuthorizations || []).some((entry) => entry.topicId === topic.id
    && entry.contentVersion === topic.contentVersion && entry.authority === "content_owner"
    && entry.decision === "publish" && Number.isFinite(Date.parse(entry.authorizedAt)));
}
function isReleased(topic, production = process.env.NODE_ENV === "production", reviewState = review) {
  return Boolean(topic && (!production || topic.reviewStatus !== "review_pending") && !reviewState.quarantinedTopicIds.includes(topic.id));
}
function hasAvailableConcepts(activity, topics) {
  const topic = topics.find((item) => item.id === activity.topicId);
  const concepts = activity.conceptIds || [activity.conceptId];
  return Boolean(topic && concepts.length && concepts.every((id) => topic.cards.some((card) => `${topic.id}:${card.id}` === id)));
}
module.exports = { loadTopics, isReleased, hasApproval, hasPublicationAuthorization, hasAvailableConcepts };
