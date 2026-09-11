"use strict";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function normaliseTask(value, topics) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!["home", "revise", "practice", "progress", "notes"].includes(value.section)) return null;
  const topic = topics.find((item) => item.id === value.topicId);
  if (!topic) return null;
  return {
    section: value.section,
    topicId: topic.id,
    componentId: topic.componentId || "h446-01",
    practiceMode: ["quick", "exam", "mock", "labs"].includes(value.practiceMode) ? value.practiceMode : "quick",
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
