"use strict";

// Bounded original reasoning checks, not execution of arbitrary student programs.
const rows = [
  ["2.1.1", "model-devise", "Choose a model", "A planner finds the fewest train changes, not the shortest distance. Which graph model best serves that purpose?", ["Stations as nodes; a change adds one to the path cost", "Stations as nodes; every kilometre adds one", "Train colours as nodes; platform numbers as costs", "Passengers as nodes; ticket prices as costs"], 0, "The objective is minimising changes, so the model's cost must represent changes. Distance or fare optimises a different objective."],
  ["2.1.2", "cache-stale", "Repair a stale cache", "A timetable service caches routes for an hour. A train is cancelled ten minutes after caching. Which change directly addresses stale advice?", ["Increase the cache lifetime", "Invalidate affected routes when cancellation data arrives", "Remove input validation", "Store the same route under a second key"], 1, "Invalidation makes the next request recompute the affected route using the updated timetable. Duplicating the cache does not update its information."],
  ["2.1.3", "empty-average", "Order the checks", "A mean function accepts an array of marks. Which sequence avoids division by zero for an empty array?", ["Divide total by count, then check count", "Set count to one for every array", "Check count > 0, then divide; otherwise return an empty-input result", "Discard every zero mark before dividing"], 2, "The guard must precede division. Changing the count or discarding valid zeros changes the meaning of the average."],
  ["2.1.4", "boundary-test", "Debug a boundary", "Free entry is allowed from age 12 to age 17 inclusive. Which condition matches both boundaries?", ["age > 12 AND age < 17", "age >= 12 OR age <= 17", "age < 12 AND age > 17", "age >= 12 AND age <= 17"], 3, "Both bounds must hold and equality must be included. OR admits ages outside the interval."],
  ["2.1.5", "race", "Trace an interleaving", "A shared counter starts at 5. Tasks A and B each read 5, add 1 locally, then each write 6. What is the final value, and what was lost?", ["6; one increment was lost", "7; neither increment was lost", "10; the reads were added together", "5; concurrent writes cancel out"], 0, "Both writes contain 6. The read-modify-write operations were not atomic, so the second write overwrites the first rather than incorporating it."],
  ["2.2.1", "factorial-trace", "Trace recursive returns", "f(0) returns 1. For n > 0, f(n) returns n + f(n - 1). What does f(3) return?", ["6", "7", "9", "3"], 1, "Unwind from the base case: f(0)=1, f(1)=2, f(2)=4, f(3)=7. This is addition, not factorial multiplication."],
  ["2.2.2", "backtracking", "Backtrack deliberately", "A maze search reaches a dead end. What does backtracking do next?", ["Delete every previously visited location", "Choose a random location outside the maze", "Return to the most recent choice point with an unexplored path", "Restart from the entrance after every step"], 2, "The partial solution is undone until an alternative remains. Remembering explored paths prevents repeating the same failed branch."],
  ["2.3.1", "binary-debug", "Repair binary search", "Binary search uses inclusive low/high indices. If values[mid] < target, which update safely discards the tested lower part?", ["high = mid - 1", "low = mid", "high = mid", "low = mid + 1"], 3, "The target can only be above mid in an ascending array, and mid has already been tested. Advancing to mid+1 also guarantees progress."],
];
const COMPONENT_TWO_LABS = rows.map(([code, concept, title, prompt, options, answerIndex, explanation]) => ({
  id: `lab-c2-${code.replaceAll(".", "")}`, title,
  topicId: `cs-${code.replaceAll(".", "-")}`,
  conceptId: `cs-${code.replaceAll(".", "-")}:${concept}`,
  activityType: "applied_question", prompt, options, answer: options[answerIndex], explanation,
  responseType: "choice", provenance: "original_neat_notes", reviewStatus: "review_pending", contentVersion: "h446-c2-2026-09-07.1",
}));
module.exports = { COMPONENT_TWO_LABS };
