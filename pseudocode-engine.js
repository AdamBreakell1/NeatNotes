/* RecallStride rs-h446-2.0.0. Original bounded interpreter; no host-code execution. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecallPseudocode = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "rs-h446-2.0.0";
  const LIMITS = Object.freeze({ source: 16384, tokens: 6000, depth: 64, instructions: 1000000, wallMs: 1500,
    calls: 32, variables: 256, arrayCells: 4096, string: 8192, stringAllocation: 262144,
    outputLines: 1000, outputChars: 65536, inputs: 100, inputItem: 1024, inputChars: 8192, trace: 120, files: 20, fileChars: 65536, waitMs: 30000 });
  const KEYWORDS = new Set("if then elseif else endif for to next while endwhile do until array function endfunction procedure endprocedure return true false and or not div mod byval switch case default endswitch step break continue".split(" "));
  const UNSUPPORTED = new Set("global byref class endclass private public new inherits super repeat import require eval".split(" "));
  const BUILTINS = new Set("input print int float real str asc chr random floor ceil round sqrt abs min max format open openread openwrite newfile existsfile delfile deletefile wait sleep".split(" "));
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
    constructor(tokens, limits) { this.tokens = tokens; this.i = 0; this.depth = 0; this.limits = limits; this.routine = null; this.blockDepth = 0; this.loopDepth = 0; }
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
    loopBlock(ends) { this.loopDepth++; try { return this.block(ends); } finally { this.loopDepth--; } }
    statement() {
      const at = this.peek();
      if (this.take("if")) {
        const branches = []; let condition = this.expression(); this.need("then"); this.lineEnd();
        branches.push({ condition, body: this.block(["elseif", "else", "endif"]) });
        while (this.take("elseif")) { condition = this.expression(); this.need("then"); this.lineEnd(); branches.push({ condition, body: this.block(["elseif", "else", "endif"]) }); }
        let otherwise = []; if (this.take("else")) { this.lineEnd(); otherwise = this.block(["endif"]); }
        this.need("endif"); return { kind: "if", branches, otherwise, at };
      }
      if (this.take("switch")) {
        const value = this.expression(); this.need(":"); this.lineEnd(); const cases = []; let otherwise = [];
        while (this.take("newline")) {}
        while (this.take("case")) { const match = this.expression(); this.need(":"); if (this.at("newline")) this.lineEnd(); cases.push({ match, body: this.block(["case", "default", "endswitch"]) }); }
        if (this.take("default")) { this.need(":"); if (this.at("newline")) this.lineEnd(); otherwise = this.block(["endswitch"]); }
        this.need("endswitch"); return { kind: "switch", value, cases, otherwise, at };
      }
      if (this.at("break") || this.at("continue")) { const kind = this.tokens[this.i++].type; if (!this.loopDepth) fail("syntax", "LOOP_CONTEXT", `${kind} belongs inside a loop.`, at); return { kind, at }; }
      if (this.take("while")) { const condition = this.expression(); this.lineEnd(); const body = this.loopBlock(["endwhile"]); this.need("endwhile"); return { kind: "while", condition, body, at }; }
      if (this.take("do")) { this.lineEnd(); const body = this.loopBlock(["until"]); this.need("until"); const condition = this.expression(); return { kind: "do", condition, body, at }; }
      if (this.take("for")) {
        const name = this.name().value; this.need("="); const start = this.expression(); this.need("to"); const end = this.expression(); const step = this.take("step") ? this.expression() : { kind: "literal", value: 1, at }; this.lineEnd();
        const body = this.loopBlock(["next"]); this.need("next"); const close = this.name(); if (close.value !== name) fail("syntax", "FOR_NAME", `Close this loop with next ${name}.`, close);
        return { kind: "for", name, start, end, step, body, at };
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
      if (this.take("array")) {
        const name = this.name().value; this.need("["); const sizes = [];
        if (!this.at("]")) do { sizes.push(this.expression()); } while (this.take(",")); this.need("]");
        if (this.take("=")) return { kind: "assign", left: { kind: "variable", name, at }, value: this.expression(), at };
        if (!sizes.length || sizes.length > 3) fail("syntax", "ARRAY_DIMENSIONS", "Declare one to three dimensions or initialise with an array literal.", at);
        return { kind: "array", name, sizes, at };
      }
      const left = this.expression();
      if (this.take("=")) { if (!["variable", "index"].includes(left.kind)) fail("syntax", "ASSIGN_TARGET", "Assign to a variable or an array cell.", at); return { kind: "assign", left, value: this.expression(), at }; }
      if (!["call", "member"].includes(left.kind)) fail("syntax", "STATEMENT", "Use an assignment or a routine call on this line.", at);
      return { kind: "callStatement", call: left, at };
    }
    expression(min = 0) {
      return this.nested(() => {
        const at = this.peek(); let left;
        if (this.take("not")) left = { kind: "unary", op: "not", value: this.expression(3), at };
        else if (this.at("+") || this.at("-")) { this.i++; left = { kind: "unary", op: at.type, value: this.expression(7), at }; }
        else if (this.take("(")) { left = this.expression(); this.need(")"); }
        else if (this.take("[")) { const values = []; if (!this.at("]")) do { values.push(this.expression()); } while (this.take(",")); this.need("]"); left = { kind: "arrayLiteral", values, at }; }
        else if (["number", "string", "true", "false"].includes(at.type)) { this.i++; left = { kind: "literal", value: at.type === "true" ? true : at.type === "false" ? false : at.value, at }; }
        else { const name = this.need("identifier"); left = { kind: "variable", name: name.value, at: name }; }
        while (true) {
          if (this.take("(")) {
            if (left.kind !== "variable") fail("unsupported", "CALL_TARGET", "Only named routines can be called.", at);
            const args = []; if (!this.at(")")) do { args.push(this.expression()); } while (this.take(",")); this.need(")");
            left = { kind: "call", name: left.name, args, at }; continue;
          }
          if (this.take("[")) { do { const index = this.expression(); left = { kind: "index", object: left, index, at }; } while (this.take(",")); this.need("]"); continue; }
          if (this.take(".")) {
            const member = this.need("identifier"), name = member.value.toLowerCase();
            if (!["length", "substring", "upper", "lower", "left", "right", "split", "readline", "writeline", "endoffile", "close"].includes(name)) fail("unsupported", "MEMBER", "This member is not part of the language. Host properties are never exposed.", member);
            const args = []; let invoked = false;
            if (this.take("(")) { invoked = true; if (!this.at(")")) do { args.push(this.expression()); } while (this.take(",")); this.need(")"); }
            if (!["length", "upper", "lower"].includes(name) && !invoked) fail("syntax", "MEMBER_CALL", `${name} needs parentheses.`, member);
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
    constructor(limits, inputs, trace, options) {
      this.limits = limits; this.inputs = inputs; this.inputIndex = 0; this.output = []; this.prompts = []; this.outputChars = 0;
      this.trace = []; this.traceEnabled = trace; this.traceTruncated = false; this.steps = 0; this.allocatedCells = 0; this.allocatedStrings = 0; this.variables = 0;
      this.routines = new Map(); this.stack = []; this.counterLocks = new WeakMap(); this.started = Date.now(); this.lastAt = {}; this.files = new Map(); this.events = []; this.delay = 0; this.seed = (options.seed >>> 0) || 123456789;
      const files = options.files || {};
      if (!files || typeof files !== "object" || Array.isArray(files) || Object.keys(files).length > limits.files) fail("limit", "FILE_LIMIT", "Use at most 20 virtual text files.");
      let bytes = 0;
      for (const [name, text] of Object.entries(files)) { this.fileName(name, {}); if (typeof text !== "string") fail("runtime", "FILE_TEXT", "Virtual files contain text only."); bytes += text.length; this.files.set(name, text); }
      if (bytes > limits.fileChars) fail("limit", "FILE_LIMIT", "Virtual files exceed 65,536 characters.");
    }
    tick(at, cost = 1) { this.lastAt = at || this.lastAt; this.steps += cost; if (this.steps > this.limits.instructions) fail("limit", "WORK_LIMIT", "Execution stopped at the work limit; a loop may not be progressing.", this.lastAt, "Check conditions, bounds and updates, then run again."); if (Date.now() - this.started > this.limits.wallMs) fail("limit", "TIME_LIMIT", "Execution reached its time limit.", this.lastAt, "Check for a loop that cannot finish or reduce the input size."); }
    number(value, at, integer = false) { if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER || (integer && !Number.isSafeInteger(value))) fail("runtime", "NUMBER_TYPE", integer ? "Expected a safe integer." : "Expected a finite number within ±(2^53−1).", at); return value; }
    boolean(value, at) { if (typeof value !== "boolean") fail("runtime", "BOOLEAN_TYPE", "This condition needs true or false.", at, "Compare values explicitly, for example count > 0."); return value; }
    string(value, at, allocated = false) { if (typeof value !== "string") fail("runtime", "STRING_TYPE", "This operation needs a string.", at); if (value.length > this.limits.string) fail("limit", "STRING_LIMIT", "String exceeds the per-value limit.", at); if (allocated) { this.allocatedStrings += value.length; this.tick(at, 1 + value.length); if (this.allocatedStrings > this.limits.stringAllocation) fail("limit", "ALLOCATION_LIMIT", "String allocation budget exhausted.", at); } return value; }
    scalarText(value, at) { if (!["number", "string", "boolean"].includes(typeof value)) fail("runtime", "SCALAR_REQUIRED", "Print or convert one scalar value, not an array or procedure.", at); return String(value); }
    array(size, at) { this.number(size, at, true); if (size < 0 || size > this.limits.arrayCells - this.allocatedCells) fail("limit", "ARRAY_LIMIT", "Array allocation exceeds the cumulative cell limit.", at); this.allocatedCells += size; this.tick(at, size + 1); return { kind: "array", cells: Array(size).fill(undefined) }; }
    copy(value, at) { if (isArray(value)) { const copy = this.array(value.cells.length, at); copy.cells = value.cells.map((cell) => this.copy(cell, at)); return copy; } return typeof value === "string" ? this.string(value, at, true) : value; }
    get(env, name, at) { if (!env.has(name)) fail("runtime", "UNDEFINED_VARIABLE", `${name} has no value in this scope.`, at, "Assign it before reading it, or pass it as a parameter."); return env.get(name); }
    set(env, name, value, at, counter = false) {
      if (!counter && this.counterLocks.get(env)?.has(name)) fail("runtime", "FOR_COUNTER", "Do not change a for-loop counter inside its body in this dialect.", at, "Use a while loop when you need to control the update yourself.");
      if (env.has(name) && valueType(env.get(name)) !== valueType(value)) fail("runtime", "TYPE_CHANGE", `${name} already has a different value type.`, at);
      if (!env.has(name) && ++this.variables > this.limits.variables) fail("limit", "VARIABLE_LIMIT", "Variable declaration budget exhausted.", at);
      env.set(name, value);
    }
    slot(node, env) {
      const object = this.eval(node.object, env), index = this.number(this.eval(node.index, env), node.at, true);
      if (!isArray(object) && typeof object !== "string") fail("runtime", "ARRAY_TYPE", "Index an array or a string.", node.at);
      const size = isArray(object) ? object.cells.length : object.length;
      if (index < 0 || index >= size) fail("runtime", "ARRAY_BOUNDS", `Index ${index} is outside 0 to ${size - 1}.`, node.at);
      return { object, index };
    }
    fileName(value, at) { this.string(value, at); if (!/^[A-Za-z0-9_-][A-Za-z0-9_. -]{0,63}$/.test(value) || value.includes("..")) fail("runtime", "FILE_NAME", "Use a simple virtual filename, without folders or URLs.", at); return value; }
    fileWrite(name, text, at) {
      this.tick(at, text.length + 1);
      let total = text.length; for (const [key, content] of this.files) if (key !== name) total += content.length;
      if ((!this.files.has(name) && this.files.size >= this.limits.files) || total > this.limits.fileChars) fail("limit", "FILE_LIMIT", "Virtual file storage limit reached.", at);
      this.files.set(name, text);
    }
    member(node, env) {
      const object = this.eval(node.object, env), args = node.args.map(arg => this.eval(arg, env)), name = node.name;
      const arity = (n) => { if (args.length !== n) fail("runtime", "ARGUMENT_COUNT", `${name} expects ${n} arguments.`, node.at); };
      if (object && object.kind === "file") {
        if (!["readline", "writeline", "endoffile", "close"].includes(name)) fail("runtime", "FILE_MEMBER", "Use a file reading/writing method.", node.at);
        arity(name === "writeline" ? 1 : 0);
        if (object.closed || !this.files.has(object.name)) fail("runtime", "FILE_CLOSED", "This virtual file is closed or deleted.", node.at);
        if (name === "close") { object.closed = true; return undefined; }
        const text = this.files.get(object.name), lines = text === "" ? [] : text.replace(/\n$/, "").split("\n");
        if (name === "writeline") {
          if (object.mode === "read") fail("runtime", "FILE_MODE", "Open this file for writing before writing a line.", node.at);
          this.fileWrite(object.name, text + (text && !text.endsWith("\n") ? "\n" : "") + this.scalarText(args[0], node.at) + "\n", node.at); return undefined;
        }
        if (object.mode === "write") fail("runtime", "FILE_MODE", "Close and reopen this file for reading.", node.at);
        if (name === "endoffile") return object.index >= lines.length;
        if (object.index >= lines.length) fail("runtime", "FILE_EOF", "No more lines. Test endOfFile() before reading.", node.at);
        return this.string(lines[object.index++].replace(/\r$/, ""), node.at, true);
      }
      if (name === "length") { arity(0); if (isArray(object)) return object.cells.length; return this.string(object, node.at).length; }
      const text = this.string(object, node.at);
      if (name === "upper" || name === "lower") { arity(0); return this.string(name === "upper" ? text.toUpperCase() : text.toLowerCase(), node.at, true); }
      if (name === "split") { arity(1); const parts = text.split(this.string(args[0], node.at)); const array = this.array(parts.length, node.at); array.cells = parts.map(part => this.string(part, node.at, true)); return array; }
      if (["substring", "left", "right"].includes(name)) {
        arity(name === "substring" ? 2 : 1);
        const count = this.number(args[name === "substring" ? 1 : 0], node.at, true), start = name === "substring" ? this.number(args[0], node.at, true) : name === "left" ? 0 : text.length - count;
        if (start < 0 || count < 0 || start + count > text.length) fail("runtime", "STRING_BOUNDS", "String position/count is outside this string.", node.at, "Positions start at zero; subString uses a character count.");
        return this.string(text.slice(start, start + count), node.at, true);
      }
      fail("runtime", "MEMBER_TYPE", "This method needs a virtual file.", node.at);
    }
    eval(node, env, needsValue = true) {
      this.tick(node.at);
      if (node.kind === "literal") return typeof node.value === "string" ? this.string(node.value, node.at, true) : node.value;
      if (node.kind === "arrayLiteral") { const array = this.array(node.values.length, node.at); array.cells = node.values.map(value => this.eval(value, env)); return array; }
      if (node.kind === "variable") return this.get(env, node.name, node.at);
      if (node.kind === "index") { const { object, index } = this.slot(node, env); if (typeof object === "string") return this.string(object[index], node.at, true); if (object.cells[index] === undefined) fail("runtime", "UNINITIALISED_CELL", `Array cell ${index} has not been assigned.`, node.at); return object.cells[index]; }
      if (node.kind === "call") return this.call(node, env, needsValue);
      if (node.kind === "member") { const value = this.member(node, env); if (needsValue && value === undefined) fail("runtime", "PROCEDURE_VALUE", "This method produces no return value.", node.at); return value; }
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
        const counts = { random: 2, min: 2, max: 2, format: 2, round: [1, 2], open: [1, 2] };
        const count = counts[name] || 1;
        if (!(Array.isArray(count) ? count.includes(node.args.length) : node.args.length === count)) fail("runtime", "ARGUMENT_COUNT", `${node.name} has the wrong number of arguments.`, node.at);
        if (["print", "newfile", "delfile", "deletefile", "wait", "sleep"].includes(name) && needsValue) fail("runtime", "PROCEDURE_VALUE", `${node.name} produces no return value.`, node.at);
        const args = node.args.map(arg => this.eval(arg, env)), value = args[0];
        if (name === "input") {
          const prompt = this.string(value, node.at); this.prompts.push(prompt);
          if (this.inputIndex >= this.inputs.length) fail("input", "INPUT_EXHAUSTED", `Input ${this.inputIndex + 1} is needed. ${prompt.slice(0, 160)}`, node.at, "Enter a value in the terminal to continue, or press Stop.");
          this.events.push({ kind: "input", prompt, value: this.inputs[this.inputIndex], atMs: this.delay });
          return this.string(this.inputs[this.inputIndex++], node.at, true);
        }
        if (name === "print") {
          const text = this.scalarText(value, node.at); this.tick(node.at, text.length + 1);
          if (this.output.length >= this.limits.outputLines || this.outputChars + text.length + 1 > this.limits.outputChars) fail("limit", "OUTPUT_LIMIT", "Output limit reached; further output was stopped.", node.at, "Check for repeated printing inside a loop.");
          this.output.push(text); this.events.push({ kind: "output", text, atMs: this.delay }); this.outputChars += text.length + 1; return undefined;
        }
        if (name === "wait" || name === "sleep") { const seconds = this.number(value, node.at); if (seconds < 0 || this.delay + seconds * 1000 > this.limits.waitMs) fail("limit", "WAIT_LIMIT", "Total wait time must be between 0 and 30 seconds.", node.at); this.delay += seconds * 1000; return undefined; }
        if (["open", "openread", "openwrite", "newfile", "existsfile", "delfile", "deletefile"].includes(name)) {
          const filename = this.fileName(value, node.at);
          if (name === "existsfile") return this.files.has(filename);
          if (name === "delfile" || name === "deletefile") { this.files.delete(filename); return undefined; }
          if (name === "newfile") { if (this.files.has(filename)) fail("runtime", "FILE_EXISTS", "This file already exists. Delete it first or open it.", node.at); this.fileWrite(filename, "", node.at); return undefined; }
          const mode = name === "openwrite" ? "write" : name === "openread" ? "read" : args.length === 2 ? this.string(args[1], node.at).toLowerCase() : "both";
          if (!["read", "write", "both", "r", "w", "a"].includes(mode)) fail("runtime", "FILE_MODE", "Use read, write or both as the open mode.", node.at);
          if (["write", "w"].includes(mode)) this.fileWrite(filename, "", node.at);
          if (!this.files.has(filename)) fail("runtime", "FILE_MISSING", `Add ${filename} in the Files panel or create it with newFile().`, node.at);
          return { kind: "file", name: filename, index: 0, mode: mode === "r" ? "read" : mode === "w" ? "write" : mode === "a" ? "both" : mode, closed: false };
        }
        if (name === "str") return this.string(this.scalarText(value, node.at), node.at, true);
        if (name === "asc") { const text = this.string(value, node.at); if (text.length !== 1) fail("runtime", "CHARACTER_COUNT", "ASC needs exactly one character.", node.at); return text.charCodeAt(0); }
        if (name === "chr") { const n = this.number(value, node.at, true); if (n < 0 || n > 65535) fail("runtime", "CHARACTER_RANGE", "CHR needs a code between 0 and 65535.", node.at); return this.string(String.fromCharCode(n), node.at, true); }
        if (["int", "float", "real"].includes(name)) {
          let number = value;
          if (typeof value === "string") { this.tick(node.at, value.length + 1); if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) fail("runtime", "INVALID_NUMBER_INPUT", "The complete input must be a decimal number.", node.at); number = Number(value.trim()); }
          this.number(number, node.at); return name === "int" ? Math.trunc(number) : number;
        }
        const n = this.number(value, node.at);
        if (name === "random") {
          this.number(n, node.at, true); const max = this.number(args[1], node.at, true); if (max < n || max - n > Number.MAX_SAFE_INTEGER) fail("runtime", "RANDOM_RANGE", "random needs an inclusive minimum and maximum integer.", node.at);
          this.seed ^= this.seed << 13; this.seed ^= this.seed >>> 17; this.seed ^= this.seed << 5;
          return n + Math.floor((this.seed >>> 0) / 4294967296 * (max - n + 1));
        }
        if (name === "min" || name === "max") return Math[name](n, this.number(args[1], node.at));
        if (name === "round" || name === "format") {
          const decimals = args.length > 1 ? this.number(args[1], node.at, true) : 0;
          if (decimals < 0 || decimals > 10) fail("runtime", "DECIMAL_RANGE", "Use 0 to 10 decimal places.", node.at);
          return name === "format" ? this.string(n.toFixed(decimals), node.at, true) : this.number(Math.round((n + Number.EPSILON) * 10 ** decimals) / 10 ** decimals, node.at);
        }
        return this.number(Math[name](n), node.at);
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
      const summarize = (v) => isArray(v) ? { length: v.cells.length, cells: v.cells.slice(0, 8).map(summarize) } : v?.kind === "file" ? { file: v.name, line: v.index, closed: v.closed } : v === undefined ? "unassigned" : typeof v === "string" ? v.slice(0, 80) + (v.length > 80 ? "…" : "") : v;
      this.trace.push({ line: node.at.line, column: node.at.column, stack: this.stack.slice(), variables: [...env.entries()].slice(0, 12).map(([name, v]) => ({ name, value: isArray(v) ? { cells: v.cells.slice(0, 8).map(summarize), length: v.cells.length } : summarize(v) })) });
    }
    block(body, env) {
      for (const node of body) {
        this.tick(node.at); let result;
        if (node.kind === "assign") {
          const slot = node.left.kind === "index" ? this.slot(node.left, env) : null;
          const evaluated = this.eval(node.value, env); const value = isArray(evaluated) ? this.copy(evaluated, node.at) : evaluated; if (value === undefined) fail("runtime", "ASSIGN_VALUE", "Assign a value, not a procedure.", node.at);
          if (slot) { if (!isArray(slot.object)) fail("runtime", "STRING_ASSIGN", "Strings cannot be changed through an index; build a new string.", node.at); const prior = slot.object.cells[slot.index]; if (prior !== undefined && typeof prior !== typeof value) fail("runtime", "TYPE_CHANGE", "This array cell already has a different type.", node.at); slot.object.cells[slot.index] = value; }
          else this.set(env, node.left.name, value, node.at);
        } else if (node.kind === "array") { if (env.has(node.name)) fail("runtime", "ARRAY_REDECLARE", "This name is already declared.", node.at); this.set(env, node.name, this.dimensionArray(node.sizes.map(size => this.number(this.eval(size, env), node.at, true)), node.at), node.at); }
        else if (node.kind === "callStatement") this.eval(node.call, env, false);
        else if (node.kind === "break" || node.kind === "continue") result = { [node.kind]: true };
        else if (node.kind === "switch") { const value = this.eval(node.value, env); let body = node.otherwise; for (const branch of node.cases) if (value === this.eval(branch.match, env)) { body = branch.body; break; } result = this.block(body, env); }
        else if (node.kind === "return") { const value = this.eval(node.value, env); if (isArray(value)) fail("unsupported", "ARRAY_RETURN", "Array return values are not supported.", node.at); result = { returned: true, value }; }
        else if (node.kind === "if") { let body = node.otherwise; for (const branch of node.branches) if (this.boolean(this.eval(branch.condition, env), node.at)) { body = branch.body; break; } result = this.block(body, env); }
        else if (node.kind === "while") { while (true) { this.tick(node.at); if (!this.boolean(this.eval(node.condition, env), node.at)) break; result = this.block(node.body, env); if (result?.break) { result = null; break; } if (result?.returned) break; result = null; } }
        else if (node.kind === "do") { do { this.tick(node.at); result = this.block(node.body, env); if (result?.break) { result = null; break; } if (result?.returned) break; result = null; } while (!this.boolean(this.eval(node.condition, env), node.at)); }
        else if (node.kind === "for") {
          const start = this.number(this.eval(node.start, env), node.at, true), end = this.number(this.eval(node.end, env), node.at, true), step = this.number(this.eval(node.step, env), node.at, true);
          if (step === 0) fail("runtime", "STEP_ZERO", "A for-loop step cannot be zero.", node.at);
          if (!this.counterLocks.has(env)) this.counterLocks.set(env, new Set()); const locks = this.counterLocks.get(env);
          if (locks.has(node.name)) fail("runtime", "FOR_COUNTER", "Nested loops must use distinct counters.", node.at);
          this.set(env, node.name, start, node.at); locks.add(node.name);
          try { for (let i = start; step > 0 ? i <= end : i >= end; i = this.number(i + step, node.at, true)) { this.tick(node.at); this.set(env, node.name, i, node.at, true); result = this.block(node.body, env); if (result?.break) { result = null; break; } if (result?.returned || i === end) break; result = null; } } finally { locks.delete(node.name); }
        }
        this.snapshot(node, env); if (result) return result;
      }
      return null;
    }
    dimensionArray(sizes, at) { const array = this.array(sizes[0], at); if (sizes.length > 1) array.cells = array.cells.map(() => this.dimensionArray(sizes.slice(1), at)); return array; }
    run(body) { for (const node of body) if (["function", "procedure"].includes(node.kind)) { if (this.routines.has(node.name)) fail("syntax", "DUPLICATE_ROUTINE", "Routine names must be unique.", node.at); this.routines.set(node.name, node); } const env = new Map(); this.block(body.filter((node) => !["function", "procedure"].includes(node.kind)), env); }
  }
  function execute(source, inputs = [], options = {}) {
    const limits = ceilings(options.limits); let runtime;
    try {
      if (!Array.isArray(inputs) || inputs.length > limits.inputs || inputs.some((item) => typeof item !== "string" || item.length > limits.inputItem) || inputs.reduce((n, item) => n + item.length, 0) > limits.inputChars) fail("limit", "INPUT_LIMIT", "Input queue exceeds its size limit.");
      const body = parse(source, limits); runtime = new Runtime(limits, inputs, options.trace === true, options); runtime.run(body);
      return { ok: true, files: Object.fromEntries(runtime.files), events: runtime.events, delay: runtime.delay, version: VERSION, output: runtime.output, prompts: runtime.prompts, trace: runtime.trace, traceTruncated: runtime.traceTruncated, steps: runtime.steps, inputsUsed: runtime.inputIndex };
    } catch (error) {
      const diagnostic = error instanceof Diagnostic ? error.toJSON() : new Diagnostic("limit", "EXECUTION_FAILURE", "Execution stopped safely. Reduce nesting and check the supported syntax.", runtime?.lastAt).toJSON();
      return { ok: false, files: runtime ? Object.fromEntries(runtime.files) : {}, events: runtime?.events || [], delay: runtime?.delay || 0, awaitingInput: diagnostic.code === "INPUT_EXHAUSTED", version: VERSION, diagnostic, output: runtime?.output || [], prompts: runtime?.prompts || [], trace: runtime?.trace || [], traceTruncated: runtime?.traceTruncated || false, steps: runtime?.steps || 0, inputsUsed: runtime?.inputIndex || 0 };
    }
  }
  function compareOutput(actual, expected, rule = { kind: "exact" }) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
    if (rule.kind === "numeric") {
      const tolerance = Number.isFinite(rule.absoluteTolerance) && rule.absoluteTolerance >= 0 ? Math.min(rule.absoluteTolerance, 0.01) : 0;
      const numberText = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
      return actual.every((v, i) => typeof v === "string" && numberText.test(v.trim()) && Number.isFinite(Number(v)) && Math.abs(Number(v) - Number(expected[i])) <= tolerance);
    }
    if (rule.kind === "unordered") return actual.slice().sort().every((v, i) => v === expected.slice().sort()[i]);
    if (rule.kind !== "exact") return false;
    return actual.every((v, i) => v === expected[i]);
  }
  function validateResult(result, rule) {
    if (rule.kind === "random-character") return result.output.length === 2 && rule.word.includes(result.output[0]) && result.output[0].length === 1 && result.output[1] === String(rule.word.length);
    if (rule.kind === "random-file") {
      const lines = (result.files[rule.file] || "").trim().split("\n"); const nums = lines.map(Number);
      if (nums.length < 10 || nums.length > 30 || nums.some(n => !Number.isInteger(n) || n < 1 || n > 99)) return false;
      const prime = n => n >= 2 && !Array.from({ length: Math.max(0, Math.floor(Math.sqrt(n)) - 1) }, (_, i) => i + 2).some(d => n % d === 0);
      const expected = [nums.filter(n => n % 2 === 1).length, nums.filter(n => n % 2 === 0).length, nums.filter(prime).length, nums.filter(n => n < 10).length, nums.filter(n => n >= 10).length, nums.length];
      const prefixes = ["Odd numbers: ", "Even numbers: ", "Prime numbers: ", "One-digit numbers: ", "Two-digit numbers: ", "Total numbers generated: "];
      return compareOutput(result.output, [...expected.slice(0,5).map((n,i)=>prefixes[i]+n), "", prefixes[5]+expected[5]]);
    }
    return false;
  }
  function check(source, cases, comparison, options = {}) {
    if (!Array.isArray(cases) || !cases.length || cases.length > 12) return { version: VERSION, evaluation: "local", error: "Expected 1–12 public test cases.", cases: [], allPassed: false };
    const results = cases.map((item) => {
      const result = execute(source, item.inputs, { ...options, files: item.files || options.files, seed: item.seed || 123456789, trace: false });
      return { id: item.id, label: item.label, passed: result.ok && (item.validator ? validateResult(result, item.validator) : compareOutput(result.output, item.expected, item.comparison || comparison)) && (!item.expectedTimings || JSON.stringify(result.events.filter(e=>e.kind==="output" && e.text!=="").map(e=>e.atMs))===JSON.stringify(item.expectedTimings)) && (!item.expectedFiles || Object.entries(item.expectedFiles).every(([name, text]) => result.files[name] === text)), output: result.output, expected: item.expected || [], files: result.files, expectedFiles: item.expectedFiles || null, diagnostic: result.diagnostic || null };
    });
    return { version: VERSION, evaluation: "local", cases: results, allPassed: results.every((item) => item.passed), label: "Functional checks only: passes these tests is not proof of correctness or an OCR mark." };
  }
  return { VERSION, LIMITS, Diagnostic, lex, parse, execute, check, compareOutput };
});
