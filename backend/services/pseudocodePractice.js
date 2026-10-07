"use strict";
const crypto = require("node:crypto");
const { TASKS } = require("./pseudocodeTasks");
const { VERSION } = require("../../pseudocode-engine");
const RELEASES = require("../../pseudocode-review.json");
const RETENTION_MS = 30 * 86400000;
const digest = (task) => crypto.createHash('sha256').update(JSON.stringify(task)).digest('hex');
function isReviewed(task, releases = RELEASES) {
  return releases.some((r) => r.taskId === task.id && r.version === task.version && r.sha256 === digest(task) && r.status === 'approved' && typeof r.reviewer === 'string' && r.reviewer.trim() && typeof r.reviewedAt === 'string' && Number.isFinite(Date.parse(r.reviewedAt)));
}
function canPreview(environment = process.env) { return environment.NODE_ENV !== "production" && environment.RECALLSTRIDE_CODING_PREVIEW === "true"; }
function publicTask(task) { const { solutions, mutations, ...publicData } = task; return { ...publicData, reviewStatus: isReviewed(task) ? "reviewed" : "draft", evaluation: "local", numericalScore: null }; }
function normaliseAttempt(body, task) {
  const allowed = ['id','taskId','taskVersion','interpreterVersion','mode','assistance','outcomes','firstCheck'];
  if (!body || Object.keys(body).some((key) => !allowed.includes(key))) throw new Error("Only local attempt metadata is accepted; source, scores and personal text are not accepted.");
  if (typeof body.id !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(body.id)) throw new Error("Use a stable attempt ID for retries.");
  if (body.taskId !== task.id || body.taskVersion !== task.version || body.interpreterVersion !== VERSION) throw new Error("This task or interpreter version has changed. Reload before checking.");
  if (!['learn','independent'].includes(body.mode) || typeof body.firstCheck !== 'boolean') throw new Error("Invalid attempt mode.");
  const assistance = body.assistance;
  if (!assistance || Object.keys(assistance).some((key) => !['runs','hints','solution','checks'].includes(key)) ||
    !['runs','hints','checks'].every((key) => Number.isInteger(assistance[key]) && assistance[key] >= 0 && assistance[key] <= 10000) || typeof assistance.solution !== 'boolean') throw new Error("Invalid assistance metadata.");
  if (!Array.isArray(body.outcomes) || body.outcomes.length !== task.cases.length) throw new Error("Include one outcome for each public case.");
  const outcomes = task.cases.map((c) => {
    const matches = body.outcomes.filter((item) => item && item.id === c.id);
    if (matches.length !== 1 || Object.keys(matches[0]).some((key) => !['id','outcome'].includes(key)) || !['passed','failed','diagnostic'].includes(matches[0].outcome)) throw new Error("Invalid case outcomes.");
    return { id: c.id, outcome: matches[0].outcome };
  });
  return { id: body.id, taskId: task.id, taskVersion: task.version, interpreterVersion: VERSION, mode: body.mode,
    firstCheck: body.firstCheck, assistance: { runs: assistance.runs, hints: assistance.hints, solution: assistance.solution, checks: assistance.checks }, outcomes,
    evaluation: 'local', trusted: false, masteryEligible: false };
}
function createPracticeStore(db, now = () => Date.now()) {
  db.exec(`CREATE TABLE IF NOT EXISTS coding_practice_attempts (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id TEXT NOT NULL, request_hash TEXT NOT NULL, record_json TEXT NOT NULL,
    created_at TEXT NOT NULL, PRIMARY KEY(user_id, attempt_id)
  ); CREATE INDEX IF NOT EXISTS coding_practice_expiry ON coding_practice_attempts(created_at);`);
  const prune = () => db.prepare("DELETE FROM coding_practice_attempts WHERE created_at < ?").run(new Date(now() - RETENTION_MS).toISOString());
  return {
    prune,
    save(owner, value, task) {
      prune(); const canonical = JSON.stringify(normaliseAttempt(value, task)); const hash = crypto.createHash('sha256').update(canonical).digest('hex');
      const existing = db.prepare("SELECT request_hash, record_json FROM coding_practice_attempts WHERE user_id=? AND attempt_id=?").get(owner, value.id);
      if (existing) {
        if (existing.request_hash !== hash) return { conflict: true };
        return { duplicate: true, record: JSON.parse(existing.record_json) };
      }
      const createdAt = new Date(now()).toISOString();
      const record = { ...JSON.parse(canonical), createdAt, revisit: { taskId: task.transferId, dueAt: new Date(now() + 3 * 86400000).toISOString(), basis: 'Suggested fresh practice after three days; not a mastery judgement' } };
      if (db.prepare("SELECT COUNT(*) AS n FROM coding_practice_attempts WHERE user_id=?").get(owner).n >= 500) return { full: true };
      db.prepare("INSERT INTO coding_practice_attempts(user_id,attempt_id,request_hash,record_json,created_at) VALUES(?,?,?,?,?)").run(owner,value.id,hash,JSON.stringify(record),createdAt);
      return { duplicate: false, record };
    },
    list(owner) { prune(); return db.prepare("SELECT record_json FROM coding_practice_attempts WHERE user_id=? ORDER BY created_at DESC").all(owner).map((r) => JSON.parse(r.record_json)); },
    clear(owner) { db.prepare("DELETE FROM coding_practice_attempts WHERE user_id=?").run(owner); },
  };
}
function registerPracticeRoutes(app, { db, requireUser, rateLimit, canAccess }) {
  const store = createPracticeStore(db); store.prune(); const cleanup = setInterval(() => store.prune(), 86400000); cleanup.unref();
  function available(task) { return Boolean(task && (isReviewed(task) || canPreview())); }
  function gate(req, res, next) {
    const task = TASKS.find((item) => item.id === req.params.id);
    if (!available(task)) return res.status(404).json({ error: "This coding task is withdrawn or awaiting academic review. Your local draft can still be exported." });
    if (!canAccess(req.user, task.topicId)) return res.status(402).json({ error: "This task belongs to another deck. Free includes coding practice in your selected deck; Pro expands access to reviewed tasks in other decks." });
    req.codingTask = task; next();
  }
  app.get('/api/coding/tasks', requireUser, (req,res) => {
    const availableTasks = TASKS.filter(available);
    res.json({ interpreterVersion: VERSION, preview: canPreview(), evaluation: 'local', tasks: availableTasks.filter((t) => canAccess(req.user,t.topicId)).map(publicTask),
      locked: availableTasks.filter((t) => !canAccess(req.user,t.topicId)).map((t) => ({ id:t.id,title:t.title,topicId:t.topicId,reviewStatus:isReviewed(t)?'reviewed':'draft' })),
      notice: availableTasks.length ? 'Local practice only. Public tests and a self-review checklist; no OCR marks or verified mastery.' : 'Coding tasks are being prepared for independent academic review. No draft bank is published.' });
  });
  app.get('/api/coding/tasks/:id',requireUser,gate,(req,res) => res.json({task:publicTask(req.codingTask)}));
  app.get('/api/coding/tasks/:id/solution',requireUser,gate,(req,res) => res.json({version:req.codingTask.version,solution:req.codingTask.solutions[0],notice:'One possible solution, not the only correct algorithm. Its use is recorded as assistance.'}));
  app.get('/api/coding/attempts',requireUser,(req,res) => res.json({ attempts:store.list(req.user.id), evaluation:'local' }));
  app.delete('/api/coding/attempts',requireUser,(req,res) => {store.clear(req.user.id);res.json({deleted:true});});
  app.post('/api/coding/tasks/:id/attempts',requireUser,rateLimit,gate,(req,res) => {
    let value; try { value=store.save(req.user.id,req.body,req.codingTask); } catch(error) { return res.status(400).json({error:error.message}); }
    if (value.conflict) return res.status(409).json({error:'This attempt ID was already used with different metadata. The original record was preserved.'});
    if (value.full) return res.status(429).json({error:'Your 30-day coding history is full (500 attempts). Export or clear it before saving more.'});
    res.status(value.duplicate?200:201).json(value);
  });
  return store;
}
module.exports = { digest, isReviewed, canPreview, publicTask, normaliseAttempt, createPracticeStore, registerPracticeRoutes, RETENTION_MS };
