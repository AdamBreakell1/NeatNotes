(function initLearningModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NEAT_LEARNING_MODEL = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createLearningModel() {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const TARGET_RETRIEVABILITY = 0.88;
  const EVIDENCE_WEIGHTS = Object.freeze({
    note_view: 0.08,
    flashcard_reveal: 0.16,
    flashcard_rating: 0.34,
    multiple_choice: 0.46,
    quick_quiz: 0.52,
    free_recall: 0.68,
    short_answer: 0.72,
    applied_question: 0.86,
    algorithm_trace: 0.9,
    interactive_lab: 0.82,
    exam_response: 1,
    correction: 0.78,
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function toDate(value, fallback = new Date()) {
    const date = value instanceof Date ? value : new Date(value || fallback);
    return Number.isFinite(date.getTime()) ? date : new Date(fallback);
  }

  function getEvidenceWeight(activityType) {
    return EVIDENCE_WEIGHTS[activityType] || 0.3;
  }

  function getEvidenceOutcome(evidence) {
    if (Number.isFinite(Number(evidence.score))) return clamp(Number(evidence.score), 0, 1);
    if (typeof evidence.correct === "boolean") return evidence.correct ? 1 : 0;
    if (evidence.quizCorrect === true || evidence.quiz_correct === 1) return 1;
    if (evidence.quizCorrect === false || evidence.quiz_correct === 0) return 0;
    const rating = String(evidence.rating || evidence.confidence || "").toLowerCase();
    if (["easy", "confident", "got_it", "got it"].includes(rating)) return 0.86;
    if (["good", "hard"].includes(rating)) return rating === "good" ? 0.72 : 0.5;
    if (["again", "needs_practice", "needs practice"].includes(rating)) return 0.18;
    return 0.5;
  }

  function getConfidenceValue(value) {
    const confidence = String(value || "").toLowerCase();
    if (["easy", "confident", "high", "3"].includes(confidence)) return 1;
    if (["good", "medium", "2"].includes(confidence)) return 0.66;
    if (["hard", "low", "1"].includes(confidence)) return 0.33;
    if (["again", "needs_practice", "needs practice", "0"].includes(confidence)) return 0.12;
    return null;
  }

  function calculateRetrievability(memoryState = {}, now = new Date()) {
    if (!memoryState.lastReviewAt) return 0;
    const stabilityDays = Math.max(0.25, Number(memoryState.stabilityDays) || 0.25);
    const elapsedDays = Math.max(0, (toDate(now).getTime() - toDate(memoryState.lastReviewAt).getTime()) / DAY_MS);
    return clamp(Math.exp(-elapsedDays / stabilityDays), 0, 1);
  }

  function calculateNextReview(memoryState, rating, now = new Date()) {
    const updated = updateMemoryState(memoryState, rating, now);
    return updated.nextReviewAt;
  }

  function updateMemoryState(previous = {}, rating = "good", now = new Date()) {
    const reviewedAt = toDate(now);
    const normalizedRating = ["again", "hard", "good", "easy"].includes(rating) ? rating : "good";
    const previousStability = Math.max(0.35, Number(previous.stabilityDays) || 0.7);
    const previousDifficulty = clamp(Number(previous.difficulty) || 5, 1, 10);
    const previousRetrievability = previous.lastReviewAt ? calculateRetrievability(previous, reviewedAt) : 0.5;
    const successful = normalizedRating !== "again";

    const difficultyShift = { again: 1.15, hard: 0.45, good: -0.18, easy: -0.55 }[normalizedRating];
    const difficulty = clamp(previousDifficulty + difficultyShift, 1, 10);
    const growth = {
      again: 0.42,
      hard: 1.35,
      good: 2.15,
      easy: 3.15,
    }[normalizedRating];
    const desirableDifficulty = 0.72 + (1 - previousRetrievability) * 0.65;
    const difficultyPenalty = 1 - (difficulty - 1) * 0.045;
    const stabilityDays = normalizedRating === "again"
      ? Math.max(0.35, previousStability * growth)
      : clamp(previousStability * growth * desirableDifficulty * difficultyPenalty, 0.5, 180);
    const intervalDays = Math.max(0.25, -stabilityDays * Math.log(TARGET_RETRIEVABILITY));
    const nextReviewAt = new Date(reviewedAt.getTime() + intervalDays * DAY_MS).toISOString();

    return {
      difficulty: Math.round(difficulty * 100) / 100,
      stabilityDays: Math.round(stabilityDays * 100) / 100,
      retrievability: 1,
      lastReviewAt: reviewedAt.toISOString(),
      nextReviewAt,
      successfulRetrievals: (Number(previous.successfulRetrievals) || 0) + (successful ? 1 : 0),
      lapses: (Number(previous.lapses) || 0) + (successful ? 0 : 1),
    };
  }

  function calculateMastery(evidence = [], now = new Date()) {
    const validEvidence = evidence
      .filter(Boolean)
      .map((item) => ({ ...item, occurredAt: toDate(item.occurredAt || item.createdAt || item.created_at, now) }))
      .sort((a, b) => a.occurredAt - b.occurredAt);

    if (!validEvidence.length) {
      return {
        score: 0,
        state: "New",
        confidence: null,
        confidenceMismatch: false,
        evidenceCount: 0,
        activityTypes: [],
        lastPractisedAt: null,
      };
    }

    let weightedScore = 0;
    let totalWeight = 0;
    let confidenceScore = 0;
    let confidenceWeight = 0;
    const activityTypes = new Set();
    const sessionDays = new Set();
    const currentTime = toDate(now).getTime();

    validEvidence.forEach((item) => {
      const ageDays = Math.max(0, (currentTime - item.occurredAt.getTime()) / DAY_MS);
      const recency = Math.max(0.35, Math.exp(-ageDays / 45));
      const weight = getEvidenceWeight(item.activityType || item.source) * recency * clamp(item.difficulty || 1, 0.6, 1.4);
      weightedScore += getEvidenceOutcome(item) * weight;
      totalWeight += weight;
      activityTypes.add(item.activityType || item.source || "unknown");
      sessionDays.add(item.occurredAt.toISOString().slice(0, 10));

      const confidence = getConfidenceValue(item.confidence || item.rating);
      if (confidence !== null) {
        confidenceScore += confidence;
        confidenceWeight += 1;
      }
    });

    const diversityBonus = Math.min(0.08, Math.max(0, activityTypes.size - 1) * 0.025);
    const spacingBonus = Math.min(0.08, Math.max(0, sessionDays.size - 1) * 0.02);
    // Correct low-effort exposure is weak evidence; reliable mastery needs enough
    // weighted retrieval, not merely a high average from passive interactions.
    const evidenceSufficiency = 1 - Math.exp(-totalWeight / 0.8);
    const score = Math.round(clamp(
      (weightedScore / Math.max(totalWeight, 0.01)) * evidenceSufficiency + diversityBonus + spacingBonus,
      0,
      1,
    ) * 100);
    const confidence = confidenceWeight ? Math.round((confidenceScore / confidenceWeight) * 100) : null;
    const latest = validEvidence[validEvidence.length - 1];
    const daysSincePractice = Math.max(0, (currentTime - latest.occurredAt.getTime()) / DAY_MS);
    const memoryState = latest.memoryState || null;
    const due = memoryState?.nextReviewAt ? toDate(memoryState.nextReviewAt).getTime() <= currentTime : daysSincePractice >= 14;
    const recentIncorrect = validEvidence.slice(-3).filter((item) => getEvidenceOutcome(item) < 0.5).length;
    const confidenceMismatch = confidence !== null && confidence >= 72 && recentIncorrect >= 2;

    let state = "Learning";
    if (confidenceMismatch) state = "Misconception detected";
    else if (due && score >= 62) state = "Due for review";
    else if (score >= 78 && activityTypes.size >= 2 && sessionDays.size >= 2) state = "Secure";
    else if (score >= 52) state = "Fragile";

    return {
      score,
      state,
      confidence,
      confidenceMismatch,
      evidenceCount: validEvidence.length,
      activityTypes: [...activityTypes],
      lastPractisedAt: latest.occurredAt.toISOString(),
    };
  }

  function getDueItems(items = [], now = new Date()) {
    const time = toDate(now).getTime();
    return items
      .filter((item) => !item.nextReviewAt || toDate(item.nextReviewAt).getTime() <= time)
      .map((item) => ({
        ...item,
        retrievability: calculateRetrievability(item.memoryState || item, now),
      }))
      .sort((a, b) => a.retrievability - b.retrievability || String(a.conceptId).localeCompare(String(b.conceptId)));
  }

  function buildSession({ items = [], durationMinutes = 15, now = new Date(), teacherPriorities = [] } = {}) {
    const allowedMinutes = clamp(durationMinutes, 5, 60);
    const itemBudget = Math.max(4, Math.round(allowedMinutes * 0.7));
    const priorities = new Set(teacherPriorities);
    const ranked = items
      .map((item) => {
        const mastery = item.mastery || calculateMastery(item.evidence || [], now);
        const due = !item.nextReviewAt || toDate(item.nextReviewAt).getTime() <= toDate(now).getTime();
        const weakness = 100 - mastery.score;
        const misconceptionBoost = mastery.confidenceMismatch || item.misconceptionId ? 45 : 0;
        const dueBoost = due ? 30 : 0;
        const teacherBoost = priorities.has(item.conceptId) ? 25 : 0;
        const priority = weakness + misconceptionBoost + dueBoost + teacherBoost;
        const reason = misconceptionBoost
          ? "Recent answers suggest a misconception needs repairing."
          : teacherBoost
            ? "Your teacher has marked this as a priority."
            : due
              ? "This concept is due for adaptive spaced review."
              : mastery.score < 55
                ? "Recent evidence is fragile."
                : "This adds older-topic retrieval to the session.";
        return { ...item, mastery, due, priority, reason };
      })
      .sort((a, b) => b.priority - a.priority);

    const selected = [];
    const usedTopics = new Map();
    for (const item of ranked) {
      if (selected.length >= itemBudget) break;
      const topicCount = usedTopics.get(item.topicId) || 0;
      if (topicCount >= Math.ceil(itemBudget * 0.55) && ranked.some((candidate) => (usedTopics.get(candidate.topicId) || 0) === 0)) continue;
      selected.push(item);
      usedTopics.set(item.topicId, topicCount + 1);
    }

    return {
      durationMinutes: allowedMinutes,
      itemBudget,
      items: selected,
      reasons: [...new Set(selected.map((item) => item.reason))],
    };
  }

  return {
    DAY_MS,
    EVIDENCE_WEIGHTS,
    TARGET_RETRIEVABILITY,
    buildSession,
    calculateMastery,
    calculateNextReview,
    calculateRetrievability,
    getDueItems,
    getEvidenceOutcome,
    getEvidenceWeight,
    updateMemoryState,
  };
});
