const test = require("node:test");
const assert = require("node:assert/strict");
const session = require("../revision-session");
const { buildSession } = require("../learning-model");

test("ordered delivery ignores lifetime completion and counts each activity once", () => {
  const items = [{ cardId: "a", topicId: "1" }, { cardId: "b", topicId: "2" }, { cardId: "c", topicId: "1" }];
  let state = session.create({ items, durationMinutes: 5 }, "test");
  const delivered = [];
  while (session.next(state)) {
    const next = session.next(state);
    delivered.push(next.cardId);
    const previous = state;
    state = session.complete(state, next.cardId);
    assert.strictEqual(session.complete(state, next.cardId), state);
    assert.notStrictEqual(previous, state);
    state = session.restore(JSON.parse(JSON.stringify(state)), new Set(["a", "b", "c"]));
  }
  assert.deepEqual(delivered, items.map((item) => item.cardId));
  assert.ok(state.completedAt);
});

test("empty work completes safely; lost entitlements invalidate a stored queue", () => {
  assert.equal(session.next(session.create({ items: [] }, "empty")), null);
  const state = session.create({ items: [{ cardId: "locked" }] }, "locked");
  assert.equal(session.restore(state, new Set()), null);
});

test("a changed duration creates a new bounded plan without mutating the old queue", () => {
  const items = Array.from({ length: 40 }, (_, i) => ({ cardId: `c${i}`, conceptId: `c${i}`, topicId: `t${i % 5}`, mastery: { score: 0 } }));
  const short = session.create(buildSession({ items, durationMinutes: 5 }), "short");
  const long = session.create(buildSession({ items, durationMinutes: 25 }), "long");
  assert.ok(long.items.length > short.items.length);
  assert.equal(short.completedConceptIds.length, 0);
});
