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
  code('global x=3','UNSUPPORTED_CONSTRUCT'); assert.deepEqual(output('array a[2,2]\na[1,1]=9\nprint(a[1,1])'),['9']);
  code('x=1\nif x=1 then\nendif','EXPECTED_TOKEN'); code('print("unfinished)','UNCLOSED_STRING');
  const r=E.execute('x=2\n print(y)'); assert.equal(r.diagnostic.line,2); assert.equal(r.diagnostic.column,8); assert.match(r.diagnostic.hint,/Assign/);
  code('print(“hello”)','CHARACTER'); code('switch x:\nendswitch','UNDEFINED_VARIABLE');
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
  const result=E.execute('while true\nendwhile',[],{limits:{instructions:999999}}); assert.ok(result.steps<=1000005);
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

test('worksheet language supports CASE, positive/negative STEP, break and continue',()=>{
 assert.deepEqual(output('switch true:\ncase 2<3: print("first")\ncase true: print("second")\nendswitch'),['first']);
 assert.deepEqual(output('switch 7:\ncase 1:\nprint("one")\ndefault:\nprint("other")\nendswitch'),['other']);
 assert.deepEqual(output('for i=5 to 1 step -2\nprint(i)\nnext i'),['5','3','1']);
 assert.deepEqual(output('for i=0 to 5\nif i==1 then\ncontinue\nendif\nif i==3 then\nbreak\nendif\nprint(i)\nnext i\nprint("end")'),['0','2','end']);
 assert.deepEqual(output('n=0\nwhile true\nn=n+1\nif n==3 then\nbreak\nendif\nendwhile\nprint(n)'),['3']);
 code('for i=0 to 3 step 0\nnext i','STEP_ZERO');code('break','LOOP_CONTEXT');
});
test('nested arrays, literals, string indexes and worksheet operations remain bounded',()=>{
 assert.deepEqual(output('array a[2,3,4]\na[1,2,3]=7\nprint(a[1][2][3])\nprint(a[1].length)'),['7','3']);
 assert.deepEqual(output('a=[["one","two"],["three","four"]]\nprint(a[1,0])\nword="Computer"\nprint(word[0])\nprint(word.upper)\nprint(word.lower)\nprint(word.left(2))\nprint(word.right(2))\nprint("a,b".split(",")[1])\nprint(ASC("A"))\nprint(CHR(65))'),['three','C','COMPUTER','computer','Co','er','b','65','A']);
 assert.deepEqual(output('print(format(2,2))\nprint(round(2.99*0.1,2))\nprint(floor(sqrt(48)))'),['2.00','0.3','6']);
 assert.deepEqual(output('a=[[1,2],[3,4]]\nb=a\nb[0,0]=9\nprint(a[0,0])\nprint(b[0,0])'),['1','9']);
 assert.deepEqual(output('array a[1]\na[0]=a\nprint(a.length)\nprint(a[0].length)'),['1','1']);
 code('array a[100,100]','ARRAY_LIMIT');code('print("ab"[2])','ARRAY_BOUNDS');code('word="hi"\nword[0]="b"','STRING_ASSIGN');
 code('print("ab".constructor)','MEMBER');code('print(CHR(-1))','CHARACTER_RANGE');code('print(random(4,1))','RANDOM_RANGE');
});
test('virtual files are isolated, strictly named, mode-aware and have storage budgets',()=>{
 const source='f=openRead("input")\nnewFile("output")\nw=open("output")\nwhile NOT f.endOfFile()\nw.writeLine(f.readLine().upper)\nendwhile\nf.close()\nw.close()\nr=openRead("output")\nprint(r.readLine())\nprint(r.readLine())\nprint(r.endOfFile())';
 const r=E.execute(source,[],{files:{input:'one\ntwo\n'}});assert.equal(r.ok,true,JSON.stringify(r.diagnostic));assert.deepEqual(r.output,['ONE','TWO','true']);assert.equal(r.files.output,'ONE\nTWO\n');
 const fresh=E.execute('print(existsFile("output"))');assert.deepEqual(fresh.output,['false']);
 code('f=openRead("missing")','FILE_MISSING');code('f=openRead("x")\nf.readLine()','FILE_EOF',[],{files:{x:''}});
 code('f=openRead("x")\nf.writeLine("y")','FILE_MODE',[],{files:{x:'a'}});
 code('f=open("x")\nf.close()\nf.readLine()','FILE_CLOSED',[],{files:{x:'a'}});
 code('open("../../.env")','FILE_NAME');code('open("https://example.test")','FILE_NAME');
 code('newFile("a")\nnewFile("b")','FILE_LIMIT',[],{limits:{files:1}});
 code('f=openWrite("x")\nf.writeLine("abcd")','FILE_LIMIT',[],{limits:{fileChars:4}});
 const cleared=E.execute('f=openWrite("x")\nf.writeLine("new")',[],{files:{x:'old\n'}});assert.equal(cleared.files.x,'new\n');
 assert.equal(E.check('f=openWrite("x")\nf.writeLine("a")',[{id:'x',inputs:[],expected:[],expectedFiles:{x:'b\n'}}],{kind:'exact'}).allPassed,false);
});
test('interactive replay preserves random choices, prompts, partial output and files',()=>{
 const source='n=random(1,99)\nprint(n)\na=input("First")\nprint(a)\nb=input("Second")\nprint(b)';
 const first=E.execute(source,[],{seed:37});assert.equal(first.awaitingInput,true);assert.equal(first.inputsUsed,0);assert.equal(first.prompts.at(-1),'First');
 const second=E.execute(source,['hello'],{seed:37});assert.equal(second.awaitingInput,true);assert.equal(second.prompts.at(-1),'Second');assert.equal(second.output[0],first.output[0]);
 const final=E.execute(source,['hello','world'],{seed:37});assert.equal(final.ok,true);assert.deepEqual(final.output,[first.output[0],'hello','world']);assert.deepEqual(final.events.map(e=>e.kind),['output','input','output','input','output']);
 const waiting=E.execute('newFile("x")\nf=open("x")\nf.writeLine("kept")\ninput("Continue")');assert.equal(waiting.files.x,'kept\n');
});
test('timed output produces bounded playback events without blocking execution',()=>{
 const r=E.execute('print("a")\nwait(1)\nprint("b")\nsleep(0.5)\nprint("c")');assert.equal(r.ok,true);assert.deepEqual(r.events.map(e=>e.atMs),[0,1000,1500]);assert.equal(r.delay,1500);
 code('wait(-1)','WAIT_LIMIT');code('wait(31)','WAIT_LIMIT');
 const c=[{id:'timing',inputs:[],expected:['a','b'],expectedTimings:[0,1000]}];assert.equal(E.check('print("a")\nprint("b")',c).allPassed,false);assert.equal(E.check('print("a")\nwait(1)\nprint("b")',c).allPassed,true);
});
