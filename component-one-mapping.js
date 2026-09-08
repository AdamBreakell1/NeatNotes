"use strict";

// Editorial links to OCR H446 v3.0, printed pages 6-10. These are not academic approvals.
const objective = (title, cards, gaps = "") => ({ title, cards: cards ? cards.split(" ") : [], gaps });
const COMPONENT_ONE_MAPPING = {
  "1.1.1": {
    a: objective("CPU components, registers and buses", "control-unit alu register accumulator program-counter cir mar mdr system-bus address-bus data-bus control-bus", "Add register/bus traces tied to assembly programs."),
    b: objective("Fetch, decode and execute", "cpu-role fde-cycle fetch-steps decode execute", "Add complete register-transfer traces."),
    c: objective("CPU performance factors", "performance-factors clock-speed cache cores"),
    d: objective("Pipelining", "pipelining pipeline-flush"),
    e: objective("Processor architectures", "von-neumann harvard contemporary"),
  },
  "1.1.2": {
    a: objective("RISC and CISC uses", "instruction-set cisc risc risc-cisc-task risc-mobile cisc-compatibility processor-choice", "Review architecture generalisations; add contextual comparisons."),
    b: objective("GPU applications", "gpu coprocessor gpu-use simd"),
    c: objective("Multicore and parallel systems", "parallel-processing multicore sisd", "Add parallel-system suitability and limitations."),
  },
  "1.1.3": {
    a: objective("Selecting input, output and storage devices", "input-device output-device rfid active-passive-rfid nfc barcode-qr actuator 3d-printer accessibility-devices ssd-tradeoffs", "Add reasoned device selection for unfamiliar scenarios."),
    b: objective("Magnetic, flash and optical storage", "optical-storage solid-state ssd-tradeoffs", "Magnetic storage operation and comparative use need direct treatment."),
    c: objective("RAM and ROM", "", "No dedicated RAM/ROM comparison in this deck."),
    d: objective("Virtual storage", "virtual-storage cloud-benefits"),
  },
  "1.2.1": {
    a: objective("Operating-system purposes", "os-definition os-functions"),
    b: objective("Memory management", "memory-management virtual-memory", "Paging and segmentation are not explicitly covered."),
    c: objective("Interrupts and service routines", "interrupt isr", "Add priority and FDE-cycle context."),
    d: objective("Process scheduling", "scheduling", "Round robin, FCFS, multilevel feedback, SJF and SRT need worked schedules."),
    e: objective("Operating-system types", "multitasking multiuser distributed embedded real-time"),
    f: objective("BIOS", "bios"),
    g: objective("Device drivers", "device-driver"),
    h: objective("Virtual machines", "virtual-machine vm-testing", "Add intermediate-code execution as a virtual-machine use."),
  },
  "1.2.2": {
    a: objective("Choosing application software", "software system-application general-special", "Add application-selection scenarios."),
    b: objective("Utilities", "", "No dedicated utility-software activity in this deck."),
    c: objective("Open and closed source", "proprietary open-source licences"),
    d: objective("Language translators", "translator compiler interpreter compiler-benefits interpreter-benefits assembler"),
    e: objective("Compilation stages", "lexical-analysis symbol-table optimisation syntax-logical", "Syntax analysis and code generation need direct treatment."),
    f: objective("Libraries, linking and loading", "libraries library-drawbacks linker loader"),
  },
  "1.2.3": {
    a: objective("Development methodologies", "stages methodology waterfall agile xp spiral rad"),
    b: objective("Choosing a methodology", "project-failure feedback waterfall-good waterfall-bad xp-drawbacks spiral-use rad-benefits rad-drawbacks evaluation"),
    c: objective("Writing and following algorithms", "", "No algorithm-writing or tracing activity in this deck; other-topic activities are not silently counted here."),
  },
  "1.2.4": {
    a: objective("Programming paradigms", "paradigm declarative", "Add explicit comparisons and selection of paradigms."),
    b: objective("Procedural programming", "procedural"),
    c: objective("Assembly programming and LMC", "assembly-language assembler instruction-set mnemonic word-opcode-operand instruction-word accumulator lmc-sequence dat branching brz repeated-subtraction", "Add executable traces and complete LMC program-writing tasks."),
    d: objective("Memory addressing modes", "immediate-addressing direct-addressing indirect-addressing indexed-addressing"),
    e: objective("Object-oriented programming", "object-oriented", "Classes, objects, encapsulation, inheritance and polymorphism need individual examples."),
  },
  "1.3.1": {
    a: objective("Lossy and lossless compression", "compression why-compress lossy lossless"),
    b: objective("Run-length and dictionary coding", "rle dictionary", "Add encoding/decoding and size-comparison tasks."),
    c: objective("Symmetric and asymmetric encryption", "encryption symmetric asymmetric key-length"),
    d: objective("Hashing applications", "hash hash-password good-hash rainbow salt checksum", "Review the distinction between fast integrity hashes and deliberately costly password hashing."),
  },
  "1.3.2": {
    a: objective("Database structures and modelling", "database table-record-field relational primary-key foreign-key secondary-key flat-file relational-benefits indexing many-to-many normalisation", "Add entity-relationship diagrams and modelling scenarios."),
    b: objective("Capturing and exchanging data", "api csv-json-xml", "Data capture, selection and management need broader scenario coverage."),
    c: objective("Normalising to third normal form", "normalisation normal-forms many-to-many", "Add worked 1NF/2NF/3NF transformations and dependency examples."),
    d: objective("Interpreting and modifying SQL", "sql-keywords order-by join", "Check the full Appendix 5d SQL scope; short SELECT questions do not cover it all."),
    e: objective("Referential integrity", "referential-integrity"),
    f: objective("Transactions and concurrency", "record-locking deadlock transaction acid", "Add redundancy, failure recovery and concurrent-update scenarios."),
  },
  "1.3.3": {
    a: objective("Networks, protocols and standards", "network network-benefits protocol standards"),
    b: objective("Internet structure and communication", "ip-address mac-address dns lan-wan packet packet-switching packet-benefits circuit-switching tcpip application-layer transport-layer internet-layer link-layer layering"),
    c: objective("Network security", "proxy firewall ddos", "Add encryption in a network-security context."),
    d: objective("Network hardware", "router switch-hub", "Add NICs and wireless access points; review frame/packet terminology."),
    e: objective("Client-server and peer-to-peer", "client-server-p2p"),
  },
  "1.3.4": {
    a: objective("HTML, CSS and JavaScript", "html css forms id-selector client-validation javascript-output", "Add code interpretation and modification matching Appendix 5d."),
    b: objective("Search indexing", "crawler indexed-words metadata seo seo-techniques", "Review dated SEO advice and distinguish indexing from ranking."),
    c: objective("PageRank", "pagerank pagerank-factors", "Add a worked calculation."),
    d: objective("Client-side and server-side processing", "client-validation javascript-output server-side server-side-benefits server-side-drawbacks"),
  },
  "1.4.1": {
    a: objective("Primitive data types", "primitive-types integer-real character-string boolean casting-parsing"),
    b: objective("Positive binary integers", "", "Base definitions alone do not demonstrate representation; add worked positive-integer tasks."),
    c: objective("Negative binary integers", "sign-magnitude twos-complement", "Add fixed-width worked representations and ranges."),
    d: objective("Binary integer arithmetic", "binary-addition binary-subtraction", "Add worked examples; review overflow instructions and signed overflow."),
    e: objective("Positive hexadecimal integers", "", "Add worked hexadecimal representations, not only a base definition."),
    f: objective("Converting number bases", "", "The nibble relationship supports this objective but is not a worked conversion."),
    g: objective("Binary floating-point representation", "floating-point mantissa-exponent normalised precision-range", "Add signed worked conversions and normalisation."),
    h: objective("Floating-point arithmetic", "", "No floating-point addition/subtraction activity in this deck."),
    i: objective("Bit manipulation and masks", "left-shift right-shift binary-mask mask-rules", "Add bounded-width examples including truncation and unsigned integer rounding."),
    j: objective("Text character sets", "ascii extended-ascii unicode"),
  },
  "1.4.2": {
    a: objective("Arrays, records, lists and tuples", "array contiguous static-array 3d-array tuple immutable list record array-of-records"),
    b: objective("Structured data storage", "queue queue-pointers queue-uses graph vertices-edges graph-types tree tree-terms graph-tree choose-structure", "Linked lists, stacks and hash tables need direct treatment in C1."),
    c: objective("Data-structure operations", "binary-tree-insert", "Creation, traversal, insertion and removal across all listed structures remain substantially incomplete."),
  },
  "1.4.3": {
    a: objective("Modelling problems with Boolean logic", "", "Gate definitions are not problem modelling; add contextual Boolean-condition tasks."),
    b: objective("Manipulating Boolean expressions", "k-map-purpose k-map-groups k-map-size k-map-expression", "Add worked expression simplification and Karnaugh maps."),
    c: objective("Boolean algebra laws", "de-morgan commutative-associative absorption", "Add distribution and double negation with worked derivations."),
    d: objective("Logic diagrams and truth tables", "and or not xor nand-nor logic-circuit truth-table-rows truth-table-columns truth-table-order circuit-to-expression expression-to-circuit", "Add diagram-based tasks and full worked truth tables."),
    e: objective("Adders and D-type flip-flops", "half-adder half-adder-limits full-adder n-bit-addition flip-flop d-type flip-flop-memory", "Add logic diagrams, truth tables and state/timing examples."),
  },
  "1.5.1": {
    a: objective("Data Protection Act syllabus context", "dpa personal-data sar dpa-principles", "OCR explicitly names the 1998 Act. Distinguish historical syllabus content from current UK law; not legal advice."),
    b: objective("Computer Misuse Act syllabus context", "cma cma-examples cma-difficulty"),
    c: objective("Copyright legislation syllabus context", "cdpa software-copying p2p"),
    d: objective("Investigatory-powers syllabus context", "ripa ripa-justifications privacy-security", "Distinguish the named syllabus Act from subsequent legislation."),
  },
  "1.5.2": {
    "[1]": objective("Workforce effects", "workforce automation skills-gap"),
    "[2]": objective("Automated decisions", "automated-decisions automated-risk filter-bubble"),
    "[3]": objective("Artificial intelligence", "ai turing-test chatbot ai-ethics"),
    "[4]": objective("Environmental effects", "energy-use e-waste positive-environment"),
    "[5]": objective("Censorship", "censorship censorship-pros censorship-cons"),
    "[6]": objective("Behaviour monitoring", "monitoring monitoring-debate"),
    "[7]": objective("Personal-information analysis", "personal-info medicine"),
    "[8]": objective("Piracy and offensive communications", "piracy offensive"),
    "[9]": objective("Cultural aspects of interface design", "culture character-sets"),
  },
};

// Useful background is retained, but does not inflate objective coverage.
const SUPPLEMENTARY_CARDS = {
  "1.4.1": { cards: "variables constants naming-conventions number-bases hex-nibble bits-bytes-nibbles n-bit-values kibi-kilo".split(" "), reason: "Background concepts, not direct demonstrations of the lettered representation/conversion objectives." },
  "1.4.3": { cards: ["precedence"], reason: "Review the stated precedence convention against the pseudocode notation before using this as objective evidence." },
  "1.5.1": { cards: ["big-four"], reason: "Syllabus overview; naming legislation alone does not demonstrate its application." },
};

function objectiveId(code, suffix) {
  return suffix.startsWith("[") ? `${code}${suffix}` : `${code}(${suffix})`;
}

function componentOneObjectives() {
  return Object.entries(COMPONENT_ONE_MAPPING).flatMap(([code, rows]) => Object.entries(rows).map(([suffix, row]) => ({
    id: objectiveId(code, suffix), code, title: row.title, componentId: "h446-01",
    localReference: suffix.startsWith("["), mappingComplete: true, gaps: row.gaps,
  })));
}

function mapComponentOneTopic(topic) {
  const mapping = COMPONENT_ONE_MAPPING[topic.code];
  if (!mapping) return topic;
  return { ...topic, contentVersion: topic.contentVersion || "legacy-c1", cards: topic.cards.map((card) => {
    const objectives = Object.entries(mapping).filter(([, row]) => row.cards.includes(card.id)).map(([suffix]) => objectiveId(topic.code, suffix));
    const supplementary = SUPPLEMENTARY_CARDS[topic.code];
    return { ...card, objectives, mappingStatus: objectives.length ? "mapped" : supplementary?.cards.includes(card.id) ? "supplementary" : "unmapped", mappingNote: supplementary?.cards.includes(card.id) ? supplementary.reason : "" };
  }) };
}

module.exports = { COMPONENT_ONE_MAPPING, SUPPLEMENTARY_CARDS, componentOneObjectives, mapComponentOneTopic, objectiveId };
