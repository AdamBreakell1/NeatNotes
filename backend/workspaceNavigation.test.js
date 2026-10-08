"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const navigation = require("../workspace-navigation");

test("workspace routes distinguish course, activity, notes and code destinations", () => {
  const routes = [
    { section: "home" },
    { section: "revise", studyView: "topics", componentId: "h446-02" },
    { section: "revise", studyView: "cards", componentId: "h446-02", topicId: "cs-2-1-1" },
    { section: "notes" },
    { section: "practice", mode: "hub" },
    ...["quick", "exam", "mock", "labs"].map((mode) => ({ section: "practice", mode, componentId: "h446-01", topicId: "cs-1-1-1" })),
    { section: "coding", taskId: "worksheet-01" },
    { section: "progress", componentId: "h446-01" },
  ];
  for (const route of routes) assert.deepEqual(navigation.parse(navigation.format(route)), route);
});

test("route input cannot carry source, responses or external destinations", () => {
  assert.equal(navigation.parse("#landing-product"), null);
  assert.deepEqual(navigation.parse("#/https://example.org"), { section: "home" });
  assert.deepEqual(navigation.parse("#/code?task=%3Cscript%3E&source=private"), { section: "coding" });
  assert.deepEqual(navigation.parse("#/practice/unknown?component=untrusted&answer=private"), { section: "practice", mode: "hub" });
  assert.equal(navigation.format({ section: "coding", taskId: "../../../secret", source: "private" }), "#/code");
});
