/* Native editing adapter and local practice controller. No source is sent to the server. */
(function () {
 'use strict';
 const panel=document.querySelector('#coding-practice-section');
 const VERSION='rs-h446-1.0.0';
 let storage;try{storage=window.localStorage;}catch{storage={length:0,getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');},removeItem:()=>{},key:()=>null};}
 const drafts=window.CodingDrafts.createStore(storage);
 let owner=null,context=null,tasks=[],active=null,draft=null,worker=null,watchdog=null,job=0,loadId=0,visible=false,history=[],historyIndex=0,revision=0,resultRevision=-1,latestResult=null,trace=[],retiredSource=null,loading=false,sessionId=null;
 const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const $=(id)=>panel.querySelector('#'+id);
 async function request(path,options={}) {
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json().catch(()=>({})); if(!response.ok){const error=new Error(data.error||'The request did not complete. Retry when connected.');error.status=response.status;throw error;}return data;
 }
 function event(name){if(!owner||context?.analytics!==true)return;const eventId=crypto.randomUUID();request('/api/pilot/events',{method:'POST',body:JSON.stringify({id:eventId,name,sessionId,taskId:active?.id||null,mode:draft?.mode||'learn'})}).catch(()=>{});}
 function message(text){if($('coding-status'))$('coding-status').textContent=text;}
 function saved(){if(!owner||!active||!draft)return false;const ok=drafts.save(owner,active.id,draft);if($('coding-save'))$('coding-save').textContent=ok?'Draft saved on this device · not synced':'Browser storage unavailable or full. Keep this page open and export your draft.';return ok;}
 function stop(text='Stopped. Your code is preserved. Run again to start with a fresh input queue.'){
  job++;if(worker)worker.terminate();worker=null;clearTimeout(watchdog);watchdog=null;
  if($('coding-stop'))$('coding-stop').disabled=true;
  if($('coding-run'))controls();if(text)message(text);
 }
 function controls(){if(!draft||!$('coding-run'))return;const independent=draft.mode==='independent'&&draft.assistance.checks===0;
  $('coding-run').disabled=Boolean(worker)||independent||retiredSource!==null;
  $('coding-check').disabled=Boolean(worker)||retiredSource!==null;
  $('coding-stop').disabled=!worker;
  $('coding-hint').disabled=Boolean(worker)||independent||draft.assistance.hints>=active.hints.length;
  $('coding-solution').disabled=Boolean(worker)||independent;
  $('coding-example').disabled=Boolean(worker)||independent;
  $('coding-source').readOnly=Boolean(worker);$('coding-plan').readOnly=draft.mode==='independent'&&draft.assistance.checks>0;$('coding-input').readOnly=Boolean(worker);
  $('coding-mode-note').textContent=draft.mode==='independent'?'Independent attempt: Run, hints and the solution stay closed until your first check. Afterwards, feedback use is recorded. This browser cannot certify unaided work.':'Learn / Run: use inputs, traces and progressive hints to improve your program.';
  $('coding-assistance').textContent=`This draft: ${draft.assistance.runs} runs · ${draft.assistance.hints} hints · ${draft.assistance.checks} checks · solution ${draft.assistance.solution?'seen':'not seen'}`;
  $('coding-check').textContent=independent?'Submit first attempt':'Check public tests';
  $('coding-finish').disabled=!latestResult||resultRevision!==revision;
 }
 function highlight(){const source=$('coding-source');if(!source)return;const value=source.value;
  // Decorative, non-executing tokenizer: language validation occurs in the worker.
  const pattern=/(\/\/[^\n]*|"[^"\n]*"|'[^'\n]*'|\b(?:if|then|elseif|else|endif|while|endwhile|do|until|for|to|next|array|function|endfunction|procedure|endprocedure|return|true|false|AND|OR|NOT|DIV|MOD)\b|\b\d+(?:\.\d+)?\b)/gi;
  let html='',at=0;for(const match of value.matchAll(pattern)){html+=esc(value.slice(at,match.index));const token=match[0],kind=token.startsWith('//')?'comment':/^["']/.test(token)?'string':/^\d/.test(token)?'number':'keyword';html+=`<span class="coding-${kind}">${esc(token)}</span>`;at=match.index+token.length;}html+=esc(value.slice(at));
  $('coding-highlight').innerHTML=html+'\n';$('coding-lines').textContent=Array.from({length:value.split('\n').length},(_,i)=>i+1).join('\n');scrollSync();
 }
 function scrollSync(){const source=$('coding-source');if(!source)return;$('coding-highlight').scrollTop=source.scrollTop;$('coding-highlight').scrollLeft=source.scrollLeft;$('coding-lines').scrollTop=source.scrollTop;}
 function invalidate(){revision++;latestResult=null;trace=[];resultRevision=-1;$('coding-results').replaceChildren();$('coding-trace').hidden=true;$('coding-diagnostics').replaceChildren();$('coding-inline-error').hidden=true;$('coding-lines').classList.remove('coding-diag-gutter');$('coding-source').removeAttribute('aria-invalid');message('Code changed. Run or check this version for fresh feedback.');controls();}
 function edit(value,start,end,remember=true){if(!draft||value.length>16384)return;const source=$('coding-source');source.value=value;source.setSelectionRange(start??value.length,end??start??value.length);draft.source=value;if(remember){history=history.slice(0,historyIndex+1);history.push(value);if(history.length>100)history.shift();historyIndex=history.length-1;}invalidate();highlight();saved();}
 function undo(direction){const next=historyIndex+direction;if(next<0||next>=history.length)return;historyIndex=next;edit(history[next],undefined,undefined,false);$('coding-source').focus();}
 function indent(out=false){const e=$('coding-source'),start=e.value.lastIndexOf('\n',e.selectionStart-1)+1,end=e.value.indexOf('\n',e.selectionEnd),stop=end<0?e.value.length:end,selected=e.value.slice(start,stop),replacement=selected.split('\n').map(line=>out?line.replace(/^( {1,2}|\t)/,''):'  '+line).join('\n');edit(e.value.slice(0,start)+replacement+e.value.slice(stop),start,start+replacement.length);e.focus();}
 function sourcePosition(line,column){const e=$('coding-source'),lines=e.value.split('\n');const safeLine=Math.max(1,Math.min(lines.length,line));let offset=lines.slice(0,safeLine-1).reduce((n,v)=>n+v.length+1,0)+Math.max(0,column-1);e.focus();e.setSelectionRange(offset,offset+1);e.scrollTop=Math.max(0,(safeLine-3)*24);scrollSync();$('coding-location').textContent=`Source line ${safeLine}, column ${column}`;}
 function showDiagnostic(d){$('coding-inline-error').hidden=false;$('coding-inline-error').textContent=`Line ${d.line}, column ${d.column}: ${d.message}`;$('coding-lines').classList.add('coding-diag-gutter');$('coding-diagnostics').innerHTML=`<li><button type="button" data-coding-line="${Number(d.line)||1}" data-coding-column="${Number(d.column)||1}">${esc(d.category)} · line ${Number(d.line)||1}, column ${Number(d.column)||1}: ${esc(d.message)}</button><p>${esc(d.hint)}</p></li>`;$('coding-source').setAttribute('aria-invalid','true');message(`${d.category} diagnostic at line ${d.line}: ${d.message} ${d.hint}`);}
 async function validateCurrent(myOwner,myTask,myLoad){const data=await request(`/api/coding/tasks/${encodeURIComponent(myTask.id)}`);if(owner!==myOwner||active?.id!==myTask.id||loadId!==myLoad)return false;
  if(data.task.version!==myTask.version||data.task.interpreterVersion!==VERSION){retiredSource=draft.source;message('Task or interpreter changed. Export this draft, then reload the task. Its old code has been preserved.');controls();return false;}return true;}
 async function execute(action){
  if(!active||worker||retiredSource!==null)return;const myOwner=owner,myTask=active,myLoad=loadId;
  stop(null);const id=String(job);message('Checking current task access…');
  try{if(!await validateCurrent(myOwner,myTask,myLoad)||String(job)!==id)return;}catch(error){if(owner!==myOwner||myLoad!==loadId)return;message(`${error.message} Code is still saved locally; retry or export it.`);if([401,402,404].includes(error.status))retiredSource=draft.source;controls();return;}
  const source=$('coding-source').value;
  if(source.length>16384){message('Shorten the source to 16,384 characters before running.');return;}
  const inputs=draft.inputs===''?[]:draft.inputs.split('\n').map(line=>line==='""'?'':line);
  if(inputs.length>100||inputs.some(v=>v.length>1024)||draft.inputs.length>8192){message('Input limit: 100 lines, 1,024 characters per line and 8,192 total.');return;}
  const firstCheck=draft.assistance.checks===0,assistance={...draft.assistance};
  if(action==='run')draft.assistance.runs=Math.min(10000,draft.assistance.runs+1);else draft.assistance.checks=Math.min(10000,draft.assistance.checks+1);
  saved();$('coding-diagnostics').replaceChildren();$('coding-inline-error').hidden=true;$('coding-lines').classList.remove('coding-diag-gutter');$('coding-source').removeAttribute('aria-invalid');$('coding-output').textContent='';$('coding-results').replaceChildren();$('coding-trace').hidden=true;latestResult=null;
  try{worker=new Worker('/pseudocode-worker.js?v='+VERSION);}catch{message('This browser could not start the worker. Your source is saved; export it or retry in a browser with Web Workers.');controls();return;}
  controls();message(action==='run'?'Running with the fixture queue…':'Checking normal, boundary and adversarial cases locally…');
  const runRevision=revision;
  watchdog=setTimeout(()=>{if(String(job)===id){stop('Time limit reached. The worker was terminated; check your loops and run again.');}},action==='run'?2000:12000);
  worker.onerror=()=>{if(String(job)===id)stop('Worker failed safely. Your code is preserved; retry to create a new worker.');};
  worker.onmessage=async(messageEvent)=>{
   if(String(job)!==id||messageEvent.data.id!==id||owner!==myOwner||myLoad!==loadId)return;
   const result=messageEvent.data.result;stop(null);resultRevision=runRevision;
   if(action==='run'){
    $('coding-output').textContent=result.output.length?result.output.join('\n'):'(No output)';
    $('coding-input-log').textContent=result.prompts.length?`Input prompts: ${result.prompts.join(' → ')}`:'No input requested.';
    trace=result.trace||[];if(trace.length){$('coding-trace').hidden=false;$('coding-trace-select').innerHTML=trace.map((t,i)=>`<option value="${i}">Event ${i+1} · source line ${t.line}</option>`).join('');showTrace();$('coding-trace-note').textContent=result.traceTruncated?'Trace capped at 120 events. Values show at most 12 variables, 8 array cells and 80 characters.':'After-statement trace. Values show at most 12 variables, 8 array cells and 80 characters.';}
    if(result.diagnostic)showDiagnostic(result.diagnostic);else message(`Run finished: ${result.output.length} output lines; ${result.steps} work units. Check the public tests next.`);
    event('coding_run');
   }else{
    latestResult=result;
    $('coding-results').innerHTML=`<h4>Functional tests · local practice</h4><p>${result.allPassed?'Passes these tests. This does not prove correctness.':'Some tests did not pass. Use the case details to improve your program.'}</p><p>${esc(active.comparison.whitespace)}; output order matters. ${active.comparison.kind==='numeric'?`Absolute tolerance: ${active.comparison.absoluteTolerance}.`:''}</p>`+result.cases.map(c=>`<details><summary>${c.passed?'Pass':'Needs attention'} · ${esc(c.label)}</summary><p>Input: ${esc(JSON.stringify(active.cases.find(x=>x.id===c.id)?.inputs))}</p><p>Expected output</p><pre>${esc(c.expected.join('\n')||'(No output)')}</pre><p>Your output</p><pre>${esc(c.output.join('\n')||'(No output)')}</pre>${c.diagnostic?`<button type="button" data-coding-line="${c.diagnostic.line}" data-coding-column="${c.diagnostic.column}">Line ${c.diagnostic.line}: ${esc(c.diagnostic.message)}</button><p>${esc(c.diagnostic.hint)}</p>`:''}</details>`).join('');
    message(result.allPassed?'Passes these tests. Review your method separately below; no numerical mark is awarded.':'Functional checks found a difference. Open a case to inspect the inputs, expected output and diagnostic.');
    const attempt={id:crypto.randomUUID(),taskId:myTask.id,taskVersion:myTask.version,interpreterVersion:VERSION,mode:draft.mode,firstCheck,assistance,outcomes:result.cases.map(c=>({id:c.id,outcome:c.passed?'passed':c.diagnostic?'diagnostic':'failed'}))};
    draft.lastAttempt=attempt.id;draft.revisit={taskId:myTask.transferId,dueAt:new Date(Date.now()+3*86400000).toISOString()};draft.completed=false;saved();renderRevisit();
    if(!drafts.queue(myOwner,attempt))$('coding-sync').textContent='Attempt retry queue is full or unavailable. Export coding data before closing; this result has not synced.';else await sync(myOwner);
    event('coding_check');
   }
   if(owner===myOwner&&active?.id===myTask.id)controls();
  };
  worker.postMessage({id,action,source,inputs,cases:myTask.cases,comparison:myTask.comparison});
 }
 function showTrace(){const item=trace[Number($('coding-trace-select').value)||0];if(!item)return;$('coding-trace-values').textContent=JSON.stringify({line:item.line,scope:item.stack.length?item.stack.join(' → '):'main',variables:item.variables},null,2);}
 async function sync(myOwner=owner){if(!myOwner)return;for(const attempt of drafts.pending(myOwner)){
  if(owner!==myOwner)return;try{await request(`/api/coding/tasks/${encodeURIComponent(attempt.taskId)}/attempts`,{method:'POST',body:JSON.stringify(attempt)});if(owner!==myOwner)return;drafts.acknowledge(myOwner,attempt.id);}
  catch(error){if(owner===myOwner&&$('coding-sync'))$('coding-sync').textContent=`Local attempt waiting to sync: ${error.message} Retry or export the saved metadata.`;return;}}
  if(owner===myOwner&&$('coding-sync'))$('coding-sync').textContent='Local outcome metadata synced. Source, input and prediction stay on this device.';
 }
 function renderRevisit(){const r=draft?.revisit;if(!$('coding-revisit'))return;$('coding-revisit').textContent=r?`Suggested fresh task: ${tasks.find(t=>t.id===r.taskId)?.title||r.taskId}, from ${new Date(r.dueAt).toLocaleDateString()}. This is a three-day practice reminder, not verified mastery.`:'After checking, a fresh task will be suggested for a delayed revisit.';}
 async function exportData(){if(!owner)return;const local=drafts.export(owner);if(active&&draft)local.drafts[active.id]=draft;let synced=[];let notice='';try{synced=(await request('/api/coding/attempts')).attempts;}catch{notice='Network unavailable: server metadata was not included.';}
  const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),owner,local,attempts:synced,notice},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='recallstride-coding-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message(notice||'Coding data exported, including this device’s drafts.');}
 async function choose(id){stop(null);loadId++;const task=tasks.find(t=>t.id===id);if(!task)return;active=task;retiredSource=null;revision=0;resultRevision=-1;latestResult=null;trace=[];
  const stored=drafts.draft(owner,id),restored=window.CodingDrafts.restore(stored,task);
  drafts.remember(owner,id);if($('coding-task-select'))$('coding-task-select').value=id;
  draft=restored.draft||{taskVersion:task.version,interpreterVersion:VERSION,source:task.starter,inputs:task.example.inputs.join('\n'),plan:'',mode:'learn',assistance:{runs:0,hints:0,checks:0,solution:false},rubric:[],completed:false};
  if(restored.stale){retiredSource=restored.recovery;draft.source=retiredSource;draft.taskVersion=stored.taskVersion;draft.interpreterVersion=stored.interpreterVersion;}
  history=[draft.source];historyIndex=0;renderTask();if(restored.stale)message('This draft uses an older content version. Export it before resetting to the new starter. Checks are disabled until reset.');else saved();event('coding_task_opened');
 }
 const reference=`<p><strong>${VERSION}</strong> · H446-style executable subset. OCR may credit other intelligible pseudocode; parser errors are not exam marks.</p>
 <dl><dt>Values and output</dt><dd><code>x=int(input("Number"))</code>, <code>print(x)</code>. Input returns text. One statement per line; <code>//</code> starts a comment.</dd>
 <dt>Selection</dt><dd><code>if x==3 then</code>, <code>elseif</code>, <code>else</code>, <code>endif</code>. Assign with =; compare with ==. Boolean operators: AND, OR, NOT.</dd>
 <dt>Loops</dt><dd><code>for i=0 to 3</code> … <code>next i</code> includes 0 and 3. <code>while condition</code> … <code>endwhile</code>; <code>do</code> … <code>until condition</code>.</dd>
 <dt>Strings and arrays</dt><dd><code>word.length</code>, <code>word.subString(0,1)</code>. <code>array a[4]</code> has indices 0–3. Assign each cell before reading it.</dd>
 <dt>Functions</dt><dd><code>function double(n)</code>, <code>return n*2</code>, <code>endfunction</code>. Arguments copied by value; variables inside a routine are local. Procedures use <code>procedure</code> / <code>endprocedure</code>.</dd>
 <dt>Conventions and limits</dt><dd>Names are case-sensitive; keywords are not. Precedence: calls, ^, unary +/−, * / DIV MOD, +/−, comparisons, NOT, AND, OR. ^ groups right; AND/OR short-circuit. Finite binary64 numbers up to ±(2^53−1); DIV truncates toward zero and MOD keeps the dividend’s sign. No implicit type changes. Strings use UTF-16 positions and strict bounds. 16,384 source characters, 64 nesting levels, 50,000 work units, 750ms per case, 4,096 array cells, 8,192 characters per string, 200 output lines. Recursion, globals, byRef, 2D arrays, files, classes and switch are unsupported.</dd></dl>
 <p><a href="https://www.ocr.org.uk/images/170844-specification-accredited-a-level-gce-computer-science-h446.pdf#page=38" target="_blank" rel="noopener">OCR H446 specification 3.0, §5d (opens a new tab)</a></p>`;
 function renderTask(){
  $('coding-workspace').innerHTML=`<header class="coding-task-head"><div><p class="eyebrow">${esc(active.kind)} · ${esc(active.difficulty)} · about ${active.minutes} min</p><h3>${esc(active.title)}</h3></div><span class="coding-badge">${active.reviewStatus==='draft'?'Draft · academic review pending':'Reviewed task'}</span></header>
  <p class="coding-task-prompt">${esc(active.prompt)}</p><p class="coding-objectives">H446 ${esc(active.objectives.join(', '))} · task ${esc(active.version)}</p>
  <div class="coding-grid"><div class="coding-main">
  <label for="coding-plan">1. Predict or plan before you run</label><p id="coding-plan-prompt">${esc(active.planPrompt)}</p><textarea id="coding-plan" rows="2" maxlength="2000" aria-describedby="coding-plan-prompt">${esc(draft.plan)}</textarea>
  <div class="coding-mode-row"><label for="coding-mode">Attempt mode</label><select id="coding-mode"><option value="learn">Learn / Run</option><option value="independent">Independent attempt</option></select></div><p id="coding-mode-note"></p>
  <div class="coding-editor-heading"><label for="coding-source">2. Write your pseudocode</label><label class="coding-inline-label"><input id="coding-plain" type="checkbox"> Plain text</label></div>
  <div class="coding-edit-tools"><button type="button" data-code-action="undo">Undo</button><button type="button" data-code-action="redo">Redo</button><button type="button" data-code-action="indent">Indent</button><button type="button" data-code-action="outdent">Outdent</button><button type="button" data-code-action="reset">Reset starter</button></div>
  <div class="coding-editor"><pre id="coding-lines" aria-hidden="true"></pre><div class="coding-code-layers"><pre id="coding-highlight" aria-hidden="true"></pre><textarea id="coding-source" maxlength="16384" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-describedby="coding-editor-help coding-location coding-diagnostics">${esc(draft.source)}</textarea></div></div>
  <p id="coding-inline-error" class="coding-inline-diagnostic" hidden></p><p id="coding-editor-help">Tab moves to the next control. Use Indent/Outdent for two spaces. Ctrl/⌘+Enter runs; Ctrl/⌘+Z undoes.</p><p id="coding-location">Line numbers refer to your source.</p><p id="coding-save"></p>
  <div class="coding-runbar"><button id="coding-run" class="primary-button" type="button" data-code-action="run">Run</button><button id="coding-stop" type="button" data-code-action="stop" disabled>Stop</button><button id="coding-check" type="button" data-code-action="check">Check public tests</button></div>
  <p id="coding-status" role="status" aria-live="polite" aria-atomic="true">Ready. Plan your approach, then write and run.</p><ul id="coding-diagnostics" class="coding-diagnostics" aria-label="Code diagnostics"></ul>
  <section class="coding-output-panel" aria-labelledby="coding-output-title"><h4 id="coding-output-title">Output</h4><pre id="coding-output" tabindex="0">Run your program to see output here.</pre><p id="coding-input-log"></p></section>
  <details id="coding-trace" hidden><summary>Inspect the execution trace</summary><p id="coding-trace-note"></p><label for="coding-trace-select">Trace event</label><select id="coding-trace-select"></select><button type="button" data-code-action="trace-line">Go to source line</button><pre id="coding-trace-values"></pre></details>
  <section id="coding-results" aria-label="Functional test results"></section>
  </div><aside class="coding-side" aria-label="Inputs and guidance">
  <section><h4>Input fixtures</h4><label for="coding-input">One input per line</label><textarea id="coding-input" rows="4" maxlength="8192" spellcheck="false">${esc(draft.inputs)}</textarea><p>An empty box means no inputs. Use <code>""</code> for an empty-string input. Input exhaustion points to the line that needs another value.</p><button type="button" data-code-action="example-input">Use example inputs</button><p>Expected example output</p><pre>${esc(active.example.output.join('\n')||'(No output)')}</pre></section>
  <details id="coding-reference"><summary>Language help · ${VERSION}</summary>${reference}<button id="coding-example" type="button" data-code-action="example">Try a small runnable example</button></details>
  <section><h4>Need a nudge?</h4><p>Reveal one hint at a time: concept, strategy, then a targeted clue.</p><ol id="coding-hints">${active.hints.slice(0,draft.assistance.hints).map(h=>`<li>${esc(h)}</li>`).join('')}</ol><button id="coding-hint" type="button" data-code-action="hint">Reveal next hint</button><button id="coding-solution" type="button" data-code-action="solution">Reveal one worked solution</button><pre id="coding-solution-source" hidden></pre></section>
  <p id="coding-assistance"></p></aside></div>
  <section class="coding-review"><h4>3. Review your method</h4><p>Functional checks and reasoning are separate. No OCR mark, numerical practice score or grade is awarded. Explain each criterion to yourself.</p>${active.rubric.map((r,i)=>`<label><input type="checkbox" data-coding-rubric="${i}" ${draft.rubric[i]?'checked':''}> ${esc(r)}</label>`).join('')}<button id="coding-finish" type="button" data-code-action="finish" disabled>Finish this practice</button><p id="coding-revisit"></p><button type="button" data-code-action="transfer">Open a fresh transfer task</button></section>
  <details class="coding-data"><summary>Save, sync and privacy</summary><p>Source, inputs and predictions stay on this browser for up to 30 days after editing. Local outcome metadata can sync to your account for 30 days. Signing out clears this device’s coding drafts. Export first on a shared computer. These results never grant verified mastery.</p><p id="coding-sync">Checking pending local metadata…</p><button type="button" data-code-action="sync">Retry metadata sync</button><button type="button" data-code-action="export">Export coding data</button><button type="button" data-code-action="clear">Clear coding data</button></details>`;
  $('coding-mode').value=draft.mode;highlight();controls();renderRevisit();sync();
 }
 async function show(options){
  visible=true;context=options;
  const nextOwner=options.owner||null;if(nextOwner!==owner){stop(null);loadId++;owner=nextOwner;active=null;draft=null;tasks=[];sessionId=crypto.randomUUID();}
  if(!owner){panel.innerHTML='<h3>Pseudocode practice</h3><p>Sign in to access coding tasks in your selected Free deck or Pro catalogue. The full feedback loop is included in any accessible reviewed task.</p><button type="button" data-code-action="login">Sign in</button>';return;}
  if(active&&$('coding-source')){
   const myOwner=owner,myTask=active,myLoad=loadId;
   try{await validateCurrent(myOwner,myTask,myLoad);}catch(error){if(owner===myOwner&&myLoad===loadId){message(`${error.message} Your draft is preserved; retry online or export it.`);if([401,402,404].includes(error.status))retiredSource=draft.source;controls();}}
   return;
  }
  if(loading)return;loading=true;const sequence=++loadId,myOwner=owner;
  panel.innerHTML='<h3>Pseudocode practice</h3><p role="status">Loading available tasks…</p>';
  try{const response=await request('/api/coding/tasks');if(sequence!==loadId||owner!==myOwner||!visible)return;tasks=response.tasks;
   panel.innerHTML=`<div class="coding-catalogue"><div><p class="eyebrow">Write · run · understand</p><h3>Pseudocode practice</h3><p>${esc(response.notice)}</p>${response.preview?'<p class="coding-preview-note">Local editorial preview. These eight drafts are not published or independently approved.</p>':''}</div><div><label for="coding-task-select">Choose a task</label><select id="coding-task-select" ${tasks.length?'':'disabled'}>${tasks.map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('')||'<option>No reviewed tasks available</option>'}</select></div></div>${response.locked.length?`<details><summary>Tasks in other decks (${response.locked.length})</summary><p>Free includes the full feedback loop in your one selected deck. Most writing tasks belong to 2.2.1 Programming techniques. Select that deck before claiming your Free choice, or use Pro to access other reviewed decks.</p>${response.locked.map(t=>`<p>${esc(t.title)} · ${esc(t.topicId)}</p>`).join('')}<button type="button" data-code-action="decks">Choose a revision deck</button></details>`:''}<div class="coding-general-actions"><button type="button" data-code-action="reload">Reload task list</button><button type="button" data-code-action="export">Export saved coding data</button></div><div id="coding-workspace"></div>`;
   if(tasks.length){const resume=drafts.resume(owner);await choose(tasks.some(t=>t.id===resume)?resume:tasks[0].id);}
   event('coding_session_started');
  }catch(error){if(sequence===loadId)panel.innerHTML=`<h3>Pseudocode practice</h3><p role="status">${esc(error.message)} Saved drafts are preserved.</p><button type="button" data-code-action="reload">Retry loading tasks</button><button type="button" data-code-action="export">Export saved coding data</button>`;}
  finally{loading=false;}
 }
 panel.addEventListener('input',e=>{
  if(!draft)return;
  if(e.target.id==='coding-source'){draft.source=e.target.value;history=history.slice(0,historyIndex+1);history.push(draft.source);if(history.length>100)history.shift();historyIndex=history.length-1;invalidate();highlight();}
  if(e.target.id==='coding-plan')draft.plan=e.target.value;
  if(e.target.id==='coding-input'){draft.inputs=e.target.value;invalidate();}
  if(e.target.hasAttribute('data-coding-rubric'))draft.rubric[Number(e.target.dataset.codingRubric)]=e.target.checked;
  saved();
 });
 panel.addEventListener('change',e=>{
  if(e.target.id==='coding-task-select')choose(e.target.value);
  if(e.target.id==='coding-plain')panel.querySelector('.coding-editor').classList.toggle('coding-plain',e.target.checked);
  if(e.target.id==='coding-mode'){stop(null);draft.mode=e.target.value;saved();controls();}
  if(e.target.id==='coding-trace-select')showTrace();
 });
 panel.addEventListener('scroll',e=>{if(e.target.id==='coding-source')scrollSync();},true);
 panel.addEventListener('keydown',e=>{
  if(e.target.id!=='coding-source')return;
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();if(!$('coding-run').disabled)execute('run');}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey?1:-1);}
  if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();const target=e.target,start=target.selectionStart,end=target.selectionEnd,line=target.value.slice(0,start).split('\n').at(-1),spaces=line.match(/^\s*/)[0];edit(target.value.slice(0,start)+'\n'+spaces+target.value.slice(end),start+1+spaces.length);}
 });
 panel.addEventListener('click',async e=>{
  const line=e.target.closest('[data-coding-line]');if(line){sourcePosition(Number(line.dataset.codingLine),Number(line.dataset.codingColumn));return;}
  const button=e.target.closest('[data-code-action]');if(!button||button.disabled)return;const action=button.dataset.codeAction;
  if(action==='login')return context?.login?.();if(action==='decks')return context?.decks?.();
  if(action==='reload'){stop(null);active=null;loading=false;return show(context);}
  if(action==='export')return exportData();if(action==='sync')return sync();
  if(!draft)return;
  if(action==='run'||action==='check')return execute(action);if(action==='stop')return stop();
  if(action==='undo'||action==='redo')return undo(action==='undo'?-1:1);if(action==='indent'||action==='outdent')return indent(action==='outdent');
  if(action==='reset'||action==='example'){
   if(!window.confirm(action==='reset'?'Replace your code with the current starter? Export first if you need a copy.':'Replace your code with a small language example? Undo restores your previous code.'))return;
   stop(null);retiredSource=null;draft.taskVersion=active.version;draft.interpreterVersion=VERSION;
   if(action==='example'){draft.assistance.hints=Math.max(1,draft.assistance.hints);draft.inputs='3';$('coding-input').value='3';}
   edit(action==='reset'?active.starter:'n=int(input("Number"))\nfor i=1 to n\n  print(i)\nnext i');controls();return;
  }
  if(action==='example-input'){draft.inputs=active.example.inputs.join('\n');$('coding-input').value=draft.inputs;invalidate();saved();return;}
  if(action==='hint'){draft.assistance.hints++;$('coding-hints').innerHTML=active.hints.slice(0,draft.assistance.hints).map(h=>`<li>${esc(h)}</li>`).join('');saved();controls();event('coding_hint');return;}
  if(action==='solution'){
   if(!window.confirm('Reveal a worked solution? Its use will be recorded as assistance, and your source will stay unchanged.'))return;
   const myOwner=owner,myTask=active,myLoad=loadId;
   try{const data=await request(`/api/coding/tasks/${encodeURIComponent(active.id)}/solution`);if(owner!==myOwner||loadId!==myLoad)return;if(data.version!==myTask.version){message('The solution version changed. Reload the task before revealing it.');return;}draft.assistance.solution=true;$('coding-solution-source').hidden=false;$('coding-solution-source').textContent=data.solution;saved();controls();event('coding_solution');}catch(error){message(error.message);}return;
  }
  if(action==='trace-line'){const item=trace[Number($('coding-trace-select').value)||0];if(item)sourcePosition(item.line,item.column);return;}
  if(action==='transfer'){const id=draft.revisit?.taskId||active.transferId;if(!tasks.some(t=>t.id===id)){message('The transfer task is in another deck or awaiting review. Choose an available fresh task from the list.');return;}return choose(id);}
  if(action==='finish'){
   if(!latestResult||resultRevision!==revision)return;if(draft.completed){message('This practice is already complete. Come back for a fresh transfer task.');return;}
   if(active.rubric.some((_,i)=>!draft.rubric[i])){message('Review each method criterion before finishing. These are self-review checks, not marks.');return;}
   draft.completed=true;saved();event('coding_session_completed');message('Practice reviewed. Come back for the suggested fresh task after three days; repeated runs do not count as mastery.');return;
  }
  if(action==='clear'){
   if(!window.confirm('Delete this account’s coding metadata and this browser’s coding drafts? Export first if you want to keep them.'))return;
   try{await request('/api/coding/attempts',{method:'DELETE'});drafts.clear(owner);active=null;draft=null;stop(null);await show(context);}catch(error){message(`Deletion did not complete: ${error.message} Your data is preserved.`);}
  }
 });
 window.addEventListener('online',()=>{if(visible)sync();});
 window.addEventListener('storage',e=>{if(e.key==='recallstride-coding-session-change'){stop(null);owner=null;active=null;draft=null;tasks=[];loadId++;panel.innerHTML='<p role="status">The account session changed in another tab. Reload before resuming coding practice.</p>';}});
 window.CodingPractice={show,hide(){visible=false;stop(null);},sessionChanged(previousOwner,clear=false){stop(null);loadId++;loading=false;if(clear)drafts.clear(previousOwner);owner=null;active=null;draft=null;tasks=[];panel.replaceChildren();try{storage.setItem('recallstride-coding-session-change',crypto.randomUUID());}catch{}},exportLocal(id){return drafts.export(id);},clearLocal(id){drafts.clear(id);}};
})();
