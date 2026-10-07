/* RecallStride rs-h446-1.0.0. Original bounded interpreter; no host-code execution. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecallPseudocode = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "rs-h446-1.0.0";
  const LIMITS = Object.freeze({ source: 16384, tokens: 6000, depth: 64, instructions: 50000, wallMs: 750,
    calls: 32, variables: 256, arrayCells: 4096, string: 8192, stringAllocation: 262144,
    outputLines: 200, outputChars: 16384, inputs: 100, inputItem: 1024, inputChars: 8192, trace: 120 });
  const KEYWORDS = new Set("if then elseif else endif for to next while endwhile do until array function endfunction procedure endprocedure return true false and or not div mod byval".split(" "));
  const UNSUPPORTED = new Set("switch case default endswitch global byref class endclass private public new inherits super openread openwrite readline writeline endoffile close step break continue repeat import require eval".split(" "));
  const BUILTINS = new Set(["input", "print", "int", "float", "str"]);
  class Diagnostic extends Error {
    constructor(category, code, message, at = {}, hint = "Check the supported-language reference, then edit and run again.") {
      super(message); this.category = category; this.code = code; this.line = at.line || 1; this.column = at.column || 1; this.hint = hint;
    }
    toJSON() { return { category: this.category, code: this.code, message: this.message, line: this.line, column: this.column, hint: this.hint }; }
  }
  const fail = (category, code, message, at, hint) => { throw new Diagnostic(category, code, message, at, hint); };
  function ceilings(overrides = {}) {
    const limits = { ...LIMITS };
    for (const key of Object.keys(limits)) if (Number.isInteger(overrides[key]) && overrides[key] > 0) limits[key] = Math.min(limits[key], overrides[key]);
    return limits;
  }
  function lex(source, limits = LIMITS) {
    if (typeof source !== "string") fail("syntax", "SOURCE_TYPE", "Enter a text program.");
    if (source.length > limits.source) fail("limit", "SOURCE_LIMIT", `Program exceeds ${limits.source} characters.`, {}, "Shorten the program before running it.");
    const tokens = []; let i = 0, line = 1, column = 1;
    const advance = () => { const c = source[i++]; if (c === "\n") { line++; column = 1; } else column++; return c; };
    const add = (type, value, start, ln, col) => { tokens.push({ type, value, start, end: i, line: ln, column: col }); if (tokens.length > limits.tokens) fail("limit", "TOKEN_LIMIT", "Program has too many tokens.", { line: ln, column: col }); };
    while (i < source.length) {
      const start = i, ln = line, col = column, c = source[i];
      if (c === " " || c === "\t" || c === "\r") { advance(); continue; }
      if (c === "\n") { advance(); add("newline", "\n", start, ln, col); continue; }
      if (c === "/" && source[i + 1] === "/") { while (i < source.length && source[i] !== "\n") advance(); continue; }
      if (c === '"' || c === "'") {
        const quote = advance(); let value = "";
        while (i < source.length && source[i] !== quote && source[i] !== "\n") {
          if (source[i] === "\\") fail("unsupported", "STRING_ESCAPE", "String escape sequences are not supported in this version.", { line, column });
          value += advance();
        }
        if (source[i] !== quote) fail("syntax", "UNCLOSED_STRING", "This string needs a closing quote on the same line.", { line: ln, column: col });
        advance(); if (value.length > limits.string) fail("limit", "STRING_LIMIT", "String is too long.", { line: ln, column: col });
        add("string", value, start, ln, col); continue;
      }
      if (/[0-9]/.test(c)) {
        while (i < source.length && /[0-9]/.test(source[i])) advance();
        if (source[i] === "." && /[0-9]/.test(source[i + 1] || "")) { advance(); while (i < source.length && /[0-9]/.test(source[i])) advance(); }
        const value = Number(source.slice(start, i));
        if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) fail("runtime", "NUMBER_RANGE", "Number is outside this interpreter's safe magnitude.", { line: ln, column: col });
        add("number", value, start, ln, col); continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) advance();
        const value = source.slice(start, i), lower = value.toLowerCase();
        if (value.length > 64) fail("limit", "IDENTIFIER_LIMIT", "Names may contain at most 64 characters.", { line: ln, column: col });
        if (UNSUPPORTED.has(lower)) fail("unsupported", "UNSUPPORTED_CONSTRUCT", `${value} is not supported in ${VERSION}. This does not determine an OCR mark.`, { line: ln, column: col });
        add(KEYWORDS.has(lower) ? lower : "identifier", KEYWORDS.has(lower) ? lower : value, start, ln, col); continue;
      }
      const pair = source.slice(i, i + 2);
      if (["==", "!=", "<=", ">="].includes(pair)) { advance(); advance(); add(pair, pair, start, ln, col); continue; }
      if ("=+-*/^<>()[],.:".includes(c)) { advance(); add(c, c, start, ln, col); continue; }
      fail(/[“”‘’]/.test(c) ? "unsupported" : "syntax", "CHARACTER", `Character ${c} is not accepted here.`, { line: ln, column: col }, /[“”‘’]/.test(c) ? "Replace typographic quotes with straight quotes in this executable dialect." : "Use the syntax reference to check this character.");
    }
    add("eof", "", i, line, column); return tokens;
  }
  const PRECEDENCE = { or: 1, and: 2, "==": 4, "!=": 4, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, div: 6, mod: 6, "^": 8 };
  class Parser {
    constructor(tokens, limits) { this.tokens = tokens; this.i = 0; this.depth = 0; this.limits = limits; this.routine = null; this.blockDepth = 0; }
    peek() { return this.tokens[this.i]; }
    at(type) { return this.peek().type === type; }
    take(type) { if (this.at(type)) return this.tokens[this.i++]; return null; }
    need(type) {
      const token = this.take(type); if (token) return token;
      fail("syntax", "EXPECTED_TOKEN", `Expected ${type === "newline" ? "a new line" : type}; found ${this.peek().value || "end of program"}.`, this.peek(), this.at("=") ? "Use == to compare values. A single = assigns a value." : undefined);
    }
    lineEnd() { if (!this.at("eof")) this.need("newline"); }
    name() { const t = this.need("identifier"); if (BUILTINS.has(t.value.toLowerCase())) fail("syntax", "RESERVED_NAME", "Use a name that is not an input/output or casting function.", t); return t; }
    nested(fn) { if (++this.depth > this.limits.depth) fail("limit", "PARSE_DEPTH", "Program is nested too deeply.", this.peek()); try { return fn(); } finally { this.depth--; } }
    block(ends) {
      return this.nested(() => {
        const body = []; this.blockDepth++;
        try { while (!ends.includes(this.peek().type) && !this.at("eof")) {
          if (this.take("newline")) continue;
          body.push(this.statement()); this.lineEnd();
        } } finally { this.blockDepth--; }
        return body;
      });
    }
    statement() {
      const at = this.peek();
      if (this.take("if")) {
        const branches = []; let condition = this.expression(); this.need("then"); this.lineEnd();
        branches.push({ condition, body: this.block(["elseif", "else", "endif"]) });
        while (this.take("elseif")) { condition = this.expression(); this.need("then"); this.lineEnd(); branches.push({ condition, body: this.block(["elseif", "else", "endif"]) }); }
        let otherwise = []; if (this.take("else")) { this.lineEnd(); otherwise = this.block(["endif"]); }
        this.need("endif"); return { kind: "if", branches, otherwise, at };
      }
      if (this.take("while")) { const condition = this.expression(); this.lineEnd(); const body = this.block(["endwhile"]); this.need("endwhile"); return { kind: "while", condition, body, at }; }
      if (this.take("do")) { this.lineEnd(); const body = this.block(["until"]); this.need("until"); const condition = this.expression(); return { kind: "do", condition, body, at }; }
      if (this.take("for")) {
        const name = this.name().value; this.need("="); const start = this.expression(); this.need("to"); const end = this.expression(); this.lineEnd();
        const body = this.block(["next"]); this.need("next"); const close = this.name(); if (close.value !== name) fail("syntax", "FOR_NAME", `Close this loop with next ${name}.`, close);
        return { kind: "for", name, start, end, body, at };
      }
      if (this.at("function") || this.at("procedure")) {
        const kind = this.tokens[this.i++].type;
        if (this.routine || this.blockDepth !== 1) fail("unsupported", "NESTED_ROUTINE", "Define routines at the top level.", at);
        const name = this.name().value; this.need("("); const params = [];
        if (!this.at(")")) do { const param = this.name(); if (params.includes(param.value)) fail("syntax", "DUPLICATE_PARAMETER", "Parameter names must be distinct.", param); params.push(param.value); if (this.take(":")) this.need("byval"); } while (this.take(","));
        this.need(")"); this.lineEnd(); this.routine = kind; const body = this.block([`end${kind}`]); this.routine = null; this.need(`end${kind}`);
        return { kind, name, params, body, at };
      }
      if (this.take("return")) {
        if (this.routine !== "function") fail("syntax", "RETURN_CONTEXT", "A value can be returned only inside a function.", at);
        return { kind: "return", value: this.expression(), at };
      }
      if (this.take("array")) { const name = this.name().value; this.need("["); const size = this.expression(); if (this.at(",")) fail("unsupported", "ARRAY_DIMENSIONS", "Only one-dimensional arrays are supported.", this.peek()); this.need("]"); return { kind: "array", name, size, at }; }
      const left = this.expression();
      if (this.take("=")) { if (!["variable", "index"].includes(left.kind)) fail("syntax", "ASSIGN_TARGET", "Assign to a variable or an array cell.", at); return { kind: "assign", left, value: this.expression(), at }; }
      if (left.kind !== "call") fail("syntax", "STATEMENT", "Use an assignment or a routine call on this line.", at);
      return { kind: "callStatement", call: left, at };
    }
    expression(min = 0) {
      return this.nested(() => {
        const at = this.peek(); let left;
        if (this.take("not")) left = { kind: "unary", op: "not", value: this.expression(3), at };
        else if (this.at("+") || this.at("-")) { this.i++; left = { kind: "unary", op: at.type, value: this.expression(7), at }; }
        else if (this.take("(")) { left = this.expression(); this.need(")"); }
        else if (["number", "string", "true", "false"].includes(at.type)) { this.i++; left = { kind: "literal", value: at.type === "true" ? true : at.type === "false" ? false : at.value, at }; }
        else { const name = this.need("identifier"); left = { kind: "variable", name: name.value, at: name }; }
        while (true) {
          if (this.take("(")) {
            if (left.kind !== "variable") fail("unsupported", "CALL_TARGET", "Only named routines can be called.", at);
            const args = []; if (!this.at(")")) do { args.push(this.expression()); } while (this.take(",")); this.need(")");
            left = { kind: "call", name: left.name, args, at }; continue;
          }
          if (this.take("[")) { const index = this.expression(); if (this.at(",")) fail("unsupported", "ARRAY_DIMENSIONS", "Only one-dimensional arrays are supported.", this.peek()); this.need("]"); left = { kind: "index", object: left, index, at }; continue; }
          if (this.take(".")) {
            const member = this.need("identifier"), name = member.value.toLowerCase();
            if (!["length", "substring"].includes(name)) fail("unsupported", "MEMBER", "Only string length and subString are available; host properties are never exposed.", member);
            const args = [];
            if (name === "substring") { this.need("("); args.push(this.expression()); this.need(","); args.push(this.expression()); this.need(")"); }
            left = { kind: "member", object: left, name, args, at }; continue;
          }
          const op = this.peek().type, prec = PRECEDENCE[op];
          if (prec === undefined || prec < min) break;
          const token = this.tokens[this.i++];
          if (prec === 4 && left.kind === "binary" && PRECEDENCE[left.op] === 4) fail("syntax", "CHAINED_COMPARISON", "Join separate comparisons with AND.", token);
          left = { kind: "binary", op, left, right: this.expression(prec + (op === "^" ? 0 : 1)), at: token };
        }
        return left;
      });
    }
  }
  function parse(source, limits = LIMITS) {
    const parser = new Parser(lex(source, limits), limits), body = parser.block([]); parser.need("eof");
    // Left-associative chains and member chains can grow deep without recursive parsing.
    const pending = [{ value: body, depth: 0 }];
    while (pending.length) {
      const { value, depth } = pending.pop(); if (!value || typeof value !== "object") continue;
      if (depth > limits.depth) fail("limit", "AST_DEPTH", "Expression or block is nested too deeply.", value.at);
      for (const [key, child] of Object.entries(value)) if (key !== "at" && child && typeof child === "object") {
        if (Array.isArray(child)) for (const item of child) pending.push({ value: item, depth: depth + 1 });
        else pending.push({ value: child, depth: depth + 1 });
      }
    }
    return body;
  }
  const isArray = (value) => Boolean(value && typeof value === "object" && value.kind === "array");
  const valueType = (value) => isArray(value) ? "array" : typeof value;
  class Runtime {
    constructor(limits, inputs, trace) {
      this.limits = limits; this.inputs = inputs; this.inputIndex = 0; this.output = []; this.prompts = []; this.outputChars = 0;
      this.trace = []; this.traceEnabled = trace; this.traceTruncated = false; this.steps = 0; this.allocatedCells = 0; this.allocatedStrings = 0; this.variables = 0;
      this.routines = new Map(); this.stack = []; this.counterLocks = new WeakMap(); this.started = Date.now(); this.lastAt = {};
    }
    tick(at, cost = 1) { this.lastAt = at || this.lastAt; this.steps += cost; if (this.steps > this.limits.instructions) fail("limit", "WORK_LIMIT", "Execution stopped at the work limit; a loop may not be progressing.", this.lastAt, "Check conditions, bounds and updates, then run again."); if (Date.now() - this.started > this.limits.wallMs) fail("limit", "TIME_LIMIT", "Execution reached its time limit.", this.lastAt, "Check for a loop that cannot finish or reduce the input size."); }
    number(value, at, integer = false) { if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER || (integer && !Number.isSafeInteger(value))) fail("runtime", "NUMBER_TYPE", integer ? "Expected a safe integer." : "Expected a finite number within ±(2^53−1).", at); return value; }
    boolean(value, at) { if (typeof value !== "boolean") fail("runtime", "BOOLEAN_TYPE", "This condition needs true or false.", at, "Compare values explicitly, for example count > 0."); return value; }
    string(value, at, allocated = false) { if (typeof value !== "string") fail("runtime", "STRING_TYPE", "This operation needs a string.", at); if (value.length > this.limits.string) fail("limit", "STRING_LIMIT", "String exceeds the per-value limit.", at); if (allocated) { this.allocatedStrings += value.length; this.tick(at, 1 + value.length); if (this.allocatedStrings > this.limits.stringAllocation) fail("limit", "ALLOCATION_LIMIT", "String allocation budget exhausted.", at); } return value; }
    scalarText(value, at) { if (!["number", "string", "boolean"].includes(typeof value)) fail("runtime", "SCALAR_REQUIRED", "Print or convert one scalar value, not an array or procedure.", at); return String(value); }
    array(size, at) { this.number(size, at, true); if (size < 0 || size > this.limits.arrayCells - this.allocatedCells) fail("limit", "ARRAY_LIMIT", "Array allocation exceeds the cumulative cell limit.", at); this.allocatedCells += size; this.tick(at, size + 1); return { kind: "array", cells: Array(size).fill(undefined) }; }
    copy(value, at) { if (isArray(value)) { const copy = this.array(value.cells.length, at); copy.cells = value.cells.map((cell) => typeof cell === "string" ? this.string(cell, at, true) : cell); return copy; } return typeof value === "string" ? this.string(value, at, true) : value; }
    get(env, name, at) { if (!env.has(name)) fail("runtime", "UNDEFINED_VARIABLE", `${name} has no value in this scope.`, at, "Assign it before reading it, or pass it as a parameter."); return env.get(name); }
    set(env, name, value, at, counter = false) {
      if (!counter && this.counterLocks.get(env)?.has(name)) fail("runtime", "FOR_COUNTER", "Do not change a for-loop counter inside its body in this dialect.", at, "Use a while loop when you need to control the update yourself.");
      if (env.has(name) && valueType(env.get(name)) !== valueType(value)) fail("runtime", "TYPE_CHANGE", `${name} already has a different value type.`, at);
      if (!env.has(name) && ++this.variables > this.limits.variables) fail("limit", "VARIABLE_LIMIT", "Variable declaration budget exhausted.", at);
      env.set(name, value);
    }
    slot(node, env) { const object = this.eval(node.object, env), index = this.number(this.eval(node.index, env), node.at, true); if (!isArray(object)) fail("runtime", "ARRAY_TYPE", "Indexing needs a declared array; use subString for strings.", node.at); if (index < 0 || index >= object.cells.length) fail("runtime", "ARRAY_BOUNDS", `Index ${index} is outside 0 to ${object.cells.length - 1}.`, node.at); return { object, index }; }
    eval(node, env) {
      this.tick(node.at);
      if (node.kind === "literal") return typeof node.value === "string" ? this.string(node.value, node.at, true) : node.value;
      if (node.kind === "variable") return this.get(env, node.name, node.at);
      if (node.kind === "index") { const { object, index } = this.slot(node, env); if (object.cells[index] === undefined) fail("runtime", "UNINITIALISED_CELL", `Array cell ${index} has not been assigned.`, node.at); return object.cells[index]; }
      if (node.kind === "call") return this.call(node, env, true);
      if (node.kind === "member") {
        const object = this.string(this.eval(node.object, env), node.at);
        if (node.name === "length") return object.length;
        const start = this.number(this.eval(node.args[0], env), node.at, true), count = this.number(this.eval(node.args[1], env), node.at, true);
        if (start < 0 || count < 0 || start + count > object.length) fail("runtime", "STRING_BOUNDS", "subString start/count is outside this string.", node.at, "Positions start at zero; the second argument is a character count.");
        return this.string(object.slice(start, start + count), node.at, true);
      }
      if (node.kind === "unary") { const v = this.eval(node.value, env); return node.op === "not" ? !this.boolean(v, node.at) : this.number(node.op === "-" ? -this.number(v, node.at) : this.number(v, node.at), node.at); }
      if (node.kind !== "binary") fail("runtime", "EXPRESSION", "Unsupported expression node.", node.at);
      const a = this.eval(node.left, env), op = node.op;
      if (op === "and") return this.boolean(a, node.at) && this.boolean(this.eval(node.right, env), node.at);
      if (op === "or") return this.boolean(a, node.at) || this.boolean(this.eval(node.right, env), node.at);
      const b = this.eval(node.right, env);
      if (PRECEDENCE[op] === 4) {
        if (typeof a !== typeof b || !["string", "number", "boolean"].includes(typeof a) || (!["==", "!="].includes(op) && typeof a === "boolean")) fail("runtime", "COMPARISON_TYPE", "Compare scalar values of the same type.", node.at);
        this.tick(node.at, typeof a === "string" ? a.length + b.length + 1 : 1);
        return op === "==" ? a === b : op === "!=" ? a !== b : op === "<" ? a < b : op === "<=" ? a <= b : op === ">" ? a > b : a >= b;
      }
      if (op === "+" && typeof a === "string" && typeof b === "string") {
        if (a.length + b.length > this.limits.string) fail("limit", "STRING_LIMIT", "Concatenation would exceed the string limit.", node.at);
        return this.string(a + b, node.at, true);
      }
      this.number(a, node.at, ["div", "mod"].includes(op)); this.number(b, node.at, ["div", "mod"].includes(op));
      if (["/", "div", "mod"].includes(op) && b === 0) fail("runtime", "DIVIDE_ZERO", "Cannot divide by zero.", node.at, "Check the divisor before doing this calculation.");
      const result = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : op === "div" ? Math.trunc(a / b) : op === "mod" ? a % b : a ** b;
      return this.number(result, node.at);
    }
    call(node, env, needsValue) {
      this.tick(node.at); const name = node.name.toLowerCase();
      if (BUILTINS.has(name)) {
        if (node.args.length !== 1) fail("runtime", "ARGUMENT_COUNT", `${node.name} expects exactly one argument.`, node.at);
        if (name === "print" && needsValue) fail("runtime", "PROCEDURE_VALUE", "print produces output, not a return value.", node.at);
        const value = this.eval(node.args[0], env);
        if (name === "input") {
          const prompt = this.string(value, node.at); this.prompts.push(prompt);
          if (this.inputIndex >= this.inputs.length) fail("input", "INPUT_EXHAUSTED", `Input ${this.inputIndex + 1} is missing. ${prompt.slice(0, 160)}`, node.at, "Add another fixture line and run from the beginning, or press Stop to cancel.");
          return this.string(this.inputs[this.inputIndex++], node.at, true);
        }
        if (name === "print") {
          const text = this.scalarText(value, node.at); this.tick(node.at, text.length + 1);
          if (this.output.length >= this.limits.outputLines || this.outputChars + text.length + 1 > this.limits.outputChars) fail("limit", "OUTPUT_LIMIT", "Output limit reached; further output was stopped.", node.at, "Check for repeated printing inside a loop.");
          this.output.push(text); this.outputChars += text.length + 1; return undefined;
        }
        if (name === "str") return this.string(this.scalarText(value, node.at), node.at, true);
        let number = value;
        if (typeof value === "string") {
          this.tick(node.at, value.length + 1);
          if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) fail("runtime", "INVALID_NUMBER_INPUT", "The complete input must be a decimal number.", node.at, "Check your input fixture; text such as 12cats is not a number.");
          number = Number(value.trim());
        }
        this.number(number, node.at); return name === "int" ? Math.trunc(number) : number;
      }
      const routine = this.routines.get(node.name);
      if (!routine) fail("unsupported", "UNKNOWN_ROUTINE", `${node.name} is not a defined routine or a supported built-in. No host routines are available.`, node.at);
      if (needsValue && routine.kind !== "function") fail("runtime", "PROCEDURE_VALUE", "A procedure has no value to use in an expression.", node.at);
      if (node.args.length !== routine.params.length) fail("runtime", "ARGUMENT_COUNT", `${node.name} expects ${routine.params.length} arguments.`, node.at);
      if (this.stack.includes(node.name)) fail("unsupported", "RECURSION", "Recursion is not supported in this version.", node.at);
      if (this.stack.length >= this.limits.calls) fail("limit", "CALL_DEPTH", "Routine call depth limit reached.", node.at);
      const args = node.args.map((arg) => this.copy(this.eval(arg, env), node.at)), local = new Map();
      routine.params.forEach((param, i) => this.set(local, param, args[i], node.at)); this.stack.push(node.name);
      let result; try { result = this.block(routine.body, local); } finally { this.stack.pop(); }
      if (routine.kind === "function" && !result?.returned) fail("runtime", "MISSING_RETURN", `${node.name} finished without returning a value.`, node.at);
      return result?.value;
    }
    snapshot(node, env) {
      if (!this.traceEnabled) return;
      if (this.trace.length >= this.limits.trace) { this.traceTruncated = true; return; }
      const summarize = (v) => v === undefined ? "unassigned" : typeof v === "string" ? v.slice(0, 80) + (v.length > 80 ? "…" : "") : v;
      this.trace.push({ line: node.at.line, column: node.at.column, stack: this.stack.slice(), variables: [...env.entries()].slice(0, 12).map(([name, v]) => ({ name, value: isArray(v) ? { cells: v.cells.slice(0, 8).map(summarize), length: v.cells.length } : summarize(v) })) });
    }
    block(body, env) {
      for (const node of body) {
        this.tick(node.at); let result;
        if (node.kind === "assign") {
          const slot = node.left.kind === "index" ? this.slot(node.left, env) : null;
          const value = this.eval(node.value, env); if (isArray(value) || value === undefined) fail("unsupported", "ASSIGN_VALUE", "Assign scalar values; whole-array assignment is not supported.", node.at);
          if (slot) { const prior = slot.object.cells[slot.index]; if (prior !== undefined && typeof prior !== typeof value) fail("runtime", "TYPE_CHANGE", "This array cell already has a different type.", node.at); slot.object.cells[slot.index] = value; }
          else this.set(env, node.left.name, value, node.at);
        } else if (node.kind === "array") { if (env.has(node.name)) fail("runtime", "ARRAY_REDECLARE", "This name is already declared.", node.at); this.set(env, node.name, this.array(this.eval(node.size, env), node.at), node.at); }
        else if (node.kind === "callStatement") this.call(node.call, env, false);
        else if (node.kind === "return") { const value = this.eval(node.value, env); if (isArray(value)) fail("unsupported", "ARRAY_RETURN", "Array return values are not supported.", node.at); result = { returned: true, value }; }
        else if (node.kind === "if") { let body = node.otherwise; for (const branch of node.branches) if (this.boolean(this.eval(branch.condition, env), node.at)) { body = branch.body; break; } result = this.block(body, env); }
        else if (node.kind === "while") { while (true) { this.tick(node.at); if (!this.boolean(this.eval(node.condition, env), node.at)) break; result = this.block(node.body, env); if (result) break; } }
        else if (node.kind === "do") { do { this.tick(node.at); result = this.block(node.body, env); if (result) break; } while (!this.boolean(this.eval(node.condition, env), node.at)); }
        else if (node.kind === "for") {
          const start = this.number(this.eval(node.start, env), node.at, true), end = this.number(this.eval(node.end, env), node.at, true);
          if (!this.counterLocks.has(env)) this.counterLocks.set(env, new Set()); const locks = this.counterLocks.get(env);
          if (locks.has(node.name)) fail("runtime", "FOR_COUNTER", "Nested loops must use distinct counters.", node.at);
          this.set(env, node.name, start, node.at); locks.add(node.name);
          try { for (let i = start; i <= end; i++) { this.tick(node.at); this.set(env, node.name, i, node.at, true); result = this.block(node.body, env); if (result || i === end) break; } } finally { locks.delete(node.name); }
        }
        this.snapshot(node, env); if (result) return result;
      }
      return null;
    }
    run(body) { for (const node of body) if (["function", "procedure"].includes(node.kind)) { if (this.routines.has(node.name)) fail("syntax", "DUPLICATE_ROUTINE", "Routine names must be unique.", node.at); this.routines.set(node.name, node); } const env = new Map(); this.block(body.filter((node) => !["function", "procedure"].includes(node.kind)), env); }
  }
  function execute(source, inputs = [], options = {}) {
    const limits = ceilings(options.limits); let runtime;
    try {
      if (!Array.isArray(inputs) || inputs.length > limits.inputs || inputs.some((item) => typeof item !== "string" || item.length > limits.inputItem) || inputs.reduce((n, item) => n + item.length, 0) > limits.inputChars) fail("limit", "INPUT_LIMIT", "Input queue exceeds its size limit.");
      const body = parse(source, limits); runtime = new Runtime(limits, inputs, options.trace === true); runtime.run(body);
      return { ok: true, version: VERSION, output: runtime.output, prompts: runtime.prompts, trace: runtime.trace, traceTruncated: runtime.traceTruncated, steps: runtime.steps, inputsUsed: runtime.inputIndex };
    } catch (error) {
      const diagnostic = error instanceof Diagnostic ? error.toJSON() : new Diagnostic("limit", "EXECUTION_FAILURE", "Execution stopped safely. Reduce nesting and check the supported syntax.", runtime?.lastAt).toJSON();
      return { ok: false, version: VERSION, diagnostic, output: runtime?.output || [], prompts: runtime?.prompts || [], trace: runtime?.trace || [], traceTruncated: runtime?.traceTruncated || false, steps: runtime?.steps || 0, inputsUsed: runtime?.inputIndex || 0 };
    }
  }
  function compareOutput(actual, expected, rule = { kind: "exact" }) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
    if (rule.kind === "numeric") {
      const tolerance = Number.isFinite(rule.absoluteTolerance) && rule.absoluteTolerance >= 0 ? Math.min(rule.absoluteTolerance, 0.01) : 0;
      const numberText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
      return actual.every((v, i) => typeof v === "string" && numberText.test(v.trim()) && Number.isFinite(Number(v)) && Math.abs(Number(v) - Number(expected[i])) <= tolerance);
    }
    if (rule.kind !== "exact") return false;
    return actual.every((v, i) => v === expected[i]);
  }
  function check(source, cases, comparison) {
    if (!Array.isArray(cases) || !cases.length || cases.length > 12) return { version: VERSION, evaluation: "local", error: "Expected 1–12 public test cases.", cases: [], allPassed: false };
    const results = cases.map((item) => {
      const result = execute(source, item.inputs, { trace: false });
      return { id: item.id, label: item.label, passed: result.ok && compareOutput(result.output, item.expected, comparison), output: result.output, expected: item.expected, diagnostic: result.diagnostic || null };
    });
    return { version: VERSION, evaluation: "local", cases: results, allPassed: results.every((item) => item.passed), label: "Functional checks only: passes these tests is not proof of correctness or an OCR mark." };
  }
  return { VERSION, LIMITS, Diagnostic, lex, parse, execute, check, compareOutput };
});
