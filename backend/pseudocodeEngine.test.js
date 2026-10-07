"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../pseudocode-engine");
const output = (source, inputs = []) => { const r = E.execute(source, inputs, { trace: true }); assert.equal(r.ok, true, JSON.stringify(r.diagnostic)); return r.output; };
const code = (source, expected, inputs = [], options = {}) => { const r = E.execute(source, inputs, options); assert.equal(r.ok, false); assert.equal(r.diagnostic.code, expected, JSON.stringify(r)); assert.ok(r.diagnostic.line > 0 && r.diagnostic.column > 0); };

test("H446-style assignment, casts, queued input, inclusive loops and literal source positions", () => {
  assert.deepEqual(output('n=int(input("Count"))\ntotal=0\nfor i=0 to n\n total=total+i\nnext i\nprint(total)', ['7']), ['28']);
  assert.deepEqual(output('someText="Computer Science"\nprint(someText.length)\nprint(someText.subString(3,3))'), ['16','put']);
  assert.deepEqual(output('x = 17 DIV 5\nprint(x)\nprint(12 MOD 5)\nprint(3^4)\nprint(str(float("3.14")))'), ['3','2','81','3.14']);
  const t = E.lex('// comment\n  x = "<script>"').find(t => t.type === 'identifier'); assert.equal(t.line, 2); assert.equal(t.column, 3);
});
test("precedence, strict Booleans, short circuiting, negative quotient and numeric conventions", () => {
  assert.deepEqual(output('print(-2^2)\nprint(2^3^2)\nprint(NOT 3==4 AND true OR false)\nprint(false AND missing==2)\nprint(true OR missing==3)\nprint(-17 DIV 5)\nprint(-17 MOD 5)\nprint(int(-3.9))'), ['-4','512','true','false','true','-3','-2','-3']);
  code('if 1 then\nendif', 'BOOLEAN_TYPE'); code('print("2"+2)', 'NUMBER_TYPE');
  code('x=1\nx="one"','TYPE_CHANGE'); code('print(1<2<3)','CHAINED_COMPARISON');
  code('print(1/0)','DIVIDE_ZERO'); code('print(2^100)','NUMBER_TYPE'); code('print(9007199254740992)','NUMBER_RANGE');
  code('print(int("12cats"))','INVALID_NUMBER_INPUT'); code('print(float(""))','INVALID_NUMBER_INPUT');
});
test("selection, while/do loops and equivalent control flow", () => {
  assert.deepEqual(output('n=3\ntotal=0\nwhile n>0\ntotal=total+n\nn=n-1\nendwhile\nif total==0 then\nprint("zero")\nelseif total==6 then\nprint("six")\nelse\nprint("other")\nendif'),['six']);
  assert.deepEqual(output('do\nn=int(input("1 to 3"))\nuntil n>=1 AND n<=3\nprint(n)', ['0','4','3']), ['3']);
  assert.deepEqual(output('for i=3 to 1\nprint(i)\nnext i\nprint("done")'), ['done']);
  code('for i=0 to 2\ni=i+1\nnext i','FOR_COUNTER'); code('for i=0 to 2\nnext j','FOR_NAME');
});
test("arrays, strings, local routines, explicit/default by-value and scalar return", () => {
  assert.deepEqual(output('function triple(number)\nreturn number*3\nendfunction\nprint(triple(7))\nprocedure greeting(name:byVal)\nprint("hello"+name)\nendprocedure\ngreeting("Hamish")'),['21','helloHamish']);
  assert.deepEqual(output('procedure alter(a)\na[0]=8\nprint(a[0])\nendprocedure\narray xs[2]\nxs[0]=2\nalter(xs)\nprint(xs[0])'), ['8','2']);
  assert.deepEqual(output('array empty[0]\nprint("".subString(0,0))'),['']);
  code('array a[2]\nprint(a[2])','ARRAY_BOUNDS'); code('array a[2]\nprint(a[0])','UNINITIALISED_CELL');
  code('print("ab".subString(1,2))','STRING_BOUNDS'); code('x=4\nfunction f()\nreturn x\nendfunction\nprint(f())','UNDEFINED_VARIABLE');
  code('function f()\nx=1\nendfunction\nprint(f())','MISSING_RETURN'); code('procedure f()\nendprocedure\nx=f()','PROCEDURE_VALUE');
});
test("unsupported syntax is distinct from syntax/runtime errors and has actionable positions", () => {
  code('global x=3','UNSUPPORTED_CONSTRUCT'); code('array a[2,2]','ARRAY_DIMENSIONS');
  code('x=1\nif x=1 then\nendif','EXPECTED_TOKEN'); code('print("unfinished)','UNCLOSED_STRING');
  const r=E.execute('x=2\n print(y)'); assert.equal(r.diagnostic.line,2); assert.equal(r.diagnostic.column,8); assert.match(r.diagnostic.hint,/Assign/);
  code('print(“hello”)','CHARACTER'); code('switch x:\nendswitch','UNSUPPORTED_CONSTRUCT');
});
test("empty infinite loops, runaway allocation/output, source and parse attacks stop safely", () => {
  code('while true\nendwhile','WORK_LIMIT'); code('do\nuntil false','WORK_LIMIT');
  code('for i=0 to 9007199254740991\nnext i','WORK_LIMIT');
  code('while true\nprint("x")\nendwhile','OUTPUT_LIMIT');
  code('array x[4097]','ARRAY_LIMIT'); code('array a[3000]\narray b[2000]','ARRAY_LIMIT');
  code('print("'+ 'x'.repeat(8193) +'")','STRING_LIMIT');
  code(' '.repeat(16385),'SOURCE_LIMIT'); code('print('+ '('.repeat(90)+'1'+')'.repeat(90)+')','PARSE_DEPTH');
  code('print('+Array(100).fill('1').join('+')+')','AST_DEPTH');
  code('function f()\nreturn f()\nendfunction\nprint(f())','RECURSION');
  code('function a()\nreturn b()\nendfunction\nfunction b()\nreturn a()\nendfunction\nprint(a())','RECURSION');
  const r=E.execute('i=0\nwhile i<200\ni=i+1\nendwhile',[],{trace:true}); assert.equal(r.ok,true); assert.equal(r.trace.length,120); assert.equal(r.traceTruncated,true);
  code('procedure a()\nendprocedure\nprocedure b()\na()\nendprocedure\nb()','CALL_DEPTH',[],{limits:{calls:1}});
  assert.deepEqual(output('print("recovered")'),['recovered']);
});
test("host access and injected markup remain ordinary text or rejected language", () => {
  for (const s of ['fetch("https://invalid.test")','window.alert(1)','process.exit(0)','x=input.constructor("return globalThis")','import("x")','eval("1")','print({})','print(__proto__)']) assert.equal(E.execute(s).ok,false,s);
  assert.deepEqual(output('constructor=3\n__proto__=4\nprint(constructor+__proto__)'),['7']);
  assert.deepEqual(output('print(input("value"))',['<script>alert(1)</script>']),['<script>alert(1)</script>']);
  code('x=input("first")\ny=input("second")','INPUT_EXHAUSTED',['a']);
  code('print(1)','INPUT_LIMIT',Array(101).fill('a')); code('print(1)','INPUT_LIMIT',['a'.repeat(1025)]);
  const result=E.execute('while true\nendwhile',[],{limits:{instructions:999999}}); assert.ok(result.steps<=50005);
});
test("functional comparison declares whitespace, number tolerance and ordering rules", () => {
  assert.equal(E.compareOutput([' yes'],['yes'],{kind:'exact'}),false);
  assert.equal(E.compareOutput(['1','2'],['2','1'],{kind:'exact'}),false);
  assert.equal(E.compareOutput(['1.0001'],['1'],{kind:'numeric',absoluteTolerance:0.001}),true);
  assert.equal(E.compareOutput([''],['0'],{kind:'numeric'}),false); assert.equal(E.compareOutput(['0x10'],['16'],{kind:'numeric'}),false);
  assert.equal(E.check('print(1)',[{id:'a',inputs:[],expected:['1']},{id:'b',inputs:[],expected:['2']}],{kind:'exact'}).allPassed,false);
});
test("wall, variable and copied-allocation budgets are enforced independently", (t) => {
  code('x=1\ny=2','VARIABLE_LIMIT',[],{limits:{variables:1}});
  code('print("abcd")','ALLOCATION_LIMIT',[],{limits:{stringAllocation:3}});
  code('procedure inspect(a)\nendprocedure\narray xs[2]\ninspect(xs)','ARRAY_LIMIT',[],{limits:{arrayCells:2}});
  let clock = 0;
  const mocked = t.mock.method(Date, 'now', () => { clock += 1000; return clock; });
  code('print(1)', 'TIME_LIMIT');
  mocked.mock.restore();
  assert.deepEqual(output('print("fresh run")'), ['fresh run']);
});
