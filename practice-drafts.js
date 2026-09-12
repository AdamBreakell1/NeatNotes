(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PracticeDrafts = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  function createStore(storage, now = () => Date.now()) {
    const key = (owner, kind, topic) => `neat-practice-draft:${encodeURIComponent(owner)}:${kind}:${encodeURIComponent(topic)}`;
    return {
      save(owner, kind, topic, data) {
        if (!owner || !["repair", "recall"].includes(kind)) return false;
        try { storage.setItem(key(owner, kind, topic), JSON.stringify({ owner, kind, topic, savedAt: now(), data })); return true; } catch { return false; }
      },
      read(owner, kind, topic) {
        if (!owner) return null;
        try {
          const record = JSON.parse(storage.getItem(key(owner, kind, topic)));
          if (!record || record.owner !== owner || record.kind !== kind || record.topic !== topic) return null;
          if (!Number.isFinite(record.savedAt) || now() - record.savedAt > MAX_AGE || record.savedAt > now()) { storage.removeItem(key(owner, kind, topic)); return null; }
          return record.data;
        } catch { return null; }
      },
      clear(owner, kind, topic) {
        if (!owner) return;
        try { storage.removeItem(key(owner, kind, topic)); } catch {}
      },
    };
  }
  function restoreRepair(saved, lessons) {
    if (!saved) return null;
    const lesson = lessons.find((item) => item.id === saved.lessonId && item.contentVersion === saved.contentVersion);
    if (!lesson || !Array.isArray(lesson.practicePrompts) || !Array.isArray(lesson.steps) || !Number.isInteger(saved.variant) || saved.variant < 0 || saved.variant >= lesson.practicePrompts.length || !Number.isInteger(saved.step) || saved.step < 0 || saved.step > lesson.steps.length) return null;
    return { current: { ...lesson, variant: saved.variant, prompt: lesson.practicePrompts[saved.variant] }, step: saved.step,
      answer: typeof saved.answer === "string" ? saved.answer.slice(0, 80) : "", checked: saved.checked === true };
  }
  function recallSignature(cards) {
    // Compare the served text, not only IDs, so editorial corrections invalidate old drafts.
    const text = JSON.stringify(cards.map(({ id, front, back }) => [id, front, back]));
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return `${text.length}:${(hash >>> 0).toString(16)}`;
  }
  function restoreRecall(saved, cards) {
    if (!saved || !Array.isArray(saved.ids) || !saved.ids.length || saved.ids.length > 20 || new Set(saved.ids).size !== saved.ids.length) return null;
    const selected = saved.ids.map((id) => cards.find((card) => card.id === id));
    if (selected.some((item) => !item) || saved.signature !== recallSignature(selected) || !Number.isInteger(saved.index) || saved.index < 0 || saved.index > selected.length) return null;
    const ratings = Array.isArray(saved.ratings) ? saved.ratings : [];
    if (ratings.length !== saved.index || ratings.some((rating) => !["revisit", "recalled"].includes(rating))) return null;
    return { cards: selected, index: saved.index, ratings, revealed: saved.revealed === true,
      answer: typeof saved.answer === "string" ? saved.answer.slice(0, 2000) : "" };
  }
  function accountStorageKeys(keys, owner, learningKeys = []) {
    if (!owner) return [];
    const exact = new Set(learningKeys.map((key) => `${key}:${owner}`));
    exact.add(`neat-adaptive:${owner}`);
    exact.add(`neat-pending-attempts:${owner}`);
    const prefixes = ["neat-quiz-session", "neat-exam-draft", "neat-written-index", "neat-written-current", "neat-mock-session", "neat-mock-previous"].map((key) => `${key}:${owner}:`);
    prefixes.push(`neat-practice-draft:${encodeURIComponent(owner)}:`);
    return keys.filter((key) => exact.has(key) || prefixes.some((prefix) => key.startsWith(prefix)));
  }
  return { createStore, restoreRepair, recallSignature, restoreRecall, accountStorageKeys };
});
