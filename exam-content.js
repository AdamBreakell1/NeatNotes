"use strict";

const PRIMARY_CONCEPTS = {
  "cs-1-1-1": "mar", "cs-1-1-2": "risc", "cs-1-1-3": "solid-state",
  "cs-1-2-1": "virtual-memory", "cs-1-2-2": "compiler", "cs-1-2-3": "agile",
  "cs-1-2-4": "assembly-language", "cs-1-3-1": "hash", "cs-1-3-2": "normalisation",
  "cs-1-3-3": "packet-switching", "cs-1-3-4": "server-side", "cs-1-4-1": "floating-point",
  "cs-1-4-2": "queue", "cs-1-4-3": "de-morgan", "cs-1-5-1": "cma", "cs-1-5-2": "automation",
};

const QUESTION_BANK = [
  question("exam-111-mar-mdr", "cs-1-1-1", "1.1.1", "Structure of the processor", 4, "Explain", "Explain how the MAR and MDR are used when the processor reads data from memory.", [
    point("MAR stores the address of the required memory location.", ["mar stores address", "memory address register stores address", "address placed in mar"]),
    point("The address is carried to memory using the address bus.", ["address bus"]),
    point("The value read from memory is placed in the MDR.", ["data placed in mdr", "value placed in mdr", "mdr stores data from memory"]),
    point("The data travels using the data bus.", ["data bus"]),
  ], "MAR identifies where to access; MDR temporarily holds the value transferred to or from that location."),
  question("exam-112-risc-cisc", "cs-1-1-2", "1.1.2", "Types of processor", 4, "Compare", "Compare RISC and CISC processor instruction sets.", [
    point("RISC uses a smaller set of simple instructions.", ["risc smaller instruction set", "risc simple instructions", "reduced instruction set"]),
    point("CISC uses a larger set that can include more complex instructions.", ["cisc larger instruction set", "cisc complex instructions", "complex instruction set"]),
    point("A RISC instruction commonly completes in fewer clock cycles.", ["risc fewer clock cycles", "risc one clock cycle", "risc faster instruction"]),
    point("A CISC program may need fewer instructions to perform the same task.", ["cisc fewer instructions", "cisc less instructions", "cisc shorter program"]),
  ], "A comparison should make paired points rather than listing isolated features."),
  question("exam-113-ssd", "cs-1-1-3", "1.1.3", "Input, output and storage", 3, "Explain", "Explain two reasons why an SSD may be chosen instead of a magnetic hard disk for a laptop.", [
    point("An SSD has no moving parts.", ["no moving parts", "solid state"]),
    point("It is more resistant to shock or movement and therefore suitable for a portable device.", ["more durable", "shock resistant", "less damaged by movement", "portable"]),
    point("It normally provides faster access/read/write performance or uses less power.", ["faster access", "faster read", "faster write", "less power", "lower power"]),
  ], "Reasons gain credit when they are linked to the laptop context."),
  question("exam-121-virtual-memory", "cs-1-2-1", "1.2.1", "Operating systems", 3, "Explain", "Explain how virtual memory allows a computer to continue running when RAM is full.", [
    point("Part of secondary storage is used as if it were RAM.", ["secondary storage used as ram", "disk used as ram", "storage acts as ram"]),
    point("Inactive pages or data are moved from RAM to the virtual-memory area.", ["moved from ram", "pages moved", "page out"]),
    point("Required pages are moved back into RAM, although this is slower than using RAM.", ["moved back to ram", "page in", "slower than ram", "slower performance"]),
  ], "Virtual memory extends available working memory but does not make secondary storage as fast as RAM."),
  question("exam-122-compiler-interpreter", "cs-1-2-2", "1.2.2", "Applications generation", 4, "Compare", "Compare how a compiler and an interpreter translate source code.", [
    point("A compiler translates the whole program before execution.", ["compiler translates whole program", "compiler all code at once"]),
    point("A compiler produces object or executable code that can run again without retranslation.", ["compiler creates executable", "compiler object code", "run without translating again"]),
    point("An interpreter translates and executes one statement at a time.", ["interpreter line by line", "interpreter one statement", "interpreter translates as it runs"]),
    point("An interpreter normally stops at the first error and does not create a standalone executable.", ["stops at first error", "no executable", "does not create object code"]),
  ], "Strong compare answers make the translation timing and resulting output explicit."),
  question("exam-123-agile", "cs-1-2-3", "1.2.3", "Software development", 4, "Explain", "Explain why an agile development approach may suit a project whose user requirements are likely to change.", [
    point("Development is split into short iterations or increments.", ["short iterations", "increments", "sprints"]),
    point("A usable part of the system is reviewed regularly.", ["regular review", "working version", "usable increment"]),
    point("Users can give feedback throughout development.", ["user feedback", "client feedback", "stakeholder feedback"]),
    point("Requirements can be reprioritised or changed for a later iteration.", ["requirements can change", "reprioritise", "adapt to changes"]),
  ], "Agile is useful here because feedback can influence subsequent increments before the whole product is fixed."),
  question("exam-124-assembly", "cs-1-2-4", "1.2.4", "Types of programming language", 3, "Explain", "Explain why assembly language is described as processor-specific.", [
    point("Assembly instructions map closely to machine-code operations.", ["maps to machine code", "close to machine code", "mnemonics represent machine instructions"]),
    point("Different processor families have different instruction sets.", ["different instruction sets", "cpu instruction set", "processor instruction set"]),
    point("Code written for one instruction set may need rewriting for another processor.", ["not portable", "rewrite for another processor", "will not run on different cpu"]),
  ], "Processor-specific means the available mnemonics and operands depend on the target instruction set."),
  question("exam-131-hash", "cs-1-3-1", "1.3.1", "Compression, encryption and hashing", 4, "Explain", "Explain how hashing can be used when a user creates and later enters a password.", [
    point("A one-way hash function is applied to the password.", ["one way hash", "hash function applied"]),
    point("The hash value, rather than the plaintext password, is stored.", ["hash stored", "not plaintext", "digest stored"]),
    point("The entered password is hashed again during login.", ["login password hashed", "entered password is hashed"]),
    point("The new hash is compared with the stored hash.", ["hashes compared", "compare hash", "digest compared"]),
  ], "Hashing verifies equality without needing to store the original password."),
  question("exam-132-normalisation", "cs-1-3-2", "1.3.2", "Databases", 4, "Explain", "Explain why a relational database may be normalised to third normal form.", [
    point("Normalisation reduces unnecessary duplication or redundancy.", ["reduce duplication", "reduce redundancy"]),
    point("Each non-key attribute depends on the key, the whole key and nothing but the key.", ["depends on whole key", "nothing but the key", "remove partial dependency", "remove transitive dependency"]),
    point("This reduces update, insertion or deletion anomalies.", ["update anomaly", "insertion anomaly", "deletion anomaly", "reduce anomalies"]),
    point("It improves consistency or integrity because a fact is changed in fewer places.", ["data consistency", "data integrity", "changed once", "fewer places"]),
  ], "Third normal form removes partial and transitive dependencies so facts are stored in the appropriate relation."),
  question("exam-133-packet-switching", "cs-1-3-3", "1.3.3", "Networks, standards and protocols", 4, "Explain", "Explain how packet switching allows a message to travel across a network.", [
    point("The message is divided into packets.", ["split into packets", "divided into packets"]),
    point("Each packet contains addressing and sequencing/control information.", ["destination address", "sequence number", "packet header"]),
    point("Routers can send packets by different routes according to network conditions.", ["different routes", "router chooses route", "network conditions"]),
    point("Packets are reordered and reassembled at the destination; missing packets can be requested again.", ["reassembled", "reordered", "retransmitted", "requested again"]),
  ], "Packet switching shares network capacity because no dedicated end-to-end circuit is reserved."),
  question("exam-134-client-server", "cs-1-3-4", "1.3.4", "Web technologies", 3, "Explain", "Explain the roles of a web browser and web server when a user requests a web page.", [
    point("The browser sends an HTTP/HTTPS request for a resource.", ["browser sends request", "http request", "https request"]),
    point("The web server locates or generates the requested resource and sends a response.", ["server sends response", "server returns page", "server finds resource"]),
    point("The browser interprets received HTML/CSS/JavaScript and renders the page.", ["browser renders", "interprets html", "displays page"]),
  ], "The browser is the client; the server responds with resources that the client renders."),
  question("exam-141-floating-point", "cs-1-4-1", "1.4.1", "Data types", 3, "Explain", "Explain why a floating-point value may contain a rounding error.", [
    point("A floating-point representation has a finite number of bits.", ["finite bits", "limited bits", "fixed number of bits"]),
    point("Some real/denary values cannot be represented exactly in binary.", ["cannot represent exactly", "recurring binary", "not exact in binary"]),
    point("The stored mantissa is rounded or truncated, producing a small difference.", ["mantissa rounded", "mantissa truncated", "approximation", "rounding error"]),
  ], "The error comes from finite precision, not from the arithmetic operator itself."),
  question("exam-142-queue", "cs-1-4-2", "1.4.2", "Data structures", 3, "Explain", "Explain how a queue behaves when values A, B and C are enqueued in that order and then one value is dequeued.", [
    point("A queue uses first-in, first-out order.", ["first in first out", "fifo"]),
    point("A is at the front after A, B and C are enqueued.", ["a at front", "front is a"]),
    point("The dequeue operation removes/returns A, leaving B at the front.", ["dequeue a", "a removed", "b at front"]),
  ], "A queue removes from the front, so the earliest enqueued item leaves first."),
  question("exam-143-demorgan", "cs-1-4-3", "1.4.3", "Boolean algebra", 3, "Apply", "Use De Morgan's law to rewrite NOT(A AND B), then state when the resulting expression is true.", [
    point("The expression becomes (NOT A) OR (NOT B).", ["not a or not b", "¬a ∨ ¬b", "!a or !b"]),
    point("It is true when A is false.", ["a is false", "a=0", "not a true"]),
    point("It is true when B is false, including when both inputs are false.", ["b is false", "b=0", "either input false", "both false", "both are false"]),
  ], "Negating an AND changes it to an OR and negates each input."),
  question("exam-151-cma", "cs-1-5-1", "1.5.1", "Computing related legislation", 4, "Discuss", "A student guesses another user's password and reads files without permission. Discuss how the Computer Misuse Act is relevant.", [
    point("The access is unauthorised because permission was not given.", ["unauthorised access", "without permission"]),
    point("Using a guessed password does not make the access authorised.", ["guessed password", "credentials do not give permission"]),
    point("Accessing the account/data can constitute an offence under the Computer Misuse Act.", ["computer misuse act", "offence"]),
    point("Further intent to commit another offence or modify data could create more serious liability.", ["further offence", "modify data", "more serious offence", "intent"]),
  ], "Legal application should connect the facts of the scenario to unauthorised access rather than merely naming the Act."),
  question("exam-152-automation", "cs-1-5-2", "1.5.2", "Moral and ethical issues", 4, "Discuss", "Discuss one benefit and one risk of introducing automated decision-making into recruitment.", [
    point("A valid benefit is identified, such as processing applications consistently or quickly.", ["faster", "efficient", "consistent", "many applications"]),
    point("The benefit is linked to recruitment context.", ["shortlisting", "applicants", "recruitment"]),
    point("A valid risk is identified, such as bias in training data or lack of transparency.", ["bias", "discrimination", "lack of transparency", "black box"]),
    point("The risk is developed with an effect on applicants or accountability.", ["unfair", "applicant", "accountability", "appeal", "excluded"]),
  ], "A balanced discussion develops both the operational benefit and the effect of a plausible ethical risk."),
];

function point(description, alternatives) {
  return { description, alternatives };
}

function question(id, topicId, topicCode, topicTitle, marks, commandWord, prompt, rubric, modelReasoning) {
  return {
    id,
    specificationId: "ocr-h446-2020",
    componentId: "h446-01",
    topicId,
    topicCode,
    topicTitle,
    conceptIds: [`${topicId}:${PRIMARY_CONCEPTS[topicId]}`],
    marks,
    commandWord,
    prompt,
    responseType: "short_answer",
    difficulty: marks >= 4 ? 2 : 1,
    expectedMinutes: Math.max(2, marks + 1),
    rubric,
    modelReasoning,
    provenance: "original_neat_notes",
    reviewStatus: "published",
  };
}

function normaliseAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9¬!]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MARKING_STOP_WORDS = new Set(["a", "an", "the", "is", "are", "it", "in", "on", "to", "of"]);

function matchesAlternative(normalisedAnswer, alternative) {
  const normalisedAlternative = normaliseAnswer(alternative);
  if (normalisedAnswer.includes(normalisedAlternative)) return true;
  const answerTokens = new Set(normalisedAnswer.split(" "));
  const requiredTokens = normalisedAlternative.split(" ").filter((token) => !MARKING_STOP_WORDS.has(token));
  return requiredTokens.length >= 3 && requiredTokens.every((token) => answerTokens.has(token));
}

function markAnswer(questionItem, answer) {
  const normalised = normaliseAnswer(answer);
  const awarded = questionItem.rubric.map((rubricPoint) => ({
    description: rubricPoint.description,
    awarded: rubricPoint.alternatives.some((alternative) => matchesAlternative(normalised, alternative)),
  }));
  const proposedMark = awarded.filter((item) => item.awarded).length;
  return {
    proposedMark,
    maximumMark: questionItem.marks,
    markingMethod: "deterministic_rubric",
    confidence: proposedMark === 0 && normalised.split(" ").length >= 18 ? "low" : "moderate",
    awarded: awarded.filter((item) => item.awarded).map((item) => item.description),
    missing: awarded.filter((item) => !item.awarded).map((item) => item.description),
    feedback: proposedMark === questionItem.marks
      ? "Your answer includes every point in this Neat Notes rubric."
      : proposedMark
        ? "You have some creditable points. Use the missing points to improve the same answer."
        : "The rubric could not confidently match a creditable point. Review the guidance and improve your answer.",
  };
}

function getPublicQuestion(questionItem) {
  const { rubric, modelReasoning, ...publicFields } = questionItem;
  return publicFields;
}

function validateQuestionBank(questions = QUESTION_BANK) {
  const errors = [];
  const ids = new Set();
  questions.forEach((item) => {
    if (!item.id || ids.has(item.id)) errors.push(`Duplicate or missing question id: ${item.id || "unknown"}`);
    ids.add(item.id);
    if (!item.topicId || !item.prompt || !item.marks) errors.push(`Incomplete question: ${item.id}`);
    if (!Array.isArray(item.rubric) || item.rubric.length !== item.marks) errors.push(`Rubric/mark mismatch: ${item.id}`);
    if (item.provenance !== "original_neat_notes") errors.push(`Unsupported provenance: ${item.id}`);
    if (item.reviewStatus !== "published") errors.push(`Unpublished question: ${item.id}`);
  });
  return { valid: errors.length === 0, errors, count: questions.length };
}

module.exports = { QUESTION_BANK, getPublicQuestion, markAnswer, normaliseAnswer, validateQuestionBank };
