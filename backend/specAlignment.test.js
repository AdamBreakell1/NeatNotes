"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { loadTopics } = require("./services/contentRepository");
const { QUESTION_BANK } = require("../exam-content");
const { LABS } = require("../cs-labs");
const { buildCoverage, validateCoverage } = require("../curriculum-coverage");
const review = require("../content-review.json");
const topics = loadTopics();
const card = (code, id) => topics.find((t) => t.code === code).cards.find((c) => c.id === id);

test("original fixed-width integer examples distinguish signed overflow from carry-out", () => {
  assert.match(card("1.4.1", "positive-binary-worked").back, new RegExp((182).toString(2)));
  assert.match(card("1.4.1", "positive-hex-worked").back, new RegExp((125).toString(16).toUpperCase()));
  assert.match(card("1.4.1", "base-conversion-worked").back, new RegExp(parseInt("10110110", 2).toString(16).toUpperCase()));
  assert.match(card("1.4.1", "signed-integer-worked").back, new RegExp((256 - 19).toString(2)));
  const sum = parseInt("01100100", 2) + parseInt("00101101", 2);
  assert.equal(sum < 256 && sum > 127, true); // signed overflow without a carry out
  const answer = card("1.4.1", "binary-signed-overflow").back;
  assert.ok(answer.includes(sum.toString(2)) && answer.includes(String(sum - 256)));
  assert.match(card("1.4.1", "binary-addition").back, /signed.*separately/);
  assert.doesNotMatch(card("1.4.1", "binary-subtraction").back, /ignore any overflow/);
});

function decode(bits) {
  const [mantissa, exponent] = bits.split(" ");
  const signed = (value) => parseInt(value, 2) - (value[0] === "1" ? 2 ** value.length : 0);
  return signed(mantissa) / 2 ** (mantissa.length - 1) * 2 ** signed(exponent);
}
test("signed floating-point examples use the stated widths and preserve value while aligning", () => {
  const subtraction = card("1.4.1", "floating-subtract-worked");
  const addition = card("1.4.1", "floating-negative-add");
  assert.equal(decode("10100 0011"), -6);
  assert.equal(decode("01100 0011") - decode("01000 0010"), decode("01000 0011"));
  assert.equal(decode("01100 0011") + decode("11000 0010"), decode("01000 0011"));
  assert.equal(decode("11100 0011"), decode("11000 0010")); // arithmetic shift, not zero-fill
  for (const item of [subtraction, addition]) {
    assert.ok(item.back.includes("01000 0011"));
    assert.deepEqual(item.objectives, ["1.4.1(h)"]);
  }
  assert.match(card("1.4.1", "floating-representation-worked").back, /-6/);
});

test("round-robin, bubble-pass and tree-traversal answers match independently executed steps", () => {
  const queue = [["P", 5], ["Q", 2], ["R", 1]], steps = [];
  let time = 0;
  while (queue.length) {
    const [id, remaining] = queue.shift(), duration = Math.min(remaining, 2);
    steps.push(`${time}-${time + duration}`);
    time += duration;
    if (remaining > duration) queue.push([id, remaining - duration]);
  }
  for (const step of steps) assert.ok(card("1.2.1", "round-robin-trace").back.includes(step));
  const values = [17, 5, 12, 3];
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] > values[i + 1]) [values[i], values[i + 1]] = [values[i + 1], values[i]];
    assert.ok(card("2.3.1", "bubble-pass-original").back.includes(JSON.stringify(values)));
  }
  const tree = { M: ["F", "T"], F: ["C", "H"], T: ["R"], C: [], H: [], R: [] };
  const postorder = (node) => [...tree[node].flatMap(postorder), node];
  const breadth = [], frontier = ["M"];
  while (frontier.length) { const node = frontier.shift(); breadth.push(node); frontier.push(...tree[node]); }
  const answer = card("2.3.1", "postorder-original").back;
  assert.ok(answer.includes(postorder("M").join(",")) && answer.includes(breadth.join(",")));
});

test("original SQL insert and subquery execute against a synthetic database", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE Item(ItemID INTEGER PRIMARY KEY, ItemName TEXT, Price REAL); INSERT INTO Item VALUES (1,'Map',2.5),(2,'Lantern',19.0)");
    db.exec(card("1.3.2", "sql-insert").back);
    assert.equal(db.prepare("SELECT Price FROM Item WHERE ItemID = 27").get().Price, 8.5);
    assert.deepEqual(db.prepare(card("1.3.2", "sql-subquery").back).all().map((r) => r.ItemName), ["Lantern"]);
  } finally { db.close(); }
});

test("Boolean modelling and logical shifts match all Boolean inputs and bounded integer operations", () => {
  assert.match(card("1.4.3", "boolean-model").back, /U = O OR \(B AND P\)/);
  for (const O of [false, true]) for (const B of [false, true]) for (const P of [false, true]) {
    assert.equal(O || (B && P), O ? true : B && P);
    assert.equal((O && B) || (O && !B), O);
  }
  const answer = card("1.4.1", "shift-mask-worked").back;
  assert.ok(answer.includes((182 >>> 2).toString(2).padStart(8, "0")));
  assert.ok(answer.includes((182 & 15).toString(2).padStart(8, "0")));
  assert.doesNotMatch(card("1.4.3", "precedence").back, /then XOR/);
});

test("written and applied exercises count their assessed objectives, not every objective on a linked concept", () => {
  const rows = buildCoverage(topics, QUESTION_BANK, LABS);
  const automation = QUESTION_BANK.find((q) => q.id === "exam-152-automation");
  assert.deepEqual(automation.objectives, ["1.5.2[2]"]);
  assert.deepEqual(automation.conceptIds, ["cs-1-5-2:automated-decisions"]);
  assert.equal(rows.find((r) => r.id === "1.5.2[1]").writtenQuestions, 0);
  assert.equal(rows.find((r) => r.id === "1.3.2(a)").writtenQuestions, 0);
  assert.equal(rows.find((r) => r.id === "1.3.2(c)").writtenQuestions, 1);
  const search = LABS.find((l) => l.id === "lab-c2-binary-search-trace");
  assert.equal(search.topicId, "cs-2-3-1");
  assert.deepEqual(search.objectives, ["2.3.1(f)"]);
  const wrong = structuredClone(QUESTION_BANK);
  wrong[0].objectives = ["1.4.2(a)"];
  assert.match(validateCoverage(topics, wrong, LABS, review).errors.join("\n"), /Invalid activity objective/);
  delete wrong[0].objectives;
  assert.match(validateCoverage(topics, wrong, LABS, review).errors.join("\n"), /Missing activity objective/);
});

test("new versions retain publication gates and question prompts explicitly request rubric extras", () => {
  assert.ok(topics.every((t) => t.contentVersion.endsWith("2026-09-13.1")));
  assert.ok(QUESTION_BANK.every((q) => q.objectives.length && q.contentVersion.endsWith("2026-09-13.1")));
  assert.ok(LABS.every((l) => l.objectives.length && l.contentVersion.endsWith("2026-09-13.1")));
  assert.deepEqual(review.academicApprovals, []);
  assert.deepEqual(review.quizApprovals, []);
  const boundary = QUESTION_BANK.find((q) => q.conceptIds.includes("cs-2-1-4:boundary-test"));
  assert.equal(boundary.commandWord, "Explain");
  assert.match(boundary.prompt, /test values/);
  assert.match(boundary.modelReasoning, /accepts every numeric value/);
  const binary = QUESTION_BANK.find((q) => q.conceptIds.includes("cs-2-3-1:binary-debug"));
  assert.match(binary.prompt, /not-found/);
});
