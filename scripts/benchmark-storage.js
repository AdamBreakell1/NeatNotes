"use strict";
// Isolated metadata fixtures only. Never opens the application database or .env.
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { TASKS } = require("../backend/services/pseudocodeTasks");
const { createPracticeStore } = require("../backend/services/pseudocodePractice");
const { registerPilotRoutes, validateEvent } = require("../backend/services/pilotTelemetry");
const { VERSION } = require("../pseudocode-engine");
const root = path.resolve(__dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-storage-"));
const database = path.join(temporary, "synthetic.sqlite");
let db;
try {
  db = new DatabaseSync(database);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE users(id TEXT PRIMARY KEY)");
  const store = createPracticeStore(db);
  registerPilotRoutes({ post() {}, get() {} }, { db });
  for (let student = 0; student < 30; student++) db.prepare("INSERT INTO users VALUES(?)").run(`fixture-${student}`);
  const snapshot = () => {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    return { bytes: fs.statSync(database).size, pages: db.prepare("PRAGMA page_count").get().page_count, pageSize: db.prepare("PRAGMA page_size").get().page_size };
  };
  const baseline = snapshot();
  let attemptJsonBytes = 0;
  const started = process.hrtime.bigint();
  db.exec("BEGIN");
  for (let student = 0; student < 30; student++) for (let check = 0; check < 40; check++) {
    const task = TASKS[check % TASKS.length];
    const value = { id: `attempt-${student}-${String(check).padStart(8, "0")}`, taskId: task.id, taskVersion: task.version, interpreterVersion: VERSION, mode: check % 2 ? "independent" : "learn", firstCheck: check === 0, assistance: { runs: 1, hints: 0, checks: check, solution: false }, outcomes: task.cases.map((c) => ({ id: c.id, outcome: "passed" })) };
    const saved = store.save(`fixture-${student}`, value, task);
    if (!saved.record) throw new Error("Fixture save failed");
    attemptJsonBytes += Buffer.byteLength(JSON.stringify(saved.record));
  }
  db.exec("COMMIT");
  const attempts = snapshot();
  const writeEvent = db.prepare("INSERT INTO pilot_events(id,user_id,event_name,session_id,task_id,mode,created_at) VALUES(?,?,?,?,?,?,?)");
  const names = ["coding_session_started", "coding_task_opened", "coding_run", "coding_check", "coding_session_completed"];
  db.exec("BEGIN");
  for (let student = 0; student < 30; student++) for (let number = 0; number < 100; number++) {
    const value = { id: `event-${student}-${String(number).padStart(10, "0")}`, name: names[number % names.length], sessionId: `session-${student}-${String(Math.floor(number / 5)).padStart(8, "0")}`, taskId: TASKS[number % TASKS.length].id, mode: "learn" };
    if (!validateEvent(value)) throw new Error("Invalid synthetic event");
    writeEvent.run(value.id, `fixture-${student}`, value.name, value.sessionId, value.taskId, value.mode, new Date().toISOString());
  }
  db.exec("COMMIT");
  const combined = snapshot();
  const result = {
    measuredAt: new Date().toISOString(), nodeVersion: process.version, sqliteVersion: db.prepare("SELECT sqlite_version() AS version").get().version,
    workload: { students: 30, attempts: 1200, events: 3000, sourceStored: false },
    baseline, afterAttempts: attempts, afterEvents: combined,
    incrementalBytes: { attempts: attempts.bytes - baseline.bytes, events: combined.bytes - attempts.bytes, total: combined.bytes - baseline.bytes },
    averageAttemptJsonBytes: Math.round(attemptJsonBytes / 1200), elapsedMilliseconds: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
    limitations: ["Synthetic account, attempt and enum event fixtures only; no real database or credentials read.", "WAL truncated at each measurement. File growth includes these tables/indexes and page slack; excludes other application data, backups and transient WAL growth.", "Batched local inserts are not request throughput, a production capacity test or a hosting invoice.", "No hosted student-code execution; CPU for Run/Check remains on the student's device."]
  };
  fs.writeFileSync(path.join(root, "docs/operational-storage-benchmark.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ workload: result.workload, incrementalBytes: result.incrementalBytes, averageAttemptJsonBytes: result.averageAttemptJsonBytes }));
} finally {
  if (db) db.close();
  fs.rmSync(temporary, { recursive: true, force: true });
}
