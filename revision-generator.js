(function attachRevisionGenerator(root) {
  const STOP_WORDS = new Set([
    "about",
    "after",
    "also",
    "because",
    "between",
    "computer",
    "could",
    "from",
    "have",
    "into",
    "notes",
    "that",
    "their",
    "there",
    "these",
    "this",
    "through",
    "topic",
    "using",
    "when",
    "where",
    "which",
    "with",
  ]);

  function generateStudyPack(note = "") {
    return {
      summary: generateSummary(note),
      flashcards: generateFlashcards(note),
      quiz: generateQuiz(note),
      keyTerms: extractKeyTerms(note),
      checklist: generateChecklist(note),
      examPrompts: generateExamPrompts(note),
      quality: assessNoteQuality(note),
    };
  }

  function generateSummary(note = "") {
    const lines = getPlainLines(note);
    if (!lines.length) return "Add headings, definitions and key points to generate a revision summary.";

    const firstHeading = getHeadings(note)[0];
    const signalLines = lines
      .filter((line) => /:|because|therefore|used to|allows|means|stores|controls|executes/i.test(line))
      .slice(0, 3);
    const source = signalLines.length ? signalLines : lines.slice(0, 3);
    const summary = source.join(" ");

    return firstHeading ? `${firstHeading}: ${summary}` : summary;
  }

  function generateFlashcards(note = "") {
    const lines = note.split(/\r?\n/);
    const cards = [];
    const seen = new Set();
    let section = getHeadings(note)[0] || "this topic";

    const addCard = (category, front, back) => {
      const cleanFront = cleanText(front);
      const cleanBack = cleanText(back);
      const key = `${cleanFront.toLowerCase()}::${cleanBack.toLowerCase()}`;
      if (!cleanFront || !cleanBack || cleanBack.length < 4 || seen.has(key)) return;
      seen.add(key);
      cards.push({ category, front: cleanFront, back: cleanBack });
    };

    lines.forEach((raw, index) => {
      const line = raw.trim();
      if (!line) return;

      const heading = line.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        section = cleanText(heading[1]);
        const next = collectFollowingPoints(lines, index + 1, 2).join(" ");
        if (next) addCard("Topic", `What are the main ideas in ${section}?`, next);
        return;
      }

      const cleaned = cleanMarkdownLine(line);
      const definition = cleaned.match(/^([^:]{3,52}):\s+(.{4,})$/);
      if (definition) {
        addCard("Definition", `What does ${definition[1].trim()} mean?`, definition[2].trim());
        return;
      }

      const task = line.match(/^- \[[ xX]\]\s+(.+)$/);
      if (task) {
        addCard("Revision task", `What should you do for ${section}?`, task[1]);
        return;
      }

      if (/^([-*•]|\d+\.)\s+/.test(line)) {
        addCard("Key point", `What should you remember about ${section}?`, cleaned);
      }
    });

    if (cards.length < 5) {
      getPlainLines(note).slice(0, 8).forEach((line) => {
        addCard("Recall", "Recall a useful point from this note.", line);
      });
    }

    return cards.slice(0, 12);
  }

  function generateQuiz(note = "") {
    return generateFlashcards(note).slice(0, 8).map((card, index, cards) => {
      const distractors = cards
        .filter((candidate) => candidate.back !== card.back)
        .map((candidate) => candidate.back)
        .slice(0, 3);
      return {
        id: `generated-${index + 1}`,
        type: index % 3 === 2 ? "short-answer" : "multiple-choice",
        prompt: card.front,
        answer: card.back,
        explanation: `Generated from your note content under ${card.category}.`,
        options: seededOptions(card.back, distractors),
      };
    });
  }

  function generateChecklist(note = "") {
    const tasks = note
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^- \[[ xX]\]\s+/.test(line))
      .map((line) => cleanMarkdownLine(line));
    const terms = extractKeyTerms(note).slice(0, 5).map((term) => `Explain ${term} without looking at your notes.`);
    return [...tasks, ...terms].slice(0, 8);
  }

  function generateExamPrompts(note = "") {
    const headings = getHeadings(note).slice(0, 4);
    const terms = extractKeyTerms(note).slice(0, 4);
    const prompts = headings.map((heading) => `Explain the importance of ${heading} in an OCR-style answer.`);
    terms.forEach((term) => prompts.push(`Describe how ${term} could appear in an exam question.`));
    return prompts.slice(0, 6);
  }

  function extractKeyTerms(note = "") {
    const explicit = [];
    getPlainLines(note).forEach((line) => {
      const definition = line.match(/^([^:]{3,52}):\s+(.{4,})$/);
      if (definition) explicit.push(cleanText(definition[1]));
    });

    const frequencies = {};
    cleanText(note)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
      .forEach((word) => {
        frequencies[word] = (frequencies[word] || 0) + 1;
      });

    const inferred = Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word]) => titleCase(word));

    return unique([...explicit, ...inferred]).slice(0, 10);
  }

  function assessNoteQuality(note = "") {
    const lines = getPlainLines(note);
    const headings = getHeadings(note);
    const definitions = lines.filter((line) => /^([^:]{3,52}):\s+(.{4,})$/.test(line));
    const examples = lines.filter((line) => /\b(for example|example|e\.g\.)\b/i.test(line));
    const tasks = note.split(/\r?\n/).filter((line) => /^- \[[ xX]\]\s+/.test(line.trim()));
    const keyTerms = extractKeyTerms(note);
    const words = cleanText(note).split(/\s+/).filter(Boolean);

    let score = 0;
    if (words.length >= 80) score += 25;
    else if (words.length >= 35) score += 15;
    else if (words.length >= 12) score += 8;
    score += Math.min(20, headings.length * 10);
    score += Math.min(24, definitions.length * 10);
    score += Math.min(10, examples.length * 5);
    score += Math.min(24, keyTerms.length * 3);
    score += Math.min(18, tasks.length * 10);
    score = Math.min(100, score);

    const label = score >= 70 ? "Revision-ready" : score >= 38 ? "Developing" : "Too brief";
    return {
      score,
      label,
      signals: {
        words: words.length,
        headings: headings.length,
        definitions: definitions.length,
        examples: examples.length,
        keyTerms: keyTerms.length,
        revisionTasks: tasks.length,
      },
    };
  }

  function getHeadings(note = "") {
    return note
      .split(/\r?\n/)
      .map((line) => line.trim().match(/^#{1,3}\s+(.+)$/)?.[1])
      .filter(Boolean)
      .map(cleanText);
  }

  function getPlainLines(note = "") {
    return note
      .split(/\r?\n/)
      .map(cleanMarkdownLine)
      .filter((line) => line.length > 2);
  }

  function collectFollowingPoints(lines, start, limit) {
    const points = [];
    for (let index = start; index < lines.length && points.length < limit; index += 1) {
      const line = lines[index].trim();
      if (!line) continue;
      if (/^#{1,3}\s+/.test(line)) break;
      const cleaned = cleanMarkdownLine(line);
      if (cleaned) points.push(cleaned);
    }
    return points;
  }

  function seededOptions(answer, distractors) {
    const options = unique([answer, ...distractors]).slice(0, 4);
    while (options.length < 4) {
      options.push(["It depends on the question context.", "A common misconception.", "Review the note for detail."][options.length - 1]);
    }
    return options;
  }

  function cleanMarkdownLine(line = "") {
    return cleanText(
      line
        .replace(/^#{1,3}\s+/, "")
        .replace(/^- \[[ xX]\]\s+/, "")
        .replace(/^([-*•]|\d+\.)\s+/, "")
        .replace(/^>\s+/, "")
    );
  }

  function cleanText(text = "") {
    return String(text).replace(/\s+/g, " ").trim();
  }

  function titleCase(word) {
    return word.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function unique(items) {
    return [...new Set(items.filter(Boolean))];
  }

  const api = {
    assessNoteQuality,
    extractKeyTerms,
    generateChecklist,
    generateExamPrompts,
    generateFlashcards,
    generateQuiz,
    generateStudyPack,
    generateSummary,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.NeatRevisionGenerator = api;
  root.NeetRevisionGenerator = api;
})(typeof window !== "undefined" ? window : globalThis);
