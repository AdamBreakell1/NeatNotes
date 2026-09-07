const { buildContentModel, validateContentModel } = require("../ocr-content");
const { validateCoverage } = require("../curriculum-coverage");
const { QUESTION_BANK } = require("../exam-content");
const { LABS } = require("../cs-labs");
const review = require("../content-review.json");

const { loadTopics } = require("../backend/services/contentRepository");
const result = validateContentModel(buildContentModel(loadTopics()));
const coverage = validateCoverage(loadTopics({ ...review, quarantinedConceptIds: [] }), QUESTION_BANK, LABS, review);
result.errors.push(...coverage.errors);
result.valid = result.valid && coverage.valid;
if (!result.valid) {
  console.error(result.errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`OCR content valid: ${result.counts.topics} topics, ${result.counts.concepts} concepts.`);
}
