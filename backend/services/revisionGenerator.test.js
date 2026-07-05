const test = require("node:test");
const assert = require("node:assert/strict");
const generator = require("../../revision-generator");

const sampleNote = `# 1.1.1 Structure of the Processor

CPU: The central processing unit fetches, decodes and executes instructions.
- The Control Unit coordinates data movement and sends control signals.
- The ALU performs arithmetic and logical operations.
- [ ] Explain the fetch-decode-execute cycle from memory to execution.

Cache: Fast memory close to the CPU used for frequently accessed data and instructions.`;

test("generateStudyPack creates revision artefacts from note content", () => {
  const pack = generator.generateStudyPack(sampleNote);

  assert.match(pack.summary, /Structure of the Processor/i);
  assert.ok(pack.flashcards.length >= 5);
  assert.ok(pack.quiz.length >= 5);
  assert.ok(pack.keyTerms.includes("CPU"));
  assert.ok(pack.checklist.length >= 2);
  assert.ok(pack.examPrompts.length >= 2);
});

test("assessNoteQuality rewards structure and revision tasks", () => {
  const quality = generator.assessNoteQuality(sampleNote);

  assert.equal(quality.label, "Revision-ready");
  assert.ok(quality.score >= 70);
  assert.equal(quality.signals.headings, 1);
  assert.ok(quality.signals.definitions >= 2);
  assert.equal(quality.signals.revisionTasks, 1);
});
