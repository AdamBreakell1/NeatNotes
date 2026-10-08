"use strict";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function normaliseTask(value, topics) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!["home", "revise", "practice", "coding", "progress", "notes"].includes(value.section)) return null;
  const topic = topics.find((item) => item.id === value.topicId);
  if (!topic) return null;
  return {
    section: value.section === "practice" && value.practiceMode === "coding" ? "coding" : value.section,
    topicId: topic.id,
    componentId: topic.componentId || "h446-01",
    practiceMode: ["hub", "quick", "exam", "mock", "labs", "coding"].includes(value.practiceMode) ? value.practiceMode : "quick",
    ...(value.section === "revise" ? { studyView: value.studyView === "topics" ? "topics" : "cards" } : {}),
    ...(["coding", "practice"].includes(value.section) && typeof value.codingTaskId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value.codingTaskId) ? { codingTaskId: value.codingTaskId } : {}),
  };
}

function createAuthContinuationStore(db, topics, now = () => Date.now()) {
  return {
    save(userId, value) {
      const task = normaliseTask(value, topics);
      if (!task) return;
      db.prepare(`INSERT INTO auth_continuations (user_id, task_json, expires_at)
        VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET task_json = excluded.task_json, expires_at = excluded.expires_at`)
        .run(userId, JSON.stringify(task), new Date(now() + MAX_AGE_MS).toISOString());
    },
    read(userId) {
      const row = db.prepare("SELECT * FROM auth_continuations WHERE user_id = ?").get(userId);
      if (!row || Date.parse(row.expires_at) <= now()) return null;
      try { return normaliseTask(JSON.parse(row.task_json), topics); } catch { return null; }
    },
    clear(userId) {
      db.prepare("DELETE FROM auth_continuations WHERE user_id = ?").run(userId);
    },
  };
}

module.exports = { normaliseTask, createAuthContinuationStore };
