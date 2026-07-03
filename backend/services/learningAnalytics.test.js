const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRevisionRecommendations, calculateConfidenceSummary } = require("./learningAnalytics");

test("calculateConfidenceSummary returns a clear confidence percentage", () => {
  const summary = calculateConfidenceSummary([
    { confidence: "confident", quiz_correct: 1 },
    { confidence: "confident", quiz_correct: 1 },
    { confidence: "needs_practice", quiz_correct: 0 },
  ]);

  assert.equal(summary.totalAttempts, 3);
  assert.equal(summary.confidentAttempts, 2);
  assert.equal(summary.needsPracticeAttempts, 1);
  assert.equal(summary.percent, 67);
  assert.equal(summary.band, "Developing");
});

test("buildRevisionRecommendations prioritises weak and unstarted topics", () => {
  const recommendations = buildRevisionRecommendations([
    {
      id: "secure",
      code: "1.1.1",
      title: "Secure topic",
      confidence: calculateConfidenceSummary([{ confidence: "confident" }]),
      lastAttemptAt: new Date().toISOString(),
    },
    {
      id: "weak",
      code: "1.1.2",
      title: "Weak topic",
      confidence: calculateConfidenceSummary([{ confidence: "needs_practice", quiz_correct: 0 }]),
      lastAttemptAt: new Date().toISOString(),
    },
    {
      id: "new",
      code: "1.1.3",
      title: "New topic",
      confidence: calculateConfidenceSummary([]),
      lastAttemptAt: null,
    },
  ]);

  assert.equal(recommendations[0].id, "new");
  assert.equal(recommendations[1].id, "weak");
  assert.match(recommendations[0].reason, /not been practised/i);
});
