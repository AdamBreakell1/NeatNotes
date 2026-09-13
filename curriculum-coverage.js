"use strict";

const { COMPONENT_ONE_MAPPING, SUPPLEMENTARY_CARDS, componentOneObjectives } = require("./component-one-mapping");
const defaultReview = require("./content-review.json");
const { availableQuiz } = require("./component-one-quizzes");
const SPECIFICATION = Object.freeze({ id: "ocr-h446", version: "3.0", checkedAt: "2026-09-13", url: "https://www.ocr.org.uk/images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf" });
const C2_OBJECTIVES = {
  "2.1.1": ["Nature of abstraction", "Need for abstraction", "Model versus reality", "Devise an abstract model"],
  "2.1.2": ["Inputs and outputs", "Preconditions", "Caching", "Reusable components"],
  "2.1.3": ["Identify problem components", "Identify solution components", "Order solution steps", "Identify sub-procedures"],
  "2.1.4": ["Identify decisions", "Determine logical conditions", "Effect of decisions on flow"],
  "2.1.5": ["Identify concurrent parts", "Benefits and trade-offs of concurrency"],
  "2.2.1": ["Programming constructs", "Recursion and iteration", "Global and local scope", "Modularity and parameters", "IDE facilities", "Object-oriented techniques"],
  "2.2.2": ["Computationally solvable problems", "Problem recognition", "Decomposition", "Divide and conquer", "Abstraction", "Problem-solving techniques and methods"],
  "2.3.1": ["Design and analyse algorithms", "Time and space suitability", "Big O growth", "Compare algorithms", "Data structures and traversals", "Standard searching, sorting and pathfinding algorithms"],
};

function specificationObjectives() {
  const rows = componentOneObjectives();
  Object.entries(C2_OBJECTIVES).forEach(([code, titles]) => titles.forEach((title, i) => rows.push({ id: `${code}(${String.fromCharCode(97 + i)})`, code, title, componentId: "h446-02" })));
  return rows;
}

function buildCoverage(topics, questions = [], labs = [], review = defaultReview) {
  const quarantinedTopics = new Set(review.quarantinedTopicIds);
  const quarantinedConcepts = new Set(review.quarantinedConceptIds);
  const availableConcepts = new Set(topics.filter((topic) => !quarantinedTopics.has(topic.id)).flatMap((topic) => topic.cards.map((card) => `${topic.id}:${card.id}`)).filter((id) => !quarantinedConcepts.has(id)));
  const availableQuestions = questions.filter((question) => question.conceptIds.length && question.conceptIds.every((id) => availableConcepts.has(id)));
  const availableLabs = labs.filter((lab) => availableConcepts.has(lab.conceptId));
  return specificationObjectives().map((objective) => {
    const topic = topics.find((item) => item.code === objective.code);
    const withheld = quarantinedTopics.has(topic?.id);
    const cards = (topic?.cards || []).filter((card) => availableConcepts.has(`${topic.id}:${card.id}`) && card.objectives?.includes(objective.id));
    const concepts = new Set(cards.map((card) => `${topic.id}:${card.id}`));
    return {
      ...objective, topicId: topic?.id || null,
      status: withheld ? "quarantined" : cards.length ? (topic.reviewStatus === "academically_reviewed" ? "academically_reviewed" : topic.reviewStatus === "review_pending" ? "draft" : "published_unreviewed") : objective.mappingComplete ? "missing" : "mapping_pending",
      flashcards: cards.length,
      derivedMcqs: topic?.reviewStatus === "review_pending" ? 0 : cards.filter((card) => availableQuiz(card, topic, true)).length,
      authoredChoiceSets: cards.filter((card) => card.distractors?.length === 3).length,
      writtenQuestions: availableQuestions.filter((question) => question.objectives?.includes(objective.id)).length,
      appliedTasks: availableLabs.filter((lab) => lab.objectives?.includes(objective.id)).length,
      contentVersion: topic?.contentVersion || "legacy-c1",
      conceptIds: [...concepts],
    };
  });
}

function validateCoverage(topics, questions, labs, review) {
  const errors = [];
  const objectives = new Set(specificationObjectives().map((item) => item.id));
  const concepts = new Set(topics.flatMap((topic) => topic.cards.map((card) => `${topic.id}:${card.id}`)));
  for (const topic of topics) {
    if (topic.componentId === "h446-01") {
      const mapping = COMPONENT_ONE_MAPPING[topic.code];
      const supplementary = SUPPLEMENTARY_CARDS[topic.code];
      const expectedIds = new Set([...Object.values(mapping || {}).flatMap((row) => row.cards), ...(supplementary?.cards || [])]);
      const presentIds = new Set(topic.cards.map((card) => card.id));
      for (const id of expectedIds) if (!presentIds.has(id)) errors.push(`Stale C1 mapping: ${topic.id}:${id}`);
      for (const card of topic.cards) {
        if (!expectedIds.has(card.id) || !["mapped", "supplementary"].includes(card.mappingStatus) || (!card.objectives?.length && !(supplementary?.cards.includes(card.id) && card.mappingNote))) errors.push(`Unmapped C1 concept: ${topic.id}:${card.id}`);
      }
    }
    for (const card of topic.cards) {
      for (const id of card.objectives || []) if (!objectives.has(id) || !id.startsWith(`${topic.code}(`) && !id.startsWith(`${topic.code}[`)) errors.push(`Invalid objective: ${id}`);
      for (const id of card.prerequisites || []) if (!concepts.has(id)) errors.push(`Missing prerequisite: ${id}`);
      if (topic.componentId !== "h446-02") continue;
      if (!card.objectives?.length) errors.push(`Missing objective: ${topic.id}:${card.id}`);
      if (!card.contentVersion || !card.commandWord || ![1, 2, 3].includes(card.difficulty) || !Array.isArray(card.commonMisconceptions)) errors.push(`Incomplete metadata: ${topic.id}:${card.id}`);
      if (card.distractors.length && (card.distractors.length !== 3 || new Set([card.back, ...card.distractors]).size !== 4)) errors.push(`Invalid choices: ${topic.id}:${card.id}`);
    }
  }
  for (const item of [...questions, ...labs]) {
    for (const id of item.conceptIds || [item.conceptId]) if (!concepts.has(id)) errors.push(`Unknown activity concept: ${item.id}: ${id}`);
    const topic = topics.find((row) => row.id === item.topicId);
    if (!item.objectives?.length) errors.push(`Missing activity objective: ${item.id}`);
    for (const id of item.objectives || []) {
      if (!objectives.has(id) || !topic || !(id.startsWith(`${topic.code}(`) || id.startsWith(`${topic.code}[`))) errors.push(`Invalid activity objective: ${item.id}: ${id}`);
    }
  }
  for (const approval of review.academicApprovals) {
    const topic = topics.find((item) => item.id === approval.topicId);
    if (!topic || approval.contentVersion !== topic.contentVersion || !approval.reviewer?.trim() || !Number.isFinite(Date.parse(approval.reviewedAt)) || approval.decision !== "approved") errors.push(`Invalid academic approval: ${approval.topicId}`);
  }
  return { valid: !errors.length, errors };
}
module.exports = { SPECIFICATION, specificationObjectives, buildCoverage, validateCoverage };
