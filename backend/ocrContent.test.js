const test = require("node:test");
const assert = require("node:assert/strict");
const { buildContentModel, flattenContent, validateContentModel } = require("../ocr-content");

const topics = [{
  id: "cs-1-1-1",
  code: "1.1.1",
  title: "Structure of the processor",
  summary: "Processor fundamentals.",
  cards: [{ id: "mar", category: "Registers", front: "What does MAR store?", back: "The address currently being accessed." }],
}];

test("OCR model derives stable concept IDs from existing topic data", () => {
  const model = buildContentModel(topics);
  const flat = flattenContent(model);
  assert.equal(flat.concepts[0].id, "cs-1-1-1:mar");
  assert.equal(flat.concepts[0].topicId, "cs-1-1-1");
  assert.equal(validateContentModel(model).valid, true);
});

test("OCR model rejects concepts without explanations", () => {
  const model = buildContentModel([{ ...topics[0], cards: [{ ...topics[0].cards[0], back: "" }] }]);
  const result = validateContentModel(model);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /no explanation/i);
});
