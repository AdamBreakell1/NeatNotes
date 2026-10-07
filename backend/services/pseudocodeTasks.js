"use strict";
// Original RecallStride drafts. Engineering checks do not confer academic approval.
const VERSION = "2026-10-07.1";
const original = { author: "RecallStride development draft", created: "2026-09-13", origin: "Original task; no exam question reproduced", lastRevised: "2026-10-07", academicReview: "pending", independentReviewer: null };
const tests = (rows) => rows.map(([label, inputs, expected], i) => ({ id: `case-${i + 1}`, label, inputs: inputs.map(String), expected: expected.map(String) }));
function task(data) {
  return { version: VERSION, interpreterVersion: "rs-h446-1.0.0", reviewStatus: "draft", provenance: original,
    topicId: "cs-2-2-1", objectives: ["2.2.1(a)"], comparison: { kind: "exact", whitespace: "exact per output line", ordering: "significant", returns: "Print the required result; return values alone are not task output" },
    difficulty: "Foundation", rubricVersion: "1.0", ...data };
}
const TASKS = [
  task({ id: "minutes-to-seconds", title: "Time for a warm-up", kind: "write", minutes: 6,
    rationale: "One input, one conversion and one output; separates numeric input from text.",
    prompt: "Read a whole number of minutes from 0 to 120. Print the equivalent number of seconds as one number, with no label. All supplied inputs are valid integers.",
    planPrompt: "What must happen to the input before you can multiply it? Predict the output for 3 minutes.",
    starter: '// Read minutes, calculate seconds, print the result\n', example: { inputs: ['3'], output: ['180'] },
    cases: tests([['Typical input',[3],[180]],['Zero minutes',[0],[0]],['One minute',[1],[60]],['Different value',[17],[1020]],['Upper bound',[120],[7200]]]),
    hints: ['Input is text. Think about converting it before arithmetic.', 'Multiply the number of minutes by the number of seconds in a minute.', 'Use int(input("Minutes")), multiply by 60, then print the result.'],
    rubric: ['I converted the input to a number before calculating.', 'I can explain why multiplying by 60 works for all permitted inputs.', 'I checked zero and a value different from the example.'],
    misconceptions: ['Concatenating strings', 'Hard-coding 180', 'Dividing by 60'], transferId: "ticket-total",
    solutions: ['minutes=int(input("Minutes"))\nseconds=minutes*60\nprint(seconds)', 'print(60*int(input("Minutes")))'],
    mutations: [{name:'hard-coded example',source:'print(180)'},{name:'wrong conversion',source:'print(int(input("Minutes"))/60)'}]
  }),
  task({ id: "temperature-range", title: "Repair the boundary", kind: "repair", minutes: 8,
    rationale: "Two inclusive boundaries distinguish plausible code from correct selection.",
    prompt: 'Read an integer temperature. Print "inside" for values from 0 through 35 inclusive, otherwise print "outside". Repair the starter so both boundary values work.',
    planPrompt: "Predict the starter's output for 0 and 35. Which comparison needs to change?",
    starter: 'temperature=int(input("Temperature"))\nif temperature>0 AND temperature<35 then\n  print("inside")\nelse\n  print("outside")\nendif', example:{inputs:['12'],output:['inside']},
    cases:tests([['Middle',[12],['inside']],['Lower boundary',[0],['inside']],['Upper boundary',[35],['inside']],['Just below',[-1],['outside']],['Just above',[36],['outside']],['Negative',[-50],['outside']]]),
    hints:['Inclusive means the endpoint belongs to the interval.','Test each comparison separately for 0 and 35.','Use >= and <= together, or reject values below 0 OR above 35.'],
    rubric:['I can explain the two boundary errors in the starter.','My two branches are mutually exclusive and cover every integer.','I tested values just outside the interval.'],
    misconceptions:['Strict instead of inclusive comparisons','OR inside the accepted interval','Only fixing one bound'],transferId:'code-length',
    solutions:['temperature=int(input("Temperature"))\nif temperature>=0 AND temperature<=35 then\nprint("inside")\nelse\nprint("outside")\nendif','t=int(input("Temperature"))\nif t<0 OR t>35 then\nprint("outside")\nelse\nprint("inside")\nendif'],
    mutations:[{name:'both boundaries excluded',source:'t=int(input("Temperature"))\nif t>0 AND t<35 then\nprint("inside")\nelse\nprint("outside")\nendif'},{name:'OR accepts everything',source:'t=int(input("Temperature"))\nif t>=0 OR t<=35 then\nprint("inside")\nelse\nprint("outside")\nendif'}]
  }),
  task({id:'running-total',title:'Build a running total',kind:'write',minutes:10,rationale:'Requires a correct initial value, inclusive endpoint and update.',
    prompt:'Read an integer n from 0 to 20. Print the total of the whole numbers from 1 through n inclusive. For n=0 print 0. Try an accumulation loop; a formula is also functionally valid, but explain both methods in self-review.',
    planPrompt:'Trace the total after each addition when n is 4.',starter:'n=int(input("Upper bound"))\n// Add your algorithm here\n',example:{inputs:['4'],output:['10']},
    cases:tests([['Example',[4],[10]],['Empty range',[0],[0]],['Single value',[1],[1]],['Two values',[2],[3]],['Unseen value',[9],[45]],['Upper bound',[20],[210]]]),
    hints:['Start the total at the identity value for addition.','For each number from 1 to n, add it to the running total.','Use total=0 before the loop, total=total+i inside, then print after next i.'],
    rubric:['I can trace how my accumulator changes.','I can justify the empty-range result.','I can compare an iterative solution with n*(n+1)/2; tests do not prove which method I used.'],
    misconceptions:['Starting at 1','Missing last term','Printing each partial total','Missing loop update'],transferId:'countdown-trace',
    solutions:['n=int(input("Upper bound"))\ntotal=0\nfor i=1 to n\ntotal=total+i\nnext i\nprint(total)','n=int(input("Upper bound"))\ns=0\ni=1\nwhile i<=n\ns=s+i\ni=i+1\nendwhile\nprint(s)','n=int(input("Upper bound"))\nprint(n*(n+1)/2)'],
    mutations:[{name:'misses endpoint',source:'n=int(input("n"))\ns=0\nfor i=1 to n-1\ns=s+i\nnext i\nprint(s)'},{name:'wrong initial value',source:'n=int(input("n"))\ns=1\nfor i=1 to n\ns=s+i\nnext i\nprint(s)'},{name:'nontermination',source:'n=int(input("n"))\ni=1\nwhile i<=n\nendwhile'}]
  }),
  task({id:'code-length',title:'Keep asking until it fits',kind:'write',minutes:10,rationale:'Combines string length with post-condition validation and input exhaustion.',
    prompt:'Read candidate codes until one contains exactly four characters. Print the first four-character code and stop reading. Any four characters are allowed: this is length validation, not a numeric PIN check. Every test queue contains a valid code.',
    planPrompt:'Predict how many inputs are read from ["a", "12345", "AB12", "later"].',starter:'// Keep reading until the code has length 4\n',example:{inputs:['a','AB12'],output:['AB12']},
    cases:tests([['Retry once',['a','AB12'],['AB12']],['First is valid',['xy!2'],['xy!2']],['Too long',['12345','done'],['done']],['Empty then valid',['','x','abcd'],['abcd']],['Stop at first valid',['1234','5678'],['1234']]]),
    hints:['The condition should check the length, not convert the code to a number.','A do/until loop reads at least once.','Read code=input("Code") inside do, and finish with until code.length==4.'],
    rubric:['I accept any four-character string, including punctuation.','I can explain why the loop terminates for these fixtures.','I understand that no valid code means input exhaustion, not an OCR mark of zero.'],
    misconceptions:['Checking >=4','Reading only once','Converting codes to numbers'],transferId:'temperature-range',
    solutions:['do\ncode=input("Code")\nuntil code.length==4\nprint(code)','code=input("Code")\nwhile code.length!=4\ncode=input("Code")\nendwhile\nprint(code)'],
    mutations:[{name:'accepts too long',source:'do\ncode=input("Code")\nuntil code.length>=4\nprint(code)'},{name:'does not retry',source:'print(input("Code"))'}]
  }),
  task({id:'count-letter',title:'Modify a character counter',kind:'modify',minutes:12,rationale:'Uses zero-based positions and an empty-string boundary.',
    prompt:'The starter counts lowercase a. Modify it to count lowercase e in one input string (0–40 lowercase ASCII letters). Print just the count. The empty string must produce 0.',
    planPrompt:'Predict the starter result for "recall" and the required result for "reference".',starter:'word=input("Word")\ncount=0\nfor i=0 to word.length-1\n  if word.subString(i,1)=="a" then\n    count=count+1\n  endif\nnext i\nprint(count)',example:{inputs:['reference'],output:['4']},
    cases:tests([['Example',['reference'],[4]],['Empty',[''],[0]],['No e',['abc'],[0]],['Single e',['e'],[1]],['Every character',['eeee'],[4]],['Last character',['abcde'],[1]]]),
    hints:['One literal determines the character being counted.','subString(i,1) gives the single character at position i.','Change the comparison literal, and keep positions from 0 to length-1.'],
    rubric:['I can explain why the last index is length-1.','I trace count only when the selected character matches.','I have considered the empty string without reading outside it.'],
    misconceptions:['Index starts at 1','Length is the final index','Missing the last character'],transferId:'first-match',
    solutions:['word=input("Word")\ncount=0\nfor i=0 to word.length-1\nif word.subString(i,1)=="e" then\ncount=count+1\nendif\nnext i\nprint(count)','word=input("Word")\ni=0\nn=0\nwhile i<word.length\nif word.subString(i,1)=="e" then\nn=n+1\nendif\ni=i+1\nendwhile\nprint(n)'],
    mutations:[{name:'skips first',source:'w=input("Word")\nn=0\nfor i=1 to w.length-1\nif w.subString(i,1)=="e" then\nn=n+1\nendif\nnext i\nprint(n)'},{name:'hard-coded count',source:'print(4)'}]
  }),
  task({id:'first-match',title:'Find the first match',kind:'write',minutes:14,topicId:'cs-2-3-1',objectives:['2.3.1(a)','2.3.1(b)'],difficulty:'Developing',rationale:'Array population, duplicate matches and the not-found sentinel require distinct reasoning.',
    prompt:'Read four integers into an array, then read a target integer. Print the zero-based index of the first matching element, or -1 if no element matches. Duplicates are allowed. Each integer is between -100 and 100.',
    planPrompt:'What should happen if the target appears at both index 0 and index 3?',starter:'array values[4]\nfor i=0 to 3\n  values[i]=int(input("Value"))\nnext i\ntarget=int(input("Target"))\n// Find the first match\n',example:{inputs:['8','3','8','1','8'],output:['0']},
    cases:tests([['Duplicate first',[8,3,8,1,8],[0]],['Final position',[1,2,3,4,4],[3]],['Absent',[1,2,3,4,5],[-1]],['All equal',[2,2,2,2,2],[0]],['Middle match',[-1,9,5,9,9],[1]],['Negative match',[-5,0,2,8,-5],[0]]]),
    hints:['Choose a sentinel that cannot be a valid index.','Only set the answer when a match is found and no earlier match was recorded.','Start position=-1; test values[i]==target AND position==-1 before changing it.'],
    rubric:['I can explain why duplicates do not overwrite the first match.','I initialise a not-found value outside the index range.','I can trace the search and describe its worst-case work.'],
    misconceptions:['Returning last match','Defaulting to zero','Off-by-one array bounds'],transferId:'count-letter',
    solutions:['array a[4]\nfor i=0 to 3\na[i]=int(input("Value"))\nnext i\nt=int(input("Target"))\npos=-1\nfor i=0 to 3\nif a[i]==t AND pos==-1 then\npos=i\nendif\nnext i\nprint(pos)','array a[4]\nfor i=0 to 3\na[i]=int(input("Value"))\nnext i\nt=int(input("Target"))\ni=0\nwhile i<4 AND a[i]!=t\ni=i+1\nendwhile\nif i==4 then\nprint(-1)\nelse\nprint(i)\nendif'],
    mutations:[{name:'last instead of first',source:'array a[4]\nfor i=0 to 3\na[i]=int(input("Value"))\nnext i\nt=int(input("Target"))\np=-1\nfor i=0 to 3\nif a[i]==t then\np=i\nendif\nnext i\nprint(p)'},{name:'hard-coded first index',source:'print(0)'}]
  }),
  task({id:'countdown-trace',title:'Predict, then change the stride',kind:'trace / modify',minutes:10,rationale:'Predicts ordered loop output before changing an update and boundary.',
    prompt:'First predict the starter output for n=6 in the plan box. Then modify the program: for any integer n from 0 to 12, print n, n-2, n-4 and so on while the value is positive. Print nothing for n=0. Each number is on its own line.',
    planPrompt:'Before running: list each starter output for n=6, then each required output.',starter:'n=int(input("Start"))\nwhile n>0\n  print(n)\n  n=n-1\nendwhile',example:{inputs:['6'],output:['6','4','2']},
    cases:tests([['Even',[6],[6,4,2]],['Zero',[0],[]],['One',[1],[1]],['Odd',[5],[5,3,1]],['Upper bound',[12],[12,10,8,6,4,2]]]),
    hints:['Keep output order separate from the final variable value.','The update controls the stride; the condition controls whether zero prints.','Subtract 2 each iteration and continue only while the value is greater than 0.'],
    rubric:['I predicted the starter before seeing a trace.','I can explain why odd and even inputs end differently.','I can account for each printed value and show that the loop terminates.'],
    misconceptions:['Printing zero','Skipping initial output','Removing the update'],transferId:'running-total',
    solutions:['n=int(input("Start"))\nwhile n>0\nprint(n)\nn=n-2\nendwhile','n=int(input("Start"))\nfor i=0 to (n-1) DIV 2\nif n-2*i>0 then\nprint(n-2*i)\nendif\nnext i'],
    mutations:[{name:'prints zero',source:'n=int(input("Start"))\nwhile n>=0\nprint(n)\nn=n-2\nendwhile'},{name:'step one',source:'n=int(input("Start"))\nwhile n>0\nprint(n)\nn=n-1\nendwhile'}]
  }),
  task({id:'ticket-total',title:'Return the ticket total',kind:'write',minutes:12,objectives:['2.2.1(a)','2.2.1(c)','2.2.1(d)'],difficulty:'Developing',rationale:'Separates parameters, local computation, return value and printed output.',
    prompt:'Read an integer ticket count from 0 to 10 and a unit price from 0 to 25 (up to two decimal places). Print their product. Practise writing a function total(count, price) and calling it. The checks assess output; reviewing whether you used and understood a function is your separate checklist.',
    planPrompt:'Which values are parameters, and what should the function return for 3 tickets at 2.50?',starter:'// Define a function, read the two inputs, then print the result\n',example:{inputs:['3','2.50'],output:['7.5']},comparison:{kind:'numeric',absoluteTolerance:0.000001,whitespace:'surrounding whitespace accepted for one numeric line',ordering:'significant',returns:'Print result; method reviewed manually'},
    cases:tests([['Example',[3,'2.50'],[7.5]],['No tickets',[0,12],[0]],['Free ticket',[4,0],[0]],['Fractional price',[7,'1.25'],[8.75]],['Upper bounds',[10,25],[250]],['Small price',[3,'0.01'],[0.03]]]),
    hints:['A function returns a value that another expression can use.','The main program reads inputs, then passes two numbers to the function.','Use return count*price inside function total(count, price); print(total(...)) in the main program.'],
    rubric:['I can identify the parameters and distinguish them from arguments.','My function computes a value without reading main-program variables.','I know the output tests alone cannot tell whether I understand functions.'],
    misconceptions:['Printing inside a procedure used as a value','Using main-scope variables','Integer-casting the price'],transferId:'minutes-to-seconds',
    solutions:['function total(count,price)\nreturn count*price\nendfunction\nn=int(input("Tickets"))\np=float(input("Price"))\nprint(total(n,p))','n=int(input("Tickets"))\np=float(input("Price"))\nprint(n*p)'],
    mutations:[{name:'price truncated',source:'n=int(input("Tickets"))\np=int(input("Price"))\nprint(n*p)'},{name:'adds inputs',source:'n=int(input("Tickets"))\np=float(input("Price"))\nprint(n+p)'}]
  })
];
module.exports = { TASKS, VERSION };
