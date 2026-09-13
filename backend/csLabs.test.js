const test = require("node:test");
const assert = require("node:assert/strict");
const { LABS, assessLab, validateLabs } = require("../cs-labs");

test("Computer Science applied tasks cover both examined components", () => {
  const result = validateLabs();
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.count, 16);
  assert.equal(LABS.filter((lab) => lab.topicId.startsWith("cs-2-")).length, 9);
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

test("SQL evaluation rejects malformed, adversarial and wrong queries", () => {
  const lab = LABS.find((item) => item.id === "lab-sql-query");
  for (const query of [
    `${lab.answer} INVALID SQL`, `${lab.answer}; DROP TABLE Student`,
    `${lab.answer} DESC`, `${lab.answer} LIMIT 1`,
    "SELECT Name FROM Student WHERE Score > 70 ORDER BY Name",
    "SELECT Name FROM Student WHERE Score >= 70 ORDER BY Score",
    "ATTACH DATABASE '/tmp/notes.sqlite' AS app",
    "WITH RECURSIVE loop(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM loop) SELECT * FROM loop",
    "x".repeat(10000),
  ]) assert.equal(assessLab(lab, query).correct, false, query.slice(0, 120));
});

test("SQL evaluates equivalent queries against synthetic boundary cases", () => {
  const lab = LABS.find((item) => item.id === "lab-sql-query");
  for (const query of ["SELECT Name FROM Student WHERE Score > 69 ORDER BY Name ASC;", lab.answer]) {
    const result = assessLab(lab, query);
    assert.equal(result.correct, true);
    assert.equal(result.evaluationMethod, "constrained_sqlite");
  }
});
