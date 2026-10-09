"use strict";

// A deliberately bounded SQL lesson grammar. Only a reconstructed SELECT reaches
// a statement-local synthetic table. User input cannot name application tables,
// files or functions, even when using the managed application SQLite connection.
function evaluateStudentQuery(input, injectedDatabase) {
  const text = String(input || "").trim();
  const match = text.length <= 500 && text.match(/^select\s+name\s+from\s+student\s+where\s+score\s*(>=|<=|<>|!=|=|>|<)\s*(-?\d{1,3})\s+order\s+by\s+name(?:\s+(asc|desc))?\s*;?$/i);
  if (!match) return { correct: false, evaluationMethod: "constrained_sqlite", detail: "Use one SELECT Name FROM Student query, a Score comparison and ORDER BY Name. Extra statements and other SQL constructs are outside this exercise." };
  const db = injectedDatabase || new (require("node:sqlite").DatabaseSync)(":memory:");
  try {
    const fixture = "WITH Student(Name, Score) AS (VALUES ('Zara',70),('Asha',92),('Ben',69),('Mina',71),('Sam',0),('Leo',100)) ";
    const rows = db.prepare(`${fixture}SELECT Name FROM Student WHERE Score ${match[1]} ? ORDER BY Name ${match[3]?.toUpperCase() || "ASC"}`).all(Number(match[2]));
    const expected = db.prepare(`${fixture}SELECT Name FROM Student WHERE Score >= 70 ORDER BY Name`).all();
    return { correct: JSON.stringify(rows) === JSON.stringify(expected), evaluationMethod: "constrained_sqlite", rows: rows.map((row) => row.Name), detail: "Evaluated on a synthetic dataset including scores just below, at and above 70." };
  } finally {
    if (!injectedDatabase) db.close();
  }
}

module.exports = { evaluateStudentQuery };
