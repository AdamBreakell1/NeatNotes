const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { buildContentModel, validateContentModel } = require("../ocr-content");

const source = fs.readFileSync(path.join(__dirname, "..", "revision-topics.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "revision-topics.js", timeout: 1000 });

const result = validateContentModel(buildContentModel(sandbox.window.REVISION_TOPICS || []));
if (!result.valid) {
  console.error(result.errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`OCR content valid: ${result.counts.topics} topics, ${result.counts.concepts} concepts.`);
}
