/* Embedded student workspace. Source and virtual files remain on this device. */
(function () {
  'use strict';
  const panel = document.querySelector('#coding-practice-section');
  const VERSION = 'rs-h446-2.0.0';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = id => panel.querySelector('#' + id);
  let storage;
  try { storage = window.localStorage; } catch { storage = {length:0,getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');},removeItem:()=>{},key:()=>null}; }
  const drafts = window.CodingDrafts.createStore(storage);
  let owner = null, context = {}, tasks = [], active = null, draft = null, visible = false;
  let worker = null, watchdog = null, playback = null, session = null, job = 0, loadId = 0, loading = false;
  let history = [], historyIndex = 0, revision = 0, latestResult = null, trace = [], selectedFile = null;
  let sessionId = null, libraryOpen = false;
  let catalogue = null, catalogueRequest = null;
  let loadingId = 0;
  const compactWorkspace = window.matchMedia('(max-width: 760px)');
  const scratch = {id:'scratch',title:'Scratchpad',category:'Your code',kind:'Explore',difficulty:'Open practice',version:'2026-10-07.2',interpreterVersion:VERSION,
    prompt:'Try an idea, practise a language feature or build your own program. Use input() for interactive questions and Files for text data.',
    starter:'// Your own program\nname=input("What is your name?")\nprint("Hello, "+name)\n',files:{},cases:[],example:{inputs:['Ada'],output:['Hello, Ada']},hints:[],rubric:[],transferId:'worksheet-1-1'};
  const localOwner = () => owner || 'guest';
  async function request(path, options = {}) {
    const response = await fetch(path, {credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json',...options.headers}});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || 'Could not connect. Your draft remains saved on this device.');
    return data;
  }
  async function loadCatalogue() {
    if (catalogue) return catalogue;
    if (!catalogueRequest) {
      catalogueRequest = request('/api/coding/tasks').then(response => {
        if (!Array.isArray(response.tasks) || !response.tasks.length) throw new Error('The coding task catalogue could not load. Try again.');
        catalogue = response.tasks;
        return catalogue;
      }).finally(() => { catalogueRequest = null; });
    }
    return catalogueRequest;
  }
  async function searchTasks(query) {
    const term = typeof query === 'string' ? query.trim().toLowerCase().slice(0, 160) : '';
    if (!term) return [];
    const bank = await loadCatalogue();
    const allCoding = ['code', 'coding', 'pseudocode', 'erl'].includes(term);
    return bank.filter(task => allCoding || `${task.title} ${task.category} ${task.worksheet || ''} ${task.prompt}`.toLowerCase().includes(term))
      .slice(0, 8).map(task => ({
        id: task.id,
        title: task.title,
        detail: [task.worksheet, task.category, task.difficulty, task.minutes ? `${task.minutes} min` : ''].filter(Boolean).join(' · '),
      }));
  }
  function validTaskId(id) {
    return typeof id === 'string' && id.length <= 100 && (id === 'scratch' || tasks.some(task => task.id === id));
  }
  function message(text) { if ($('coding-status')) $('coding-status').textContent = text; }
  function event(name) {
    if (!owner || context.analytics !== true) return;
    request('/api/pilot/events', {method:'POST',body:JSON.stringify({id:crypto.randomUUID(),name,sessionId,taskId:active?.id === 'scratch' ? null : active?.id || null,mode:draft?.mode || 'learn'})}).catch(()=>{});
  }
  function save() {
    if (!active || !draft) return;
    const ok = drafts.save(localOwner(), active.id, draft);
    if ($('coding-save')) $('coding-save').textContent = ok ? 'Saved on this device' : 'Storage unavailable — download your project before leaving.';
  }
  function disposeWorker() { if (worker) worker.terminate(); worker = null; clearTimeout(watchdog); watchdog = null; }
  function stop(text = 'Stopped. Your code and files are preserved.') {
    const restoreFocus = Boolean(text && ($('coding-terminal-form')?.contains(document.activeElement) || document.activeElement === $('coding-stop') || (session?.restoreTerminalFocus && document.activeElement === document.body)));
    job++; disposeWorker(); clearTimeout(playback); playback = null; session = null;
    if ($('coding-terminal-form')) $('coding-terminal-form').hidden = true;
    controls(); if (text) message(text);
    if (restoreFocus) $('coding-run')?.focus();
  }
  function controls() {
    if (!draft || !$('coding-run')) return;
    const busy = Boolean(worker || session);
    $('coding-run').disabled = busy; $('coding-stop').disabled = !busy;
    $('coding-check').disabled = busy || !active.cases.length;
    $('coding-source').readOnly = busy;
    if ($('coding-input')) $('coding-input').readOnly = busy;
    if ($('coding-file-text')) $('coding-file-text').readOnly = busy;
    for (const button of panel.querySelectorAll('[data-code-action="new-file"],[data-code-action="delete-file"],[data-code-action="reset-files"],[data-code-action="solution-use"],[data-code-action="reset"],[data-code-action="import"],[data-code-action="undo"],[data-code-action="redo"],[data-code-action="indent"],[data-code-action="outdent"]')) button.disabled = busy;
    if ($('coding-finish')) $('coding-finish').disabled = !latestResult?.allPassed;
    if ($('coding-assistance')) $('coding-assistance').textContent = `${draft.assistance.runs} runs · ${draft.assistance.checks} checks · ${draft.assistance.hints} hints${draft.assistance.solution?' · solution viewed':''}`;
  }
  function highlight() {
    const source = $('coding-source'); if (!source) return;
    const pattern = /(\/\/[^\n]*|"[^"\n]*"|'[^'\n]*'|\b(?:if|then|elseif|else|endif|switch|case|default|endswitch|while|endwhile|do|until|for|to|step|next|break|continue|array|function|endfunction|procedure|endprocedure|return|true|false|AND|OR|NOT|DIV|MOD)\b|\b\d+(?:\.\d+)?\b)/gi;
    let html = '', offset = 0;
    for (const match of source.value.matchAll(pattern)) {
      html += escape(source.value.slice(offset, match.index));
      const text = match[0], kind = text.startsWith('//') ? 'comment' : /^["']/.test(text) ? 'string' : /^\d/.test(text) ? 'number' : 'keyword';
      html += `<span class="coding-${kind}">${escape(text)}</span>`; offset = match.index + text.length;
    }
    $('coding-highlight').innerHTML = html + escape(source.value.slice(offset)) + '\n';
    $('coding-lines').textContent = Array.from({length:source.value.split('\n').length},(_,i)=>i+1).join('\n');
    scrollSync();
  }
  function scrollSync() {
    const source = $('coding-source'); if (!source) return;
    $('coding-highlight').scrollTop = source.scrollTop; $('coding-highlight').scrollLeft = source.scrollLeft;
    $('coding-lines').scrollTop = source.scrollTop;
  }
  function invalidate() {
    revision++; latestResult = null; draft.completed = false; trace = [];
    $('coding-results')?.replaceChildren(); $('coding-diagnostics')?.replaceChildren();
    $('coding-source')?.removeAttribute('aria-invalid');
    renderTrace('Code or files changed. Run again to inspect current variables.');
    controls();
  }
  function edit(value, start, end, remember = true) {
    if (!draft || value.length > 16384) return;
    const source = $('coding-source'); source.value = value; draft.source = value;
    source.setSelectionRange(start ?? value.length, end ?? start ?? value.length);
    if (remember) { history = history.slice(0,historyIndex+1); history.push(value); if (history.length > 100) history.shift(); historyIndex = history.length - 1; }
    invalidate(); highlight(); save();
  }
  function undo(direction) {
    const next = historyIndex + direction; if (next < 0 || next >= history.length) return;
    historyIndex = next; edit(history[next], undefined, undefined, false); $('coding-source').focus();
  }
  function indent(out = false) {
    const e = $('coding-source'), start = e.value.lastIndexOf('\n',e.selectionStart-1)+1, end = e.value.indexOf('\n',Math.max(e.selectionStart,e.selectionEnd-1));
    const finish = end < 0 ? e.value.length : end;
    const replacement = e.value.slice(start,finish).split('\n').map(line=>out?line.replace(/^( {1,2}|\t)/,''):'  '+line).join('\n');
    edit(e.value.slice(0,start)+replacement+e.value.slice(finish), start, start+replacement.length); e.focus();
  }
  function sourcePosition(line, column = 1) {
    const e = $('coding-source'), lines = e.value.split('\n'); line = Math.max(1,Math.min(lines.length,line));
    const at = lines.slice(0,line-1).reduce((n,v)=>n+v.length+1,0)+Math.max(0,column-1);
    e.focus(); e.setSelectionRange(at,at+1); e.scrollTop = Math.max(0,(line-3)*24); scrollSync();
  }
  function diagnostic(d) {
    $('coding-diagnostics').innerHTML = `<button type="button" data-coding-line="${Number(d.line)||1}" data-coding-column="${Number(d.column)||1}">Line ${Number(d.line)||1}: ${escape(d.message)}</button><p>${escape(d.hint)}</p>`;
    $('coding-source').setAttribute('aria-invalid','true'); message(d.message);
  }
  function terminal(text, input = false) {
    const line = document.createElement('div'); line.textContent = text; if (input) line.className = 'coding-terminal-echo';
    $('coding-output').append(line); $('coding-output').scrollTop = $('coding-output').scrollHeight;
  }
  function bottomTab(name) {
    for (const button of panel.querySelectorAll('[data-coding-bottom]')) { const current = button.dataset.codingBottom === name; button.setAttribute('aria-pressed',String(current)); }
    for (const view of panel.querySelectorAll('[data-coding-bottom-view]')) view.hidden = view.dataset.codingBottomView !== name;
  }
  function guideTab(name) {
    if ($('coding-guidance')) $('coding-guidance').open = true;
    for (const button of panel.querySelectorAll('[data-coding-guide]')) button.setAttribute('aria-pressed',String(button.dataset.codingGuide===name));
    for (const view of panel.querySelectorAll('[data-coding-guide-view]')) view.hidden = view.dataset.codingGuideView !== name;
  }
  async function execute(action) {
    if (!active || worker || session) return;
    stop(null); $('coding-diagnostics').replaceChildren(); $('coding-source').removeAttribute('aria-invalid');
    $('coding-output').replaceChildren(); $('coding-results').replaceChildren(); bottomTab(action==='check'?'checks':'console');
    latestResult = null;controls();
    const source = $('coding-source').value;
    if (action==='run') {
      const inputs = draft.inputs===''?[]:draft.inputs.split('\n').map(line=>line==='""'?'':line);
      if(inputs.length>100||inputs.some(v=>v.length>1024)||draft.inputs.length>8192){message('Use at most 100 inputs, 1,024 characters each and 8,192 total.');return;}
      draft.assistance.runs++; session = {source,inputs,files:{...draft.files},seed:crypto.getRandomValues(new Uint32Array(1))[0]||1,eventsShown:0,eventTime:0,owner,taskId:active.id,load:loadId,revision};
      save(); controls(); dispatch('run');
    } else {
      if(!active.cases.length)return;
      draft.assistance.checks++; save(); dispatch('check');
    }
  }
  function dispatch(action) {
    const id = String(++job), myOwner = owner, myTask = active, myLoad = loadId, runRevision = revision;
    try { worker = new Worker('/pseudocode-worker.js?v='+VERSION); }
    catch { session=null;controls();message('The browser could not start the interpreter. Download your project and try a browser with Web Workers.');return; }
    controls(); message(action==='run'?'Running…':'Checking the task examples…');
    watchdog = setTimeout(()=>{if(String(job)===id)stop('Execution stopped at the time limit. Check whether your loop can finish.');},action==='run'?3000:22000);
    worker.onerror = ()=>{if(String(job)===id)stop('Interpreter stopped safely. Your code is preserved.');};
    worker.onmessage = async e => {
      if(String(job)!==id||e.data.id!==id||owner!==myOwner||loadId!==myLoad||active.id!==myTask.id)return;
      const result = e.data.result; disposeWorker();
      if(action==='run') {
        trace=result.trace||[];
        renderTrace();
        playEvents(result,id,()=>{
          if(result.awaitingInput){
            draft.files={...result.files};renderFiles();save();
            $('coding-terminal-form').hidden=false;
            $('coding-terminal-prompt').textContent=result.prompts.at(-1)||'Enter a value';
            $('coding-terminal-input').value=''; $('coding-terminal-input').focus();
            message('Waiting for input — enter a value below, or Stop.'); controls();
          } else {
            const finishedSession = session;
            const successfulFiles = result.files || {};
            // Even a runtime error can leave useful files to inspect.
            draft.files={...successfulFiles}; session=null; renderFiles(); save(); controls();
            if(result.diagnostic)diagnostic(result.diagnostic);else message(`Run finished · ${result.output.length} output lines`);
            if(finishedSession?.restoreTerminalFocus && (document.activeElement === document.body || $('coding-terminal-form').contains(document.activeElement))) $('coding-output').focus();
            event('coding_run');
          }
        });
      } else {
        latestResult=result; renderChecks(result); controls();
        message(result.allPassed?'Passes all task checks. Review your method and try your own inputs.':'Some checks need attention. Open a result to compare outputs.');
        draft.lastCheckPassed=result.allPassed; draft.lastCheckAt=new Date().toISOString(); save();
        if(owner&&result.cases.length){
          const attempt={id:crypto.randomUUID(),taskId:myTask.id,taskVersion:myTask.version,interpreterVersion:VERSION,mode:draft.mode,firstCheck:draft.assistance.checks===1,assistance:{...draft.assistance,checks:draft.assistance.checks-1},outcomes:result.cases.map(c=>({id:c.id,outcome:c.passed?'passed':c.diagnostic?'diagnostic':'failed'}))};
          if(drafts.queue(owner,attempt)) await sync(owner);else $('coding-sync').textContent='The local retry queue is full. Download your coding data to preserve this result.';
        }
        if(owner===myOwner&&loadId===myLoad)event('coding_check');
      }
    };
    worker.postMessage({id,action,source:action==='run'?session.source:draft.source,inputs:session?.inputs||[],files:action==='run'?session.files:active.files,seed:session?.seed,cases:myTask.cases,comparison:myTask.comparison});
  }
  function playEvents(result,id,done) {
    const state=session; if(!state)return;
    const events=result.events||result.output.map(text=>({kind:'output',text,atMs:0}));
    const next=()=>{
      if(String(job)!==id||session!==state)return;
      if(state.eventsShown>=events.length){
        const remaining=Math.max(0,(result.delay||0)-state.eventTime);
        state.eventTime=result.delay||state.eventTime;
        if(remaining){playback=setTimeout(()=>{if(String(job)===id&&session===state)done();},remaining);}else done();return;
      }
      const item=events[state.eventsShown],delay=Math.max(0,item.atMs-state.eventTime);
      const emit=()=>{if(String(job)!==id||session!==state)return;state.eventsShown++;state.eventTime=item.atMs;
        terminal(item.kind==='input'?`${item.prompt} > ${item.value}`:item.text,item.kind==='input');next();};
      if(delay)playback=setTimeout(emit,delay);else emit();
    };next();
  }
  function renderChecks(result) {
    $('coding-results').innerHTML=`<p class="coding-check-summary">${result.cases.filter(c=>c.passed).length} of ${result.cases.length} checks passed</p><p>Task checks use the supplied starter data. Your edited files and draft remain intact.</p>`+result.cases.map(c=>{
      const fixture=active.cases.find(x=>x.id===c.id);
      const checkedFiles = Object.entries(c.expectedFiles || {}).map(([name, expected]) => {
        const exists = Object.hasOwn(c.files || {}, name);
        return `<div class="coding-checked-file"><h4>File: ${escape(name)}</h4><div class="coding-comparison"><div><strong>Expected contents</strong><pre>${escape(expected || '(Empty file)')}</pre></div><div><strong>Your file</strong><pre>${escape(exists ? c.files[name] || '(Empty file)' : '(File not created)')}</pre></div></div></div>`;
      }).join('');
      return `<details><summary><span class="coding-result-${c.passed?'pass':'fail'}">${c.passed?'Pass':'Check'}</span> ${escape(c.label)}</summary><p>Inputs: ${escape(JSON.stringify(fixture.inputs))}</p>${fixture.validator?'<p>This case validates random output against the actual generated data.</p>':''}<div class="coding-comparison"><div><strong>Expected</strong><pre>${escape(c.expected.join('\n')||'(No output)')}</pre></div><div><strong>Your output</strong><pre>${escape(c.output.join('\n')||'(No output)')}</pre></div></div>${checkedFiles}${fixture.expectedTimings?'<p>One-second gaps between verses are also checked.</p>':''}${c.diagnostic?`<button type="button" data-coding-line="${c.diagnostic.line}" data-coding-column="${c.diagnostic.column}">Line ${c.diagnostic.line}: ${escape(c.diagnostic.message)}</button>`:''}</details>`;
    }).join('');
  }
  function renderTrace(emptyNote = 'Run a program to inspect its variables here.') {
    $('coding-trace-select').innerHTML=trace.map((t,i)=>`<option value="${i}">${i+1} · line ${t.line}</option>`).join('');
    $('coding-trace-select').disabled = !trace.length;
    panel.querySelector('[data-code-action="trace-line"]').disabled = !trace.length;
    $('coding-trace-note').textContent=trace.length?'Select a recorded step to inspect variables. Trace keeps the first 120 events.':emptyNote;
    showTrace();
  }
  function showTrace() {
    const step=trace[Number($('coding-trace-select').value)||0];
    $('coding-trace-values').textContent=step?JSON.stringify({line:step.line,scope:step.stack.join(' → ')||'main',variables:step.variables},null,2):'';
  }
  function validFiles(files) {
    if(!files||typeof files!=='object'||Array.isArray(files)||Object.keys(files).length>20)return false;
    let size=0;
    for(const [name,text] of Object.entries(files)){if(!/^[A-Za-z0-9_-][A-Za-z0-9_. -]{0,63}$/.test(name)||name.includes('..')||typeof text!=='string')return false;size+=text.length;}
    return size<=65536;
  }
  function renderFiles({ focus = false } = {}) {
    if(!$('coding-files'))return;
    const names=Object.keys(draft.files); if($('coding-file-count'))$('coding-file-count').textContent=names.length; if(!names.includes(selectedFile))selectedFile=names[0]||null;
    $('coding-files').innerHTML=`<p>Text files belong to this task and stay on your device. Programs can read, create and write them.</p><div class="coding-file-list">${names.map(name=>`<button type="button" data-coding-file="${escape(name)}" aria-pressed="${name===selectedFile}">${escape(name)}</button>`).join('')}</div><form id="coding-file-create"><label for="coding-file-name">New filename</label><div class="coding-field-row"><input id="coding-file-name" maxlength="64" placeholder="data.txt" required><button type="submit" data-code-action="new-file">Add</button></div></form>${selectedFile?`<label for="coding-file-text">${escape(selectedFile)}</label><textarea id="coding-file-text" rows="12" maxlength="65536" spellcheck="false">${escape(draft.files[selectedFile])}</textarea><button type="button" data-code-action="delete-file">Delete file</button>`:'<p>No files yet. Add one above or create one in your program.</p>'}<button type="button" data-code-action="reset-files">Restore task files</button>`;
    controls();
    if (focus) ($('coding-file-text') || $('coding-file-name')).focus();
  }
  function renderLibrary() {
    const category=$('coding-category').value,term=$('coding-search').value.toLowerCase().trim();
    const shown=tasks.filter(t=>(!category||t.category===category)&&`${t.title} ${t.worksheet||''} ${t.prompt}`.toLowerCase().includes(term));
    $('coding-task-count').textContent=`${shown.length} tasks`;
    $('coding-task-list').innerHTML=shown.map(t=>{
      const saved=drafts.draft(localOwner(),t.id);const status=saved?.completed?'Reviewed':saved?.lastCheckPassed?'Checks passed':saved?'In progress':'Start task';
      return `<button type="button" class="coding-task-card" data-coding-task="${escape(t.id)}"><span>${escape(t.worksheet||t.category)} · ${escape(t.difficulty)}</span><strong>${escape(t.title)}</strong><small>${escape(status)}</small></button>`;
    }).join('')||'<p>No matching tasks. Try another word or category.</p>';
  }
  const languageHelp=`<h4>Language reference</h4><p>One statement per line. Keywords ignore case; variable names are case-sensitive. <code>//</code> begins a comment.</p>
    <details open><summary>Input, output and numbers</summary><pre>name=input("Name")
print("Hello, "+name)
n=int(input("Whole number"))
x=float(input("Decimal"))
print(str(n))</pre><p>Input returns text. Run asks for missing values in the terminal. Use str() to join numbers into strings. Math: + − * / ^ DIV MOD, floor, ceil, round, sqrt, abs, min, max. <code>format(x,2)</code> returns two decimal places. <code>random(1,6)</code> includes both endpoints.</p></details>
    <details><summary>Selection and loops</summary><pre>if n&gt;0 then
 print("positive")
elseif n==0 then
 print("zero")
else
 print("negative")
endif
switch n:
 case 1: print("one")
 default: print("other")
endswitch
for i=10 to 0 step -1
 print(i)
next i
while n&gt;0
 n=n-1
endwhile
do
 n=int(input("Positive number"))
until n&gt;0</pre><p>= assigns; == compares. Boolean operators: AND, OR, NOT. For endpoints are inclusive; step cannot be zero. break exits a loop; continue starts its next iteration.</p></details>
    <details><summary>Strings and arrays</summary><pre>word="Computer"
print(word[0])
print(word.length)
print(word.subString(0,3))
print(word.upper)
print(word.lower)
print(word.left(2))
print(word.right(2))
parts="a,b,c".split(",")
print(ASC("A"))
print(CHR(65))
names=["Ada","Grace"]
array grid[3,4]
grid[0,0]=7
array cube[2,3,3]
cube[1,2,0]="History"</pre><p>Indexes start at zero. subString takes start and character count. Arrays support 1, 2 or 3 dimensions, nested literals, comma indexes or successive brackets. Assign declared cells before reading them.</p></details>
    <details><summary>Virtual files and timed output</summary><pre>if existsFile("data") then
 delFile("data")
endif
newFile("data")
f=open("data")
f.writeLine("one")
f.close()
f=openRead("data")
while NOT f.endOfFile()
 print(f.readLine())
 wait(1)
endwhile
f.close()</pre><p>open reads and appends; openRead reads; openWrite creates or clears for writing. close then reopen to read from the start. Files never access your computer or network. wait/sleep(seconds) delays terminal playback; Stop cancels it.</p></details>
    <details><summary>Functions and procedures</summary><pre>function double(n)
 return n*2
endfunction
print(double(3))
procedure greet(name:byVal)
 print("Hello "+name)
endprocedure
greet("Ada")</pre><p>Arguments are copied by value; routine variables are local. Recursion, classes, globals and byRef are outside this worksheet language.</p></details>
    <p>Programs run in a worker: 16,384 source characters, 1,000,000 work units per run, 4,096 array cells, 1,000 output lines, 20 virtual files/65,536 characters and 30 seconds of timed output. Use Stop at any time.</p>`;
  function renderTask() {
    $('coding-task-select').value=active.id;
    $('coding-workspace').innerHTML=`<header class="coding-task-head"><div><p class="eyebrow">${escape(active.worksheet||active.category)} · ${escape(active.kind)} · ${escape(active.difficulty)}</p><h2 id="coding-task-title" tabindex="-1">${escape(active.title)}</h2><p class="coding-task-summary">${escape(active.prompt.split('\n')[0].slice(0, 180))}${active.prompt.split('\n')[0].length > 180 ? '…' : ''}</p></div><button type="button" data-code-action="next">Next task →</button></header>
      <div class="coding-workbench"><details id="coding-guidance" class="coding-guide-disclosure" ${compactWorkspace.matches?'':'open'}><summary>Instructions, files &amp; language</summary><aside class="coding-guide" aria-label="Task instructions and files"><div class="coding-tabs" aria-label="Workspace guidance"><button type="button" data-coding-guide="task" aria-pressed="true">Task</button><button type="button" data-coding-guide="files" aria-pressed="false">Files <span id="coding-file-count">${Object.keys(draft.files).length}</span></button><button type="button" data-coding-guide="language" aria-pressed="false">Language</button></div>
      <div data-coding-guide-view="task"><p class="coding-task-prompt">${escape(active.prompt)}</p>${active.fixtureNote?`<p class="coding-fixture-note">${escape(active.fixtureNote)}</p>`:''}<details open><summary>Example</summary><p>Input</p><pre>${escape(active.example.inputs.join('\n')||'(No input)')}</pre><p>Expected output</p><pre>${escape(active.example.output.join('\n')||'(No output)')}</pre><button type="button" data-code-action="example-input">Load example inputs</button></details>
      <details><summary>Plan your approach</summary><label for="coding-plan">Notes or prediction</label><textarea id="coding-plan" rows="3" maxlength="2000">${escape(draft.plan)}</textarea><label for="coding-mode">Attempt label</label><select id="coding-mode"><option value="learn">Practice</option><option value="independent">First attempt</option></select><p>Your runs and help use are recorded with checks.</p></details>
      ${active.hints.length?`<details><summary>Hints and worked solution</summary><ol id="coding-hints">${active.hints.slice(0,draft.assistance.hints).map(h=>`<li>${escape(h)}</li>`).join('')}</ol><button id="coding-hint" type="button" data-code-action="hint">Next hint</button><button id="coding-solution" type="button" data-code-action="solution">Show solution</button><pre id="coding-solution-source" hidden></pre><button id="coding-solution-use" type="button" data-code-action="solution-use" hidden>Use solution in editor</button></details>`:''}
      ${active.rubric.length?`<details><summary>Review your work</summary>${active.rubric.map((r,i)=>`<label class="coding-checkbox"><input type="checkbox" data-coding-rubric="${i}" ${draft.rubric[i]?'checked':''}>${escape(r)}</label>`).join('')}<button id="coding-finish" type="button" data-code-action="finish" disabled>Mark reviewed</button><p>Task checks are practice feedback; they do not award exam marks.</p></details>`:''}</div>
      <div id="coding-files" data-coding-guide-view="files" hidden></div><div data-coding-guide-view="language" hidden>${languageHelp}</div></aside></details>
      <section class="coding-main" aria-label="Code editor and console"><div class="coding-editor-heading"><label for="coding-source">code.erl</label><span id="coding-save"></span><label class="coding-checkbox"><input id="coding-plain" type="checkbox">Plain text</label></div>
      <div class="coding-runbar"><button id="coding-run" class="primary-button" type="button" data-code-action="run">▶ Run</button><button id="coding-stop" type="button" data-code-action="stop" disabled>■ Stop</button><button id="coding-check" type="button" data-code-action="check">Check task</button><span id="coding-assistance"></span></div>
      <details id="coding-editor-tools" class="coding-editor-tools" ${compactWorkspace.matches?'':'open'}><summary>Editor tools &amp; projects</summary><div class="coding-edit-tools"><button type="button" data-code-action="undo">Undo</button><button type="button" data-code-action="redo">Redo</button><button type="button" data-code-action="indent">Indent</button><button type="button" data-code-action="outdent">Outdent</button><button type="button" data-code-action="reset">Reset code</button><button type="button" data-code-action="download">Download</button><button type="button" data-code-action="import">Open project</button><input id="coding-project-import" type="file" accept=".json,.erl,.txt" hidden></div></details>
      <div class="coding-editor"><pre id="coding-lines" aria-hidden="true"></pre><div class="coding-code-layers"><pre id="coding-highlight" aria-hidden="true"></pre><textarea id="coding-source" maxlength="16384" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-describedby="coding-editor-help">${escape(draft.source)}</textarea></div></div>
      <p id="coding-editor-help">Ctrl/⌘ + Enter to run. Tab moves to the next control; use Indent for spacing.</p>
      <p id="coding-status" role="status" aria-live="polite" aria-atomic="true">Ready — write your program and press Run.</p><div id="coding-diagnostics" class="coding-diagnostics"></div>
      <section class="coding-console"><div class="coding-tabs"><button type="button" data-coding-bottom="console" aria-pressed="true">Console</button><button type="button" data-coding-bottom="checks" aria-pressed="false">Task checks</button><button type="button" data-coding-bottom="trace" aria-pressed="false">Variables</button></div>
      <div data-coding-bottom-view="console"><div id="coding-output" role="log" aria-label="Program output" tabindex="0"></div><form id="coding-terminal-form" hidden><label id="coding-terminal-prompt" for="coding-terminal-input">Input</label><div class="coding-field-row"><input id="coding-terminal-input" maxlength="1024" autocomplete="off"><button type="submit">Enter ↵</button></div></form><details class="coding-fixtures"><summary>Preload input values (optional)</summary><label for="coding-input">One value per line; use "" for an empty value</label><textarea id="coding-input" rows="3" maxlength="8192" spellcheck="false">${escape(draft.inputs)}</textarea><p>Run will ask interactively when these values run out.</p></details></div>
      <div id="coding-results" data-coding-bottom-view="checks" hidden><p>Check task runs the stated cases against the task’s original files.</p></div><div data-coding-bottom-view="trace" hidden><p id="coding-trace-note"></p><label for="coding-trace-select">Recorded step</label><select id="coding-trace-select"></select><button type="button" data-code-action="trace-line">Go to source line</button><pre id="coding-trace-values"></pre></div></section>
      </section></div><footer class="coding-data"><details><summary>Saving and privacy</summary><p>Code, files and planning notes are saved on this device for 30 days after editing. Signed-in accounts can also keep check outcome metadata. Your source and file contents are never uploaded. Download a project to move it between devices. Export before signing out on a shared computer.</p><p id="coding-sync">${owner?'Checking pending outcomes…':'Guest drafts stay on this device.'}</p><button type="button" data-code-action="export">Export coding data</button><button type="button" data-code-action="sync">Retry outcome sync</button><button type="button" data-code-action="clear">Clear saved coding data</button></details></footer>`;
    $('coding-mode').value=draft.mode;renderFiles();highlight();renderTrace();controls();save();sync();
  }
  function choose(id, { notify = true, focus = notify } = {}) {
    if (!validTaskId(id)) return false;
    const previousId = active?.id;
    stop(null); loadId++; active=id==='scratch'?scratch:tasks.find(t=>t.id===id);
    revision=0;latestResult=null;trace=[];selectedFile=null;
    const stored=drafts.draft(localOwner(),id),restored=window.CodingDrafts.restore(stored,active);
    draft=restored.draft||{source:active.starter,inputs:'',plan:'',mode:'learn',assistance:{runs:0,hints:0,checks:0,solution:false},rubric:[],files:{...active.files},completed:false,taskVersion:active.version,interpreterVersion:VERSION};
    if(!validFiles(draft.files))draft.files={...active.files};
    if(restored.stale){draft.source=restored.recovery;draft.recoveredFromVersion=stored.taskVersion;}
    draft.taskVersion=active.version;draft.interpreterVersion=VERSION;
    history=[draft.source];historyIndex=0;drafts.remember(localOwner(),id);renderTask();
    if(restored.stale)message('Your earlier code has been restored in the updated workspace. Review the task and run it again.');
    libraryOpen=false;$('coding-library').hidden=true;event('coding_task_opened');
    panel.querySelector('[data-code-action="browse"]')?.setAttribute('aria-expanded', 'false');
    if (notify && previousId !== id && typeof context.onTaskChange === 'function') context.onTaskChange(id);
    if (focus) $('coding-task-title').focus();
    return true;
  }
  async function sync(myOwner=owner) {
    if(!myOwner)return;
    for(const attempt of drafts.pending(myOwner)){
      if(owner!==myOwner)return;
      try{await request(`/api/coding/tasks/${encodeURIComponent(attempt.taskId)}/attempts`,{method:'POST',body:JSON.stringify(attempt)});if(owner!==myOwner)return;drafts.acknowledge(myOwner,attempt.id);}
      catch(error){if(owner===myOwner&&$('coding-sync'))$('coding-sync').textContent='Check outcome saved locally; sync will retry. '+error.message;return;}
    }
    if(owner===myOwner&&$('coding-sync'))$('coding-sync').textContent='Check outcome metadata synced. Code and files stay on this device.';
  }
  function download(data,filename,type='application/json') {
    const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function exportData() {
    const exportingOwner=owner,local=drafts.export(localOwner());let attempts=[];if(exportingOwner){try{attempts=(await request('/api/coding/attempts')).attempts;}catch{message('Export includes local data; account outcomes were unavailable.');}}
    if(owner!==exportingOwner)return;
    download({exportedAt:new Date().toISOString(),local,attempts},'recallstride-coding-data.json');
  }
  async function show(options) {
    visible=true;context=options||{};const nextOwner=context.owner||null;
    if(nextOwner!==owner){stop(null);loadId++;loading=false;owner=nextOwner;active=null;draft=null;tasks=[];}
    if(active&&$('coding-source')){
      if(validTaskId(context.taskId) && context.taskId !== active.id) choose(context.taskId, {notify:false});
      return;
    }
    if(loading)return;loading=true;sessionId=crypto.randomUUID();const id=++loadId;loadingId=id;
    panel.innerHTML='<p role="status">Loading the coding workspace…</p>';
    try{
      const bank=await loadCatalogue();if(id!==loadId||!visible)return;
      tasks=bank;
      panel.innerHTML=`<header class="coding-studio-head" aria-label="Coding task tools"><div class="coding-studio-actions"><button type="button" data-code-action="browse" aria-controls="coding-library" aria-expanded="false">Browse ${tasks.length} tasks</button><button type="button" data-code-action="scratch">Scratchpad</button><label class="coding-select-label" for="coding-task-select">Current task<select id="coding-task-select">${tasks.map(t=>`<option value="${escape(t.id)}">${escape(t.worksheet||'Extra')} · ${escape(t.title)}</option>`).join('')}<option value="scratch">Scratchpad</option></select></label></div></header>
      <section id="coding-library" class="coding-library" aria-label="Coding task library" hidden><div class="coding-library-filters"><label for="coding-category">Topic<select id="coding-category"><option value="">All topics</option>${[...new Set(tasks.map(t=>t.category))].map(c=>`<option>${escape(c)}</option>`).join('')}</select></label><label for="coding-search">Find a task<input id="coding-search" type="search" placeholder="Search titles or task numbers"></label><span id="coding-task-count"></span></div><div id="coding-task-list"></div></section><div id="coding-workspace"></div>`;
      renderLibrary();const resume=drafts.resume(localOwner());choose(validTaskId(context.taskId)?context.taskId:validTaskId(resume)?resume:tasks[0].id,{notify:false});event('coding_session_started');
    }catch(error){if(id===loadId)panel.innerHTML=`<p role="status">${escape(error.message)}</p><button type="button" data-code-action="reload">Retry loading</button><button type="button" data-code-action="export">Export saved drafts</button>`;}
    finally{if(loadingId===id)loading=false;}
  }
  panel.addEventListener('input',e=>{
    if(e.target.id==='coding-search'){renderLibrary();return;}if(!draft)return;
    if(e.target.id==='coding-source'){
      draft.source=e.target.value;history=history.slice(0,historyIndex+1);history.push(draft.source);if(history.length>100)history.shift();historyIndex=history.length-1;invalidate();highlight();
    }
    if(e.target.id==='coding-plan')draft.plan=e.target.value;
    if(e.target.id==='coding-input')draft.inputs=e.target.value;
    if(e.target.id==='coding-file-text'){
      const files={...draft.files,[selectedFile]:e.target.value};
      if(validFiles(files)){draft.files=files;invalidate();}else{e.target.value=draft.files[selectedFile];message('Virtual file storage is limited to 65,536 characters.');}
    }
    if(e.target.hasAttribute('data-coding-rubric'))draft.rubric[Number(e.target.dataset.codingRubric)]=e.target.checked;
    save();
  });
  panel.addEventListener('change',async e=>{
    if(e.target.id==='coding-task-select')choose(e.target.value);
    if(e.target.id==='coding-category')renderLibrary();
    if(e.target.id==='coding-plain')panel.querySelector('.coding-editor').classList.toggle('coding-plain',e.target.checked);
    if(e.target.id==='coding-mode'){draft.mode=e.target.value;save();}
    if(e.target.id==='coding-trace-select')showTrace();
    if(e.target.id==='coding-project-import'){
      const file=e.target.files[0];if(!file)return;const importingOwner=owner,importingLoad=loadId;
      try{
        if(file.size>120000)throw Error('Project is too large. Use up to 16,384 source characters and 65,536 file characters.');
        const text=await file.text();if(owner!==importingOwner||loadId!==importingLoad)return;let source=text,files=null,taskId=null;
        if(file.name.toLowerCase().endsWith('.json')){
          const project=JSON.parse(text);
          if(!project || project.format!=='recallstride-code-project'||project.version!==1)throw Error('Choose a RecallStride project JSON, or a plain .erl/.txt source file.');
          source=project.source;files=project.files;taskId=project.taskId;
          if(typeof taskId!=='string'||!taskId.length||taskId.length>100)throw Error('The project is missing a valid task ID. Open its code as a plain .erl/.txt file instead.');
          if(!validFiles(files))throw Error('Project source or files exceed the workspace limits.');
        }
        if(typeof source!=='string'||source.length>16384)throw Error('Project source or files exceed the workspace limits.');
        const unknownTask = taskId && !validTaskId(taskId);
        if(taskId)choose(unknownTask?'scratch':taskId,{focus:false});
        stop(null);edit(source);if(files){draft.files={...files};renderFiles();save();}
        $('coding-source').focus();
        message(unknownTask?'Project opened in Scratchpad because its original task is no longer available. Your code and files are preserved.':taskId?'Project opened for '+active.title+'. Task checks use this task’s original data.':'Source opened in the current task. Task checks use this task’s original data.');
      }catch(error){message(error.message);}e.target.value='';
    }
  });
  panel.addEventListener('submit',e=>{
    if(e.target.id==='coding-terminal-form'){
      e.preventDefault();if(!session||worker)return;
      const value=$('coding-terminal-input').value;
      if(session.inputs.length>=100||session.inputs.reduce((n,v)=>n+v.length,0)+value.length>8192){message('Input limit reached. Stop and use a smaller dataset.');return;}
      session.restoreTerminalFocus = e.target.contains(document.activeElement);
      session.inputs.push(value);$('coding-terminal-form').hidden=true;dispatch('run');
    }
    if(e.target.id==='coding-file-create'){
      e.preventDefault();if(worker||session)return;const name=$('coding-file-name').value.trim();
      if(Object.hasOwn(draft.files,name)){message('That file already exists. Select it to edit.');return;}
      const files={...draft.files,[name]:''};if(!validFiles(files)){message('Use a simple filename without folders; at most 20 files.');return;}
      draft.files=files;selectedFile=name;invalidate();renderFiles({focus:true});save();$('coding-file-count').textContent=Object.keys(files).length;
    }
  });
  panel.addEventListener('scroll',e=>{if(e.target.id==='coding-source')scrollSync();},true);
  panel.addEventListener('keydown',e=>{
    if(e.target.id!=='coding-source'||e.target.readOnly)return;
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();execute('run');}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey?1:-1);}
    else if(e.key==='Enter'){
      e.preventDefault();const at=e.target.selectionStart,end=e.target.selectionEnd,line=e.target.value.slice(0,at).split('\n').at(-1);
      const spaces=line.match(/^\s*/)[0];edit(e.target.value.slice(0,at)+'\n'+spaces+e.target.value.slice(end),at+1+spaces.length);
    }
  });
  panel.addEventListener('click',async e=>{
    const line=e.target.closest('[data-coding-line]');if(line){sourcePosition(Number(line.dataset.codingLine),Number(line.dataset.codingColumn));return;}
    const task=e.target.closest('[data-coding-task]');if(task){choose(task.dataset.codingTask);return;}
    const file=e.target.closest('[data-coding-file]');if(file){selectedFile=file.dataset.codingFile;renderFiles({focus:true});return;}
    const guide=e.target.closest('[data-coding-guide]');if(guide){guideTab(guide.dataset.codingGuide);return;}
    const bottom=e.target.closest('[data-coding-bottom]');if(bottom){bottomTab(bottom.dataset.codingBottom);return;}
    const button=e.target.closest('[data-code-action]');if(!button||button.disabled||button.type==='submit')return;
    const action=button.dataset.codeAction;
    if(action==='reload'){stop(null);active=null;loading=false;show(context);return;}
    if(action==='export'){exportData();return;}
    if(action==='browse'){libraryOpen=!libraryOpen;$('coding-library').hidden=!libraryOpen;button.setAttribute('aria-expanded',String(libraryOpen));if(libraryOpen){renderLibrary();$('coding-search').focus();}return;}
    if(action==='scratch'){choose('scratch');return;}
    if(!draft)return;
    if(action==='run'||action==='check'){execute(action);return;}
    if(action==='stop'){stop();return;}
    if(action==='undo'||action==='redo'){undo(action==='undo'?-1:1);return;}
    if(action==='indent'||action==='outdent'){indent(action==='outdent');return;}
    if(action==='sync'){sync();return;}
    if(action==='next'){choose(active.transferId||tasks[0].id);return;}
    if(action==='example-input'){draft.inputs=active.example.inputs.join('\n');$('coding-input').value=draft.inputs;save();message('Example inputs loaded. Press Run.');return;}
    if(action==='reset'){edit(active.starter);message('Task starter restored. Undo recovers your previous code.');return;}
    if(action==='download'){download({format:'recallstride-code-project',version:1,taskId:active.id,source:draft.source,files:draft.files},`recallstride-${active.id}.json`);return;}
    if(action==='import'){$('coding-project-import').click();return;}
    if(action==='reset-files'){
      const changed=Object.keys(draft.files).filter(name=>!Object.hasOwn(active.files,name)||draft.files[name]!==active.files[name]);
      if(changed.length&&!window.confirm('Restore the original task files? This replaces or removes your changes to '+changed.map(name=>'"'+name+'"').join(', ')+'. Download your project first if you want to keep them.'))return;
      draft.files={...active.files};invalidate();renderFiles({focus:true});save();$('coding-file-count').textContent=Object.keys(draft.files).length;message('Task files restored.');return;
    }
    if(action==='delete-file'){
      if(!selectedFile)return;
      if(draft.files[selectedFile].length&&!window.confirm('Delete "'+selectedFile+'" and its contents? This cannot be undone. Download your project first if you want to keep it.'))return;
      delete draft.files[selectedFile];selectedFile=null;invalidate();renderFiles({focus:true});save();$('coding-file-count').textContent=Object.keys(draft.files).length;message('File deleted.');return;
    }
    if(action==='hint'){
      if(draft.assistance.hints<active.hints.length){draft.assistance.hints++;$('coding-hints').innerHTML=active.hints.slice(0,draft.assistance.hints).map(h=>`<li>${escape(h)}</li>`).join('');save();controls();event('coding_hint');}return;
    }
    if(action==='solution'){
      const myLoad=loadId,myTask=active;
      try{const data=await request(`/api/coding/tasks/${encodeURIComponent(active.id)}/solution`);if(loadId!==myLoad)return;
        if(data.version!==myTask.version)throw Error('The task changed. Reload the catalogue to get its current solution.');
        draft.assistance.solution=true;$('coding-solution-source').textContent=data.solution;$('coding-solution-source').hidden=false;$('coding-solution-use').hidden=false;save();controls();event('coding_solution');
      }catch(error){message(error.message);}return;
    }
    if(action==='solution-use'){edit($('coding-solution-source').textContent);message('Worked solution loaded. Undo recovers your previous code.');return;}
    if(action==='trace-line'){const step=trace[Number($('coding-trace-select').value)||0];if(step)sourcePosition(step.line,step.column);return;}
    if(action==='finish'){
      if(active.rubric.some((_,i)=>!draft.rubric[i])){message('Tick each method review item before marking reviewed.');return;}
      draft.completed=true;save();message('Practice reviewed. Try the next task to apply the idea again.');event('coding_session_completed');return;
    }
    if(action==='clear'){
      if(!window.confirm('Clear this account’s coding outcomes and this device’s drafts? Download anything you want to keep first.'))return;
      try{if(owner)await request('/api/coding/attempts',{method:'DELETE'});drafts.clear(localOwner());stop(null);active=null;show(context);}catch(error){message(error.message);}return;
    }
  });
  window.addEventListener('online',()=>{if(visible)sync();});
  compactWorkspace.addEventListener('change', () => {
    if ($('coding-guidance')) $('coding-guidance').open = !compactWorkspace.matches;
    if ($('coding-editor-tools')) $('coding-editor-tools').open = !compactWorkspace.matches;
  });
  window.addEventListener('storage',e=>{if(e.key==='recallstride-coding-session-change'){stop(null);owner=null;active=null;draft=null;tasks=[];loadId++;panel.innerHTML='<p role="status">The account session changed in another tab. Reload to continue.</p>';}});
  window.CodingPractice={show,searchTasks,hide(){visible=false;stop(null);},sessionChanged(previousOwner,clear=false){stop(null);loadId++;loading=false;if(clear)drafts.clear(previousOwner);owner=null;active=null;draft=null;tasks=[];panel.replaceChildren();try{storage.setItem('recallstride-coding-session-change',crypto.randomUUID());}catch{}},exportLocal(id){return drafts.export(id);},clearLocal(id){drafts.clear(id);}};
})();
