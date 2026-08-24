const test = require("node:test");
const assert = require("node:assert/strict");
const { QUESTION_BANK, markAnswer, validateQuestionBank } = require("../exam-content");

test("original exam bank has a valid rubric for every published question", () => {
  const result = validateQuestionBank();
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.count, 16);
});

test("rubric marking awards matched points and exposes missing reasoning", () => {
  const question = QUESTION_BANK.find((item) => item.id === "exam-111-mar-mdr");
  const result = markAnswer(question, "The MAR stores the address. The address bus carries it to memory. Data is placed in the MDR.");
  assert.equal(result.proposedMark, 3);
  assert.equal(result.maximumMark, 4);
  assert.equal(result.missing.length, 1);
  assert.equal(result.markingMethod, "deterministic_rubric");
});

test("rubric matching is case and punctuation insensitive", () => {
  const question = QUESTION_BANK.find((item) => item.id === "exam-143-demorgan");
  const result = markAnswer(question, "NOT A OR NOT B; it is true if A IS FALSE, including if both are false.");
  assert.equal(result.proposedMark, 3);
});
