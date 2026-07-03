function calculateConfidenceSummary(attempts = []) {
  const totalAttempts = attempts.length;
  const confidentAttempts = attempts.filter((attempt) => attempt.confidence === "confident").length;
  const needsPracticeAttempts = attempts.filter((attempt) => attempt.confidence === "needs_practice").length;
  const correctAttempts = attempts.filter((attempt) => attempt.quiz_correct === 1).length;
  const incorrectAttempts = attempts.filter((attempt) => attempt.quiz_correct === 0).length;
  const percent = totalAttempts ? Math.round((confidentAttempts / totalAttempts) * 100) : 0;

  return {
    totalAttempts,
    confidentAttempts,
    needsPracticeAttempts,
    correctAttempts,
    incorrectAttempts,
    percent,
    band: getConfidenceBand(percent, totalAttempts),
    status: getConfidenceStatus(percent, totalAttempts),
  };
}

function getConfidenceBand(percent, totalAttempts) {
  if (!totalAttempts) return "Not started";
  if (percent >= 85) return "Secure";
  if (percent >= 60) return "Developing";
  return "Needs practice";
}

function getConfidenceStatus(percent, totalAttempts) {
  if (!totalAttempts) return "not-started";
  if (percent >= 85) return "secure";
  if (percent >= 60) return "developing";
  return "needs-practice";
}

function buildRevisionRecommendations(deckSummaries = []) {
  return deckSummaries
    .map((deck) => {
      const confidence = deck.confidence || calculateConfidenceSummary([]);
      const inactivityScore = deck.lastAttemptAt ? daysSince(deck.lastAttemptAt) : 999;
      const priority = getPriorityScore(confidence, inactivityScore);

      return {
        ...deck,
        priority,
        reason: getRecommendationReason(deck, confidence, inactivityScore),
      };
    })
    .sort((a, b) => b.priority - a.priority || String(a.code).localeCompare(String(b.code), undefined, { numeric: true }));
}

function getPriorityScore(confidence, inactivityScore) {
  const weakness = 100 - confidence.percent;
  const noPracticeBoost = confidence.totalAttempts ? 0 : 35;
  const recentMistakeBoost = confidence.needsPracticeAttempts * 4 + confidence.incorrectAttempts * 3;
  const inactivityBoost = Math.min(20, Math.floor(inactivityScore / 3));
  return weakness + noPracticeBoost + recentMistakeBoost + inactivityBoost;
}

function getRecommendationReason(deck, confidence, inactivityScore) {
  if (!confidence.totalAttempts) {
    return `${deck.code} has not been practised yet. Start here to build an initial confidence baseline.`;
  }

  if (confidence.percent < 60) {
    return `${deck.code} is currently ${confidence.percent}% secure, so it is a strong candidate for targeted revision.`;
  }

  if (inactivityScore >= 14) {
    return `${deck.code} has not been revisited for ${inactivityScore} days. A short review will help keep it fresh.`;
  }

  return `${deck.code} is developing. Another pass can move it towards secure mastery.`;
}

function daysSince(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 999;
  return Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
}

module.exports = {
  buildRevisionRecommendations,
  calculateConfidenceSummary,
  daysSince,
};
