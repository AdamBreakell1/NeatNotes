"use strict";
const crypto=require('node:crypto');
const {TASKS}=require('./pseudocodeTasks');
const NAMES=new Set(['coding_session_started','coding_task_opened','coding_run','coding_check','coding_hint','coding_solution','coding_session_completed']);
function validateEvent(value){
 if(!value||Object.keys(value).some(k=>!['id','name','sessionId','taskId','mode'].includes(k)))return null;
 if(!NAMES.has(value.name)||!['id','sessionId'].every(k=>typeof value[k]==='string'&&/^[a-zA-Z0-9_-]{16,80}$/.test(value[k]))||!['learn','independent'].includes(value.mode))return null;
 if(value.taskId!==null&&!TASKS.some(t=>t.id===value.taskId))return null;
 return {id:value.id,name:value.name,sessionId:value.sessionId,taskId:value.taskId,mode:value.mode};
}
function registerPilotRoutes(app,{db,requireUser,requireAdmin,rateLimit,consented}){
 db.exec(`CREATE TABLE IF NOT EXISTS pilot_events(id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,event_name TEXT NOT NULL,session_id TEXT NOT NULL,task_id TEXT,mode TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,id)); CREATE INDEX IF NOT EXISTS pilot_event_time ON pilot_events(created_at);`);
 const prune=()=>db.prepare("DELETE FROM pilot_events WHERE created_at < ?").run(new Date(Date.now()-30*86400000).toISOString());prune();const timer=setInterval(prune,86400000);timer.unref();
 app.post('/api/pilot/events',requireUser,rateLimit,(req,res)=>{
  const value=validateEvent(req.body);if(!value)return res.status(400).json({error:'Only defined event names, IDs and mode are accepted. No source or personal text.'});
  if(!consented(req.user.id))return res.status(204).end();
  const id=crypto.createHash('sha256').update(['coding_session_started','coding_session_completed'].includes(value.name)?`${value.name}:${value.sessionId}`:value.id).digest('hex');
  prune();if(db.prepare('SELECT COUNT(*) AS n FROM pilot_events WHERE user_id=?').get(req.user.id).n>=2000)return res.status(429).json({error:'Pilot event history is full for this 30-day window.'});
  db.prepare('INSERT OR IGNORE INTO pilot_events(id,user_id,event_name,session_id,task_id,mode,created_at) VALUES(?,?,?,?,?,?,?)').run(id,req.user.id,value.name,value.sessionId,value.taskId,value.mode,new Date().toISOString());
  res.status(202).json({accepted:true});
 });
 app.get('/api/internal/pilot-metrics',requireUser,requireAdmin,(req,res)=>{
  prune();const aggregate=db.prepare('SELECT event_name AS name,COUNT(*) AS events,COUNT(DISTINCT user_id) AS students FROM pilot_events GROUP BY event_name').all();
  const firstSessions=db.prepare(`WITH starts AS (SELECT user_id,session_id,created_at,ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at,id) AS rn FROM pilot_events WHERE event_name='coding_session_started') SELECT COUNT(*) AS started,SUM(CASE WHEN EXISTS(SELECT 1 FROM pilot_events e WHERE e.user_id=s.user_id AND e.session_id=s.session_id AND e.event_name='coding_session_completed') THEN 1 ELSE 0 END) AS completed FROM starts s WHERE rn=1`).get();
  const returnUse=db.prepare(`WITH days AS (SELECT user_id,COUNT(DISTINCT substr(created_at,1,10)) AS days FROM pilot_events WHERE event_name='coding_session_started' GROUP BY user_id) SELECT COUNT(*) AS observedStudents,SUM(CASE WHEN days>=2 THEN 1 ELSE 0 END) AS studentsOnMultipleDays FROM days`).get();
  const weekly=db.prepare(`SELECT strftime('%Y-%W',created_at) AS week,COUNT(DISTINCT user_id) AS students FROM pilot_events WHERE event_name='coding_session_started' GROUP BY week`).all();
  const repeatWeekly=db.prepare(`WITH weeks AS (SELECT user_id,COUNT(DISTINCT strftime('%Y-%W',created_at)) AS weeks FROM pilot_events WHERE event_name='coding_session_started' GROUP BY user_id) SELECT SUM(CASE WHEN weeks>=2 THEN 1 ELSE 0 END) AS studentsInMultipleWeeks FROM weeks`).get();
  res.json({windowDays:30,aggregate,firstSessions,returnUse,weekly,repeatWeekly,limitations:'Opt-in client-reported coding usage only; neither unprompted return nor willingness to pay can be inferred. Events are not mastery evidence. Missing consent is missing data, not non-use.'});
 });
 return {export(owner){prune();return db.prepare('SELECT event_name,session_id,task_id,mode,created_at FROM pilot_events WHERE user_id=? ORDER BY created_at').all(owner);}};
}
module.exports={validateEvent,registerPilotRoutes};
