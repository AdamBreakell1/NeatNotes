const test = require("node:test");
const assert = require("node:assert/strict");
const { LABS, assessLab, validateLabs } = require("../cs-labs");

test("Computer Science labs cover eight distinct applied domains", () => {
  const result = validateLabs();
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.count, 8);
});

test("SQL lab accepts equivalent spacing and a trailing semicolon", () => {
  const lab = LABS.find((item) => item.id === "lab-sql-query");
  const result = assessLab(lab, "SELECT Name FROM Student WHERE Score >= 70 ORDER BY Name;");
  assert.equal(result.correct, true);
});

test("incorrect interactive prediction returns precise correction", () => {
  const lab = LABS.find((item) => item.id === "lab-cpu-fde");
  const result = assessLab(lab, "MDR");
  assert.equal(result.correct, false);
  assert.match(result.explanation, /PC contains the address/i);
});
