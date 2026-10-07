"use strict";
const fs = require('node:fs');
const {TASKS}=require('../backend/services/pseudocodeTasks');
const engine=require('../pseudocode-engine');
const {digest}=require('../backend/services/pseudocodePractice');
function benchmark() {
 const tasks=TASKS.map(task=>({id:task.id,version:task.version,sha256:digest(task),caseCount:task.cases.length,
  alternatives:task.solutions.map((source,i)=>({index:i+1,passed:engine.check(source,task.cases,task.comparison).allPassed})),
  mutations:task.mutations.map(m=>({name:m.name,detected:!engine.check(m.source,task.cases,task.comparison).allPassed}))}));
 const correct=tasks.flatMap(t=>t.alternatives),faults=tasks.flatMap(t=>t.mutations);
 return {date:'2026-10-07',interpreterVersion:engine.VERSION,provenance:'Development-authored corpus and expectations; internally checked, NOT independently academically reviewed.',
  tasks:tasks,summary:{tasks:tasks.length,cases:tasks.reduce((n,t)=>n+t.caseCount,0),correctAlternatives:correct.length,falseNegatives:correct.filter(t=>!t.passed).length,seededFaults:faults.length,falsePositives:faults.filter(t=>!t.detected).length},
  limitations:['Finite public cases can be hard-coded by a determined learner.','These rates describe this small authored corpus only, not accuracy on arbitrary student programs.','No numerical score, OCR examiner mark or grade prediction.','Function/loop method and reasoning require self-review and independent human content review.']};
}
if(require.main===module){const result=benchmark();fs.mkdirSync('docs/pseudocode',{recursive:true});fs.writeFileSync('docs/pseudocode/benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary,null,2));if(result.summary.falseNegatives||result.summary.falsePositives)process.exitCode=1;}
module.exports={benchmark};
