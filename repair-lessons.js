"use strict";

const VERSION = "2026-09-11-repair-1";
const SOURCE = "https://www.ocr.org.uk/Images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf";
const lesson = (id, topicId, objective, title, cardIds, steps, checks) => ({ id, topicId, objective, title, cardIds, steps, checks,
  contentVersion: VERSION, reviewStatus: "review_pending", provenance: { type: "original_editorial_draft", specification: SOURCE } });
const check = (prompt, answer, explanation) => ({ prompt, answer, explanation });
const REPAIR_LESSONS = [
  lesson("repair-address-data", "cs-1-1-1", "1.1.1(a)", "Separate an address from its data", ["program-counter", "mar", "mdr"], [
    { title: "Identify the location", body: "To write 42 into memory location 120, first identify where the write should happen. The MAR holds 120, the address." },
    { title: "Identify the payload", body: "The MDR holds 42, the data being transferred. The address bus identifies the location; the data bus carries the value." },
    { title: "Keep register roles separate", body: "The PC identifies the next instruction to fetch. It is not the payload of every data transfer. Ask 'where?' for MAR and 'what value?' for MDR." },
  ], [check("A write stores 17 at address 64. Enter the value in the MAR.", "64", "MAR = 64 is the destination address; MDR = 17 is the data."), check("A read retrieves 93 from address 28. Enter the value received by the MDR.", "93", "The MDR receives the data, 93. The MAR holds its address, 28.")]),
  lesson("repair-ram-rom", "cs-1-1-3", "1.1.3(c)", "Choose RAM or ROM by its role", [], [
    { title: "Separate working data from startup instructions", body: "A document being edited needs read/write working memory. Firmware needed at startup must remain available when power has been off." },
    { title: "Consider volatility", body: "RAM is normally volatile: its contents are lost without power. ROM is non-volatile. Modern firmware may use reprogrammable non-volatile memory rather than permanently unchangeable chips." },
    { title: "Apply both properties", body: "Choose RAM for the changing working copy of an open document. Choose ROM/non-volatile firmware storage for persistent startup instructions. Saving the document normally writes it to secondary storage." },
  ], [check("Which is normally volatile working memory: RAM or ROM? Enter RAM or ROM.", "RAM", "RAM holds changing working data and normally loses its contents when power is removed."), check("Which retains firmware without power: RAM or ROM? Enter RAM or ROM.", "ROM", "ROM is non-volatile. Reprogrammable firmware storage still retains contents without power.")]),
  lesson("repair-utilities", "cs-1-2-2", "1.2.2(b)", "Recognise utility software", ["system-application"], [
    { title: "Find the purpose", body: "Utility software supports maintenance, management or protection of a computer system. Examples include backup tools, compression tools and anti-malware utilities." },
    { title: "Distinguish the user's main task", body: "A spreadsheet performs the user's modelling task. A backup utility protects copies of files. Both are software, but they have different purposes." },
    { title: "Avoid a device-independent rule", body: "Defragmentation can reduce movement between fragmented files on a magnetic disk. It is not a universal speed improvement for flash storage, which has no moving head." },
  ], [check("A program schedules copies of user files to another drive. Enter utility or application.", "utility", "Its purpose is system/data maintenance through backup, so it is a utility."), check("A program helps the user model a monthly budget in a spreadsheet. Enter utility or application.", "application", "The spreadsheet performs the user's task rather than maintaining the system.")]),
  lesson("repair-algorithm-trace", "cs-1-2-3", "1.2.3(c)", "Trace a bounded counting algorithm", [], [
    { title: "Define the task and initialise", body: "Task: count values at least 10 in [7, 12, 10]. Set count = 0 before inspecting the list." },
    { title: "Follow the selection for each value", body: "For 7, the condition value >= 10 is false, so count stays 0. For 12 it is true, giving 1. For 10 it is also true, giving 2." },
    { title: "Check the boundary and output", body: "OUTPUT count after the loop gives 2. Replacing >= with > would wrongly exclude 10. A trace table should record each tested value and the count after that iteration." },
  ], [check("Using count = 0 and adding 1 for each value >= 10, what count is output for [10, 4, 15, 11]? Enter an integer.", "3", "10, 15 and 11 satisfy the condition. The final count is 3."), check("Now count values > 10 in [10, 4, 15, 11]. What count is output?", "2", "Only 15 and 11 are strictly greater than 10. Changing the boundary changes the result to 2.")]),
  lesson("repair-positive-binary", "cs-1-4-1", "1.4.1(b)", "Build an unsigned binary representation", [], [
    { title: "Write the place values", body: "An unsigned 8-bit pattern has place values 128, 64, 32, 16, 8, 4, 2, 1 from left to right." },
    { title: "Decompose the number", body: "For denary 45, choose 32 (13 remains), then 8 (5 remains), 4 (1 remains), then 1 (0 remains)." },
    { title: "Mark each place", body: "Set the chosen positions to 1 and the others to 0: 00101101. Check: 32 + 8 + 4 + 1 = 45. Leading zeroes preserve the requested width." },
  ], [check("Write denary 38 as an unsigned 8-bit binary pattern, with no spaces.", "00100110", "38 = 32 + 4 + 2, so the 32, 4 and 2 positions are set."), check("Write denary 73 as an unsigned 8-bit binary pattern, with no spaces.", "01001001", "73 = 64 + 8 + 1, giving 01001001.")]),
  lesson("repair-positive-hex", "cs-1-4-1", "1.4.1(e)", "Read hexadecimal place values", [], [
    { title: "Use base sixteen", body: "Hexadecimal uses 0-9 followed by A-F for values ten to fifteen. The rightmost two positions have weights 1 and 16." },
    { title: "Expand a value", body: "Hexadecimal 2B means 2 times 16 plus 11 times 1, giving denary 43. B is a digit with value eleven, not a variable." },
    { title: "Reverse the calculation", body: "To write denary 58 in hexadecimal, divide by 16: quotient 3, remainder 10. Write the remainder as A, giving 3A." },
  ], [check("Write denary 77 as a two-digit hexadecimal value, without a prefix.", "4D", "77 = 4 times 16 + 13. Thirteen is hexadecimal D."), check("Write denary 94 as a two-digit hexadecimal value, without a prefix.", "5E", "94 = 5 times 16 + 14. Fourteen is hexadecimal E.")]),
  lesson("repair-base-conversion", "cs-1-4-1", "1.4.1(f)", "Convert binary and hexadecimal", ["hex-nibble"], [
    { title: "Group bits from the right", body: "For binary 11010110, form the nibbles 1101 and 0110. Each group of four bits represents one hexadecimal digit." },
    { title: "Evaluate each group", body: "1101 = 8 + 4 + 1 = 13, written D. 0110 = 4 + 2 = 6. The full hexadecimal value is D6." },
    { title: "Verify with place values", body: "D6 = 13 times 16 + 6 = 214. The binary sum 128 + 64 + 16 + 4 + 2 also gives 214. Retain all four bits when converting each hex digit back." },
  ], [check("Convert binary 10101111 into two hexadecimal digits, with no prefix.", "AF", "1010 is A and 1111 is F, so the result is AF."), check("Convert hexadecimal 3C into eight binary digits, with no spaces.", "00111100", "3 maps to 0011 and C maps to 1100. Preserve the leading zeroes.")]),
  lesson("repair-floating-addition", "cs-1-4-1", "1.4.1(h)", "Align binary floating-point values before adding", ["floating-point", "mantissa-exponent"], [
    { title: "Fix the representation", body: "Use positive binary mantissas with the binary point immediately after the sign bit. Work without rounding in this example: 0.1100 x 2^3 and 0.1000 x 2^2." },
    { title: "Align the exponents", body: "Rewrite the second number as 0.0100 x 2^3. Increasing its exponent by one requires shifting its mantissa right by one to preserve the value." },
    { title: "Add and normalise", body: "Retain an extra carry bit while adding: 0.1100 + 0.0100 = 1.0000 as a positive intermediate value, not a stored signed mantissa. Normalise to 0.1000 and increase the exponent from 3 to 4. Check: 6 + 2 = 8." },
  ], [check("Add 0.1000 x 2^3 and 0.1000 x 2^2. Enter the denary result.", "6", "The values are 4 and 2. Align the second mantissa to 0.0100 x 2^3, giving 0.1100 x 2^3 = 6."), check("Subtract 0.1000 x 2^2 from 0.1100 x 2^3. Enter the denary result.", "4", "6 - 2 = 4. Aligned subtraction gives 0.1000 x 2^3. These exact positive examples do not cover signed arithmetic or rounding.")]),
  lesson("repair-boolean-model", "cs-1-4-3", "1.4.3(a)", "Translate a condition into Boolean logic", ["and", "or", "de-morgan"], [
    { title: "Name each condition", body: "A door opens only when a valid card is present and the alarm is not active. Let C mean valid card and A mean alarm active." },
    { title: "Translate the relationship", body: "Both requirements must hold: C AND NOT A. OR would allow the door to open with only one of the requirements satisfied." },
    { title: "Check a counterexample", body: "If C = 1 and A = 1, the door must stay closed. C AND NOT A gives 1 AND 0 = 0. Testing a risky input combination helps expose an incorrect model." },
  ], [check("A light turns on when motion M is detected AND it is NOT bright B. For M = 1 and B = 1, enter the output 0 or 1.", "0", "M AND NOT B = 1 AND 0 = 0. Motion alone is insufficient when it is bright."), check("The same light uses M AND NOT B. For M = 1 and B = 0, enter the output 0 or 1.", "1", "Both requirements now hold: motion is detected and it is not bright, so 1 AND 1 = 1.")]),
];

function isRepairReleased(item, review, production = process.env.NODE_ENV === "production") {
  if (review.quarantinedTopicIds?.includes(item.topicId) || item.cardIds.some((id) => review.quarantinedConceptIds?.includes(`${item.topicId}:${id}`))) return false;
  return !production || (review.repairApprovals || []).some((entry) => entry.lessonId === item.id && entry.contentVersion === VERSION
    && entry.decision === "approved" && entry.reviewer?.trim() && Number.isFinite(Date.parse(entry.reviewedAt)));
}
function publicRepair(item, variant = 0) {
  const { checks, ...publicFields } = item;
  return { ...publicFields, variant, prompt: checks[variant].prompt };
}
function assessRepair(item, value, variant = 0) {
  const target = item.checks[variant];
  if (!target) return null;
  const correct = String(value).trim().toUpperCase() === target.answer.toUpperCase();
  return { correct, answer: target.answer, explanation: target.explanation, notice: "Guided practice, not an exam mark or proof of lasting mastery." };
}
module.exports = { VERSION, REPAIR_LESSONS, isRepairReleased, publicRepair, assessRepair };
