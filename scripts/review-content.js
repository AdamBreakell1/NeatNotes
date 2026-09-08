"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { loadTopics } = require("../backend/services/contentRepository");
const { buildReviewPack } = require("../backend/services/contentReviewPack");
const { QUESTION_BANK } = require("../exam-content");
const { LABS } = require("../cs-labs");
const review = require("../content-review.json");

try {
  const { values } = parseArgs({ options: { component: { type: "string" }, topic: { type: "string" }, output: { type: "string" } } });
  const componentId = values.component || (values.topic ? undefined : "h446-02");
  if (componentId && !["h446-01", "h446-02"].includes(componentId)) throw new Error("Use --component h446-01 or h446-02.");
  if (values.topic && !/^\d\.\d\.\d$/.test(values.topic)) throw new Error("Use an exact topic code, for example --topic 2.1.1.");
  // Include withdrawn items for editorial inspection, visibly labelled in the pack.
  const topics = loadTopics({ ...review, quarantinedConceptIds: [] });
  const pack = buildReviewPack({ topics, questions: QUESTION_BANK, labs: LABS, review, componentId, topicCode: values.topic });
  const directory = path.resolve(values.output || path.join(__dirname, "../.resource-review/review-packs", values.topic || componentId));
  fs.mkdirSync(directory, { recursive: true });
  for (const document of pack.documents) fs.writeFileSync(path.join(directory, document.filename), document.markdown);
  fs.writeFileSync(path.join(directory, "review-manifest.json"), JSON.stringify(pack.manifest, null, 2) + "\n");
  fs.writeFileSync(path.join(directory, "README.md"), ["# Content review pack", "", "Local editorial material. Generating or completing this pack does not unlock content. Record corrections by stable ID; human approval is a separate step after corrections and validation.", "", ...pack.manifest.topics.map((topic) => `- [${topic.code}](${topic.file}) - ${topic.contentVersion}`), "", "The manifest contains blank reviewer fields and unchecked review criteria. Its SHA-256 fingerprints identify the source material that was inspected; regenerate after content changes.", ""].join("\n"));
  console.log(`Wrote ${pack.documents.length} topic review files and a blank review manifest to ${directory}. No approvals changed.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
