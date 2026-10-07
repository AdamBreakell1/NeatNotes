'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {DatabaseSync}=require('node:sqlite');
const {TASKS}=require('./pseudocodeTasks');const P=require('./pseudocodePractice');const D=require('../../pseudocode-drafts');const {validateEvent,registerPilotRoutes}=require('./pilotTelemetry');const {benchmark}=require('../../scripts/benchmark-pseudocode');
const fixture=(id='attempt-123456789012')=>({id,taskId:TASKS[0].id,taskVersion:TASKS[0].version,interpreterVersion:'rs-h446-1.0.0',mode:'independent',firstCheck:true,assistance:{runs:0,hints:0,checks:0,solution:false},outcomes:TASKS[0].cases.map(c=>({id:c.id,outcome:'passed'}))});
function storage(){const m=new Map();return{get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('version-specific academic gate and production cannot enable draft preview',()=>{
 assert.equal(P.canPreview({NODE_ENV:'production',RECALLSTRIDE_CODING_PREVIEW:'true'}),false);assert.equal(P.canPreview({NODE_ENV:'development'}),false);assert.equal(P.canPreview({NODE_ENV:'development',RECALLSTRIDE_CODING_PREVIEW:'true'}),true);
 assert.ok(TASKS.every(t=>!P.isReviewed(t)));const t=TASKS[0];const records=[{taskId:t.id,version:t.version,sha256:P.digest(t),status:'approved',reviewer:'Synthetic reviewer fixture',reviewedAt:'2026-09-13'}];
 assert.equal(P.isReviewed(t,records),true);assert.equal(P.isReviewed({...t,prompt:t.prompt+' changed'},records),false);
 const data=P.publicTask(t);assert.equal(data.solutions,undefined);assert.equal(data.mutations,undefined);assert.equal(data.numericalScore,null);
});
test('attempt records are account-bound, strictly metadata-only, idempotent, expiring and deletion-integrated',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES("a"),("b")'.replaceAll('"',"'"));let now=Date.parse('2026-09-13');const store=P.createPracticeStore(db,()=>now),f=fixture();
 const first=store.save('a',f,TASKS[0]);assert.equal(first.record.trusted,false);assert.equal(first.record.masteryEligible,false);assert.equal(first.record.evaluation,'local');assert.equal(store.save('a',f,TASKS[0]).duplicate,true);assert.equal(store.list('a').length,1);assert.equal(store.list('b').length,0);
 assert.equal(store.save('a',{...f,mode:'learn'},TASKS[0]).conflict,true);assert.equal(store.save('b',f,TASKS[0]).duplicate,false);
 for(const injection of [{score:100},{source:'private answer'},{trusted:true},{masteryEligible:true}])assert.throws(()=>P.normaliseAttempt({...f,...injection},TASKS[0]));
 assert.throws(()=>P.normaliseAttempt({...f,taskVersion:'old'},TASKS[0]));assert.throws(()=>P.normaliseAttempt({...f,outcomes:[f.outcomes[0],f.outcomes[0]]},TASKS[0]));
 db.prepare('DELETE FROM users WHERE id=?').run('a');assert.equal(store.list('a').length,0);now+=P.RETENTION_MS+1;assert.equal(store.list('b').length,0);db.close();
});
test('local drafts, content changes, expiration, offline retry identity and storage errors',()=>{
 const s=storage();let now=1000;const store=D.createStore(s,()=>now),t=TASKS[0],draft={source:'print(1)',taskVersion:t.version,interpreterVersion:t.interpreterVersion,mode:'learn',assistance:{runs:0,hints:0,checks:0,solution:false},inputs:'1',plan:'predict'};
 assert.equal(store.save('a',t.id,draft),true);assert.equal(store.draft('b',t.id),null);assert.equal(D.restore(store.draft('a',t.id),t).draft.source,'print(1)');assert.equal(D.restore(draft,{...t,version:'new'}).stale,true);
 store.remember('a',t.id);assert.equal(store.resume('a'),t.id);assert.equal(store.resume('b'),null);
 assert.equal(store.queue('a',fixture()),true);assert.equal(store.queue('a',fixture()),true);assert.equal(store.pending('a').length,1);assert.deepEqual(store.pending('a')[0],fixture());store.acknowledge('a',fixture().id);assert.equal(store.pending('a').length,0);
 store.save('b',t.id,draft);store.clear('a');assert.equal(store.draft('a',t.id),null);assert.ok(store.draft('b',t.id));now+=D.MAX_AGE+1;assert.equal(store.draft('b',t.id),null);
 for(let i=0;i<20;i++)assert.equal(store.queue('a',fixture(`attempt-${String(i).padStart(12,'0')}`)),true);
 assert.equal(store.queue('a',fixture('attempt-000000000000')),true);assert.equal(store.queue('a',fixture('attempt-overflow-123456')),false);
 store.clear('a');now=1000;store.save('a','expired',draft);now+=D.MAX_AGE+1;store.save('a','current',draft);assert.ok(store.export('a').drafts.current);assert.equal(store.export('a').drafts.expired,undefined);
 const broken=D.createStore({setItem(){throw Error('quota');},getItem(){throw Error('blocked');}});assert.equal(broken.save('a',t.id,draft),false);assert.equal(broken.draft('a',t.id),null);
});
test('small authored benchmark detects seeded faults and accepts structurally different alternatives',()=>{
 const b=benchmark();assert.equal(b.summary.tasks,8);assert.equal(b.summary.falseNegatives,0);assert.equal(b.summary.falsePositives,0);assert.equal(b.summary.correctAlternatives,17);assert.equal(b.summary.seededFaults,17);
 for(const t of TASKS){assert.equal(t.provenance.independentReviewer,null);assert.ok(t.hints.length===3&&t.rubric.length>=3&&t.misconceptions.length>=2);assert.ok(TASKS.some(x=>x.id===t.transferId));}
});
test('pilot events allow enum and identity data only, never source, answers or arbitrary text',()=>{
 const value={id:'event-123456789012',name:'coding_check',sessionId:'session-123456789012',taskId:TASKS[0].id,mode:'learn'};assert.deepEqual(validateEvent(value),value);
 assert.equal(validateEvent({...value,source:'secret'}),null);assert.equal(validateEvent({...value,name:'custom private message'}),null);assert.equal(validateEvent({...value,taskId:'personal text'}),null);
});
test('pilot aggregates distinguish first observed completion, returning dates and repeated weeks',()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('a'),('b'),('c')");
 let metrics;registerPilotRoutes({post(){},get(path,...handlers){metrics=handlers.at(-1);}},{db});
 const insert=db.prepare('INSERT INTO pilot_events(id,user_id,event_name,session_id,task_id,mode,created_at) VALUES(?,?,?,?,?,?,?)');let id=0;
 const add=(owner,name,session,days)=>insert.run(String(++id),owner,name,session,null,'learn',new Date(Date.now()-days*86400000).toISOString());
 add('a','coding_session_started','first-a',24);add('a','coding_session_started','second-a',0);add('a','coding_session_completed','second-a',0);
 add('b','coding_session_started','first-b',8);add('b','coding_session_completed','first-b',8);add('b','coding_session_started','second-b',0);
 add('c','coding_session_started','first-c',0);add('c','coding_session_started','expired-c',31);
 let result;metrics({}, {json(value){result=value;}});
 assert.equal(result.firstSessions.started,3);assert.equal(result.firstSessions.completed,1);
 assert.equal(result.returnUse.observedStudents,3);assert.equal(result.returnUse.studentsOnMultipleDays,2);assert.equal(result.repeatWeekly.studentsInMultipleWeeks,2);
 assert.equal(result.weekly.reduce((n,w)=>n+w.students,0),5);assert.match(result.limitations,/neither unprompted return nor willingness to pay/);
 db.close();
});
module.exports={fixture};
