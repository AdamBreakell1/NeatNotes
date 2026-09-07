const test = require("node:test");
const assert = require("node:assert/strict");
const { QUESTION_BANK, markAnswer, validateQuestionBank } = require("../exam-content");

test("original exam bank has a valid rubric for every published question", () => {
  const result = validateQuestionBank();
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.count, 32);
});

test("written answers receive guidance without an unvalidated semantic mark", () => {
  const question = QUESTION_BANK.find((item) => item.id === "exam-111-mar-mdr");
  const result = markAnswer(question, "The MAR stores the address. The address bus carries it to memory. Data is placed in the MDR.");
  assert.equal(result.proposedMark, null);
  assert.equal(result.maximumMark, 4);
  assert.equal(result.checklist.length, 4);
  assert.equal(result.markingMethod, "guided_self_assessment");
});

test("semantic benchmark never mistakes token overlap for validated evidence", () => {
  const question = QUESTION_BANK.find((item) => item.id === "exam-143-demorgan");
  for (const answer of [
    "NOT A OR NOT B; it is true if A IS FALSE, including if both are false.",
    "The MAR does not store the address. The address bus is not used. The MDR does not store data from memory. The data bus is not used.",
    "address MAR memory MDR data bus " .repeat(20),
    "Either input being false makes the negated conjunction true.",
    "Both inputs are true.", "400 kHz", "adress memmory", "I enjoy studying on Tuesdays.",
  ]) {
    const first = markAnswer(question, answer);
    assert.equal(first.proposedMark, null);
    assert.equal(first.validated, false);
    assert.deepEqual(first, markAnswer(question, answer));
  }
});
