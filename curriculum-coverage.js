"use strict";

const SPECIFICATION = Object.freeze({ id: "ocr-h446", version: "3.0", checkedAt: "2026-09-07", url: "https://www.ocr.org.uk/images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf" });
const C1_RANGES = { "1.1.1": 5, "1.1.2": 3, "1.1.3": 4, "1.2.1": 8, "1.2.2": 6, "1.2.3": 3, "1.2.4": 5, "1.3.1": 4, "1.3.2": 6, "1.3.3": 5, "1.3.4": 4, "1.4.1": 10, "1.4.2": 3, "1.4.3": 5, "1.5.1": 4 };
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
  const rows = Object.entries(C1_RANGES).flatMap(([code, count]) => Array.from({ length: count }, (_, i) => ({ id: `${code}(${String.fromCharCode(97 + i)})`, code, title: `Specification objective ${String.fromCharCode(97 + i)}`, componentId: "h446-01" })));
  ["Computers in the workforce", "Automated decision making", "Artificial intelligence", "Environmental effects", "Censorship and the Internet", "Monitoring behaviour", "Analysis of personal information", "Piracy and offensive communications", "Layout, colour and character sets"].forEach((title, i) => rows.push({ id: `1.5.2[${i + 1}]`, code: "1.5.2", title, componentId: "h446-01", localReference: true }));
  Object.entries(C2_OBJECTIVES).forEach(([code, titles]) => titles.forEach((title, i) => rows.push({ id: `${code}(${String.fromCharCode(97 + i)})`, code, title, componentId: "h446-02" })));
  return rows;
}

function buildCoverage(topics, questions = [], labs = []) {
  return specificationObjectives().map((objective) => {
    const topic = topics.find((item) => item.code === objective.code);
    const cards = (topic?.cards || []).filter((card) => card.objectives?.includes(objective.id));
    const concepts = new Set(cards.map((card) => `${topic.id}:${card.id}`));
    return {
      ...objective, topicId: topic?.id || null,
      status: cards.length ? (topic.reviewStatus === "academically_reviewed" ? "academically_reviewed" : topic.reviewStatus === "review_pending" ? "draft" : "published_unreviewed") : "mapping_pending",
      flashcards: cards.length,
      derivedMcqs: cards.filter((card) => card.distractors?.length === 3).length,
      writtenQuestions: questions.filter((question) => question.conceptIds.some((id) => concepts.has(id))).length,
      appliedTasks: labs.filter((lab) => concepts.has(lab.conceptId)).length,
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
    for (const card of topic.cards) {
      if (topic.componentId !== "h446-02") continue;
      if (!card.objectives?.length) errors.push(`Missing objective: ${topic.id}:${card.id}`);
      for (const id of card.objectives || []) if (!objectives.has(id) || !id.startsWith(topic.code)) errors.push(`Invalid objective: ${id}`);
      for (const id of card.prerequisites || []) if (!concepts.has(id)) errors.push(`Missing prerequisite: ${id}`);
      if (!card.contentVersion || !card.commandWord || ![1, 2, 3].includes(card.difficulty) || !Array.isArray(card.commonMisconceptions)) errors.push(`Incomplete metadata: ${topic.id}:${card.id}`);
      if (card.distractors.length && (card.distractors.length !== 3 || new Set([card.back, ...card.distractors]).size !== 4)) errors.push(`Invalid choices: ${topic.id}:${card.id}`);
    }
  }
  for (const item of [...questions, ...labs]) {
    for (const id of item.conceptIds || [item.conceptId]) if (!concepts.has(id)) errors.push(`Unknown activity concept: ${item.id}: ${id}`);
  }
  for (const approval of review.academicApprovals) {
    const topic = topics.find((item) => item.id === approval.topicId);
    if (!topic || approval.contentVersion !== topic.contentVersion || !approval.reviewer?.trim() || !Number.isFinite(Date.parse(approval.reviewedAt)) || approval.decision !== "approved") errors.push(`Invalid academic approval: ${approval.topicId}`);
  }
  return { valid: !errors.length, errors };
}
module.exports = { SPECIFICATION, specificationObjectives, buildCoverage, validateCoverage };
