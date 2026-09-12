const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createStore, restoreRepair, restoreRecall, recallSignature, accountStorageKeys } = require("../practice-drafts");

test("practice drafts are account scoped, expire, and handle unavailable storage", () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  let now = 100;
  const store = createStore(storage, () => now);
  assert.equal(store.save(null, "repair", "topic", { answer: "Guest" }), false);
  store.save("alice", "repair", "topic", { answer: "17" });
  assert.deepEqual(store.read("alice", "repair", "topic"), { answer: "17" });
  assert.equal(store.read("bob", "repair", "topic"), null);
  assert.equal(store.read("alice", "recall", "topic"), null);
  now += 31 * 86400000;
  assert.equal(store.read("alice", "repair", "topic"), null);
  const unavailable = createStore({ setItem() { throw Error("quota"); }, getItem() { throw Error("disabled"); } });
  assert.equal(unavailable.save("alice", "repair", "topic", {}), false);
  assert.equal(unavailable.read("alice", "repair", "topic"), null);
});

test("repair resume requires an available lesson/version and preserves step, variant and answer without scores", () => {
  const lessons = [{ id: "one", contentVersion: "v1", steps: [{}, {}, {}], practicePrompts: ["first", "second"] }];
  const saved = { lessonId: "one", contentVersion: "v1", variant: 1, step: 3, answer: "93", checked: true, score: 100 };
  const restored = restoreRepair(saved, lessons);
  assert.equal(restored.current.prompt, "second");
  assert.equal(restored.step, 3);
  assert.equal(restored.answer, "93");
  assert.equal(restored.score, undefined);
  assert.equal(restoreRepair(saved, []), null);
  assert.equal(restoreRepair(saved, [{ ...lessons[0], contentVersion: "v2" }]), null);
  assert.equal(restoreRepair({ ...saved, variant: 2 }, lessons), null);
  assert.equal(restoreRepair({ ...saved, step: -1 }, lessons), null);
});

test("recall drafts preserve only valid self-ratings and invalidate changed or withdrawn material", () => {
  const cards = [{ id: "pc", front: "Question", back: "Answer" }];
  const saved = { ids: ["pc"], signature: recallSignature(cards), index: 0, ratings: [], revealed: true, answer: "Attempt", correct: true };
  assert.equal(restoreRecall(saved, cards).answer, "Attempt");
  assert.equal(restoreRecall(saved, cards).correct, undefined);
  assert.equal(restoreRecall(saved, [{ ...cards[0], back: "Corrected" }]), null);
  assert.equal(restoreRecall(saved, []), null);
  assert.equal(restoreRecall({ ...saved, index: 1, ratings: ["verified_correct"] }, cards), null);
  assert.equal(restoreRecall({ ...saved, index: 1, ratings: ["revisit"] }, cards).index, 1);
});

test("account deletion targets owned drafts without clearing guest notes or another account", () => {
  const keys = ["neat-notes-guest-workspace", "history:alice", "history:bob", "neat-adaptive:alice", "neat-adaptive:alice2", "neat-exam-draft:alice:q1", "neat-exam-draft:bob:q1", "neat-practice-draft:alice:repair:topic", "neat-practice-draft:bob:repair:topic", "neat-notes-settings"];
  assert.deepEqual(accountStorageKeys(keys, "alice", ["history"]), ["history:alice", "neat-adaptive:alice", "neat-exam-draft:alice:q1", "neat-practice-draft:alice:repair:topic"]);
  assert.deepEqual(accountStorageKeys(keys, null), []);
});
