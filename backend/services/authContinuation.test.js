"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { normaliseTask, createAuthContinuationStore } = require("./authContinuation");
const topics = [{ id: "cs-1-1-1", componentId: "h446-01" }];

test("auth return destinations allow known navigation only, never URLs or guest data", () => {
  assert.equal(normaliseTask({ section: "https://example.org", topicId: "cs-1-1-1" }, topics), null);
  assert.equal(normaliseTask({ section: "practice", topicId: "missing" }, topics), null);
  assert.deepEqual(normaliseTask({ section: "practice", topicId: "cs-1-1-1", componentId: "h446-02", practiceMode: "exam", answers: ["private"], notes: "private", returnUrl: "//example.org" }, topics), {
    section: "practice", topicId: "cs-1-1-1", componentId: "h446-01", practiceMode: "exam",
  });
});

test("continuations are isolated by account, expire, and can be acknowledged", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE auth_continuations (user_id TEXT PRIMARY KEY, task_json TEXT, expires_at TEXT)");
  let now = Date.parse("2026-09-11T12:00:00Z");
  const store = createAuthContinuationStore(db, topics, () => now);
  try {
    store.save("first", { section: "revise", topicId: "cs-1-1-1" });
    store.save("first", { section: "https://example.org" });
    assert.equal(store.read("first").section, "revise");
    assert.equal(store.read("second"), null);
    store.clear("second");
    assert.ok(store.read("first"));
    now += 24 * 60 * 60 * 1000;
    assert.equal(store.read("first"), null);
    store.save("first", { section: "notes", topicId: "cs-1-1-1" });
    store.clear("first");
    assert.equal(store.read("first"), null);
  } finally { db.close(); }
});
