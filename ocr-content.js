(function initialiseOcrContent(globalScope) {
  "use strict";

  const SPECIFICATION = Object.freeze({
    id: "ocr-h446-2020",
    qualification: "OCR A Level Computer Science",
    qualificationCode: "H446",
    version: "3.0 (2026)",
    sourceUrl: "https://www.ocr.org.uk/images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf",
    status: "current",
    alignmentNotice: "Aligned to the OCR H446 specification structure. Neat Notes is not endorsed by OCR.",
    components: [
      { id: "h446-01", code: "01", title: "Computer Systems", weighting: 40, contentStatus: "published" },
      { id: "h446-02", code: "02", title: "Algorithms and Programming", weighting: 40, contentStatus: "review_pending" },
      { id: "h446-03-04", code: "03/04", title: "Programming Project", weighting: 20, contentStatus: "integrity_guidance_only" },
    ],
  });

  function normaliseKeyword(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function inferKeywords(card) {
    return [...new Set(
      `${card.category || ""} ${card.front || ""}`
        .split(/\s+/)
        .map(normaliseKeyword)
        .filter((word) => word.length > 3),
    )].slice(0, 10);
  }

  function buildContentModel(topics = []) {
    const sections = new Map();

    topics.forEach((topic) => {
      const component = SPECIFICATION.components.find((item) => item.id === (topic.componentId || (topic.code.startsWith("2.") ? "h446-02" : "h446-01")));
      const sectionCode = String(topic.code || "").split(".").slice(0, 2).join(".");
      const section = sections.get(sectionCode) || {
        id: `${component.id}-${sectionCode.replaceAll(".", "-")}`,
        code: sectionCode,
        componentId: component.id,
        title: sectionCode ? `Section ${sectionCode}` : "Component 01",
        topics: [],
      };
      const concepts = (topic.cards || []).map((card, index) => ({
        id: `${topic.id}:${card.id}`,
        specificationId: SPECIFICATION.id,
        componentId: component.id,
        topicId: topic.id,
        sourceCardId: card.id,
        title: String(card.front || `Concept ${index + 1}`).replace(/[?!.]+$/, ""),
        category: card.category || "Knowledge",
        keywords: inferKeywords(card),
        explanation: card.back || "",
        objectives: card.objectives || [],
        contentVersion: card.contentVersion || "legacy-2026",
        commandWord: card.commandWord || "Recall",
        commonMisconceptions: card.commonMisconceptions || [],
        prerequisites: card.prerequisites || [],
        difficultyRange: [1, 3],
        activityTypes: ["flashcard", ...(card.distractors?.length ? ["multiple_choice"] : [])],
        reviewStatus: card.reviewStatus || "published_unreviewed",
      }));
      section.topics.push({
        id: topic.id,
        code: topic.code,
        title: topic.title,
        summary: topic.summary,
        componentId: component.id,
        specificationId: SPECIFICATION.id,
        concepts,
        reviewStatus: topic.reviewStatus || "published_unreviewed",
      });
      sections.set(sectionCode, section);
    });

    return {
      ...SPECIFICATION,
      components: SPECIFICATION.components.map((component) => ({
        ...component,
        sections: [...sections.values()].filter((section) => section.componentId === component.id),
      })),
    };
  }

  function flattenContent(model) {
    const topics = model.components.flatMap((component) => component.sections.flatMap((section) => section.topics));
    return { topics, concepts: topics.flatMap((topic) => topic.concepts) };
  }

  function validateContentModel(model) {
    const errors = [];
    const { topics, concepts } = flattenContent(model);
    const unique = (items, label) => {
      const seen = new Set();
      items.forEach((item) => {
        if (!item.id) errors.push(`${label} is missing an id.`);
        else if (seen.has(item.id)) errors.push(`Duplicate ${label} id: ${item.id}`);
        seen.add(item.id);
      });
    };
    unique(model.components, "component");
    unique(topics, "topic");
    unique(concepts, "concept");
    const topicIds = new Set(topics.map((topic) => topic.id));
    concepts.forEach((concept) => {
      if (!topicIds.has(concept.topicId)) errors.push(`Orphan concept: ${concept.id}`);
      if (!concept.explanation.trim()) errors.push(`Concept has no explanation: ${concept.id}`);
      if (!["published", "published_unreviewed", "review_pending", "academically_reviewed"].includes(concept.reviewStatus)) errors.push(`Invalid review status: ${concept.id}`);
    });
    return { valid: errors.length === 0, errors, counts: { topics: topics.length, concepts: concepts.length } };
  }

  const api = { SPECIFICATION, buildContentModel, flattenContent, validateContentModel };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.NEAT_OCR_CONTENT = api;
})(typeof window !== "undefined" ? window : globalThis);
