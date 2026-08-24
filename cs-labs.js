"use strict";

const LABS = [
  lab("lab-cpu-fde", "CPU trace", "cs-1-1-1", "cs-1-1-1:fde-cycle", "algorithm_trace", "During fetch, which register is copied into the MAR before memory is read?", ["PC", "MDR", "CIR", "Accumulator"], "PC", "The PC contains the address of the next instruction, so that address is copied into the MAR."),
  lab("lab-boolean-output", "Boolean reasoning", "cs-1-4-3", "cs-1-4-3:truth-table-rows", "applied_question", "For A = 1 and B = 0, what is the output of (A AND B) OR (NOT B)?", ["0", "1", "Undefined", "Depends on XOR"], "1", "A AND B is 0. NOT B is 1. Therefore 0 OR 1 gives 1."),
  lab("lab-binary-search", "Algorithm trace", "cs-1-4-2", "cs-1-4-2:array", "algorithm_trace", "A binary search checks 13 in [3, 7, 13, 19, 24]. The target is 19. What should happen next?", ["Search [3, 7]", "Search [19, 24]", "Return not found", "Check every item from the start"], "Search [19, 24]", "19 is greater than 13, so binary search discards the middle and lower portion and continues in the upper half."),
  lab("lab-queue-state", "Data structure state", "cs-1-4-2", "cs-1-4-2:queue", "algorithm_trace", "A, B and C are enqueued in that order. One item is dequeued. What is now at the front?", ["A", "B", "C", "The queue is empty"], "B", "A leaves first because a queue is FIFO, leaving B at the front."),
  lab("lab-sql-query", "SQL sandbox", "cs-1-3-2", "cs-1-3-2:sql-keywords", "applied_question", "Write a query that returns Name from Student where Score is at least 70, ordered by Name.", null, "select name from student where score >= 70 order by name", "A valid answer selects Name, filters Score with >= 70, and orders the result by Name.", "sql"),
  lab("lab-normalisation", "Normalisation", "cs-1-3-2", "cs-1-3-2:normalisation", "applied_question", "In ORDER(OrderID, CustomerID, CustomerPostcode), CustomerPostcode depends on CustomerID rather than directly on OrderID. What must be removed to reach 3NF?", ["A repeating group", "A partial dependency", "A transitive dependency", "The primary key"], "A transitive dependency", "OrderID determines CustomerID, which determines CustomerPostcode. That indirect dependency is transitive."),
  lab("lab-pseudocode-trace", "Pseudocode trace", "cs-1-2-4", "cs-1-2-4:procedural", "algorithm_trace", "What is output? total = 0; FOR i = 1 TO 4; total = total + i; NEXT i; OUTPUT total", ["4", "6", "10", "15"], "10", "The loop adds 1 + 2 + 3 + 4, giving 10."),
  lab("lab-network-resilience", "Networking scenario", "cs-1-3-3", "cs-1-3-3:packet-switching", "applied_question", "One route between two packet-switched network nodes fails. Why can the transfer still complete?", ["Every packet is stored permanently", "Packets can be routed along an alternative path", "The MAC address changes into an IP address", "Circuit switching reserves a replacement line"], "Packets can be routed along an alternative path", "Routers can select other available routes, and the destination can reorder the received packets."),
];

function lab(id, title, topicId, conceptId, activityType, prompt, options, answer, explanation, responseType = "choice") {
  return { id, title, topicId, conceptId, activityType, prompt, options, answer, explanation, responseType, provenance: "original_neat_notes", reviewStatus: "published" };
}

function normalise(value) {
  return String(value || "").toLowerCase().replace(/;+$/g, "").replace(/\s+/g, " ").trim();
}

function assessLab(labItem, response) {
  const submitted = normalise(response);
  const expected = normalise(labItem.answer);
  let correct = submitted === expected;
  if (labItem.responseType === "sql") {
    const tokens = ["select name", "from student", "where score >= 70", "order by name"];
    correct = tokens.every((token) => submitted.includes(token));
  }
  return { correct, score: correct ? 1 : 0, explanation: labItem.explanation, expectedAnswer: labItem.answer };
}

function getPublicLab(labItem) {
  const { answer, explanation, ...publicFields } = labItem;
  return publicFields;
}

function validateLabs(labs = LABS) {
  const ids = new Set();
  const errors = [];
  labs.forEach((item) => {
    if (!item.id || ids.has(item.id)) errors.push(`Duplicate or missing lab id: ${item.id}`);
    ids.add(item.id);
    if (!item.topicId || !item.conceptId || !item.prompt || !item.answer || !item.explanation) errors.push(`Incomplete lab: ${item.id}`);
    if (item.reviewStatus !== "published") errors.push(`Unpublished lab: ${item.id}`);
  });
  return { valid: errors.length === 0, errors, count: labs.length };
}

module.exports = { LABS, assessLab, getPublicLab, validateLabs };
