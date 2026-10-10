// Isolated remote fixture only; it never binds the production namespace.
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { RecallStrideDatabase } from "./worker.mjs";
import { RECOVERY_RESTART_MESSAGE } from "./recovery.mjs";

export class RecallStrideRecoveryRehearsal extends RecallStrideDatabase {
  seed() {
    this.initialize(this.env.BASE_URL);
    if (this.db.prepare("SELECT COUNT(*) AS n FROM users WHERE id='rehearsal-student'").get().n) return this.inspect();
    const now = new Date().toISOString();
    this.db.transactionSync(() => {
    this.db.prepare(`INSERT INTO users(id,email,name,password_hash,password_salt,email_verified,plan,plan_status,created_at,updated_at)
      VALUES('rehearsal-student','recovery-student@example.test','Synthetic recovery student',?,'recovery-fixture-salt',1,'pro','active',?,?)`)
      .run(scryptSync("RecoveryFixturePass123", "recovery-fixture-salt", 64).toString("hex"), now, now);
    this.db.prepare("INSERT INTO workspaces(id,name,owner_id,kind,created_at,updated_at) VALUES('rehearsal-workspace','Synthetic workspace','rehearsal-student','personal',?,?)").run(now, now);
    this.db.prepare("INSERT INTO workspace_members VALUES('rehearsal-workspace','rehearsal-student','owner',?)").run(now);
    this.db.prepare("INSERT INTO notes(id,workspace_id,owner_id,body,tag,title,summary,created_at,updated_at) VALUES('rehearsal-note','rehearsal-workspace','rehearsal-student',?,'fixture','Recovery fixture','Synthetic',?,?)")
      .run("Synthetic Unicode note 🧠\nSelection and iteration.", now, now);
    this.db.exec("CREATE TABLE recovery_binary_fixture(id TEXT PRIMARY KEY, value BLOB NOT NULL)");
    this.db.prepare("INSERT INTO recovery_binary_fixture VALUES('fixture', ?)").run(new Uint8Array([0, 1, 127, 128, 255]));
    });
    return this.inspect();
  }

  inspect() {
    this.initialize(this.env.BASE_URL);
    const user = this.db.prepare("SELECT id,email,password_hash,password_salt,plan FROM users WHERE id='rehearsal-student'").get();
    const notes = this.db.prepare("SELECT id,workspace_id,owner_id,body FROM notes WHERE id='rehearsal-note'").all();
    const bytes = [...new Uint8Array(this.db.prepare("SELECT value FROM recovery_binary_fixture WHERE id='fixture'").get().value)];
    const snapshot = { user, notes, bytes };
    return { sha256: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
      users: this.db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      notes: notes.length, plan: user.plan, foreignKeyErrors: this.db.prepare("PRAGMA foreign_key_check").all().length,
      databaseTables: this.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n };
  }

  damage() {
    this.initialize(this.env.BASE_URL);
    this.db.prepare("UPDATE users SET plan='free', password_hash='synthetically-corrupted' WHERE id='rehearsal-student'").run();
    this.db.prepare("UPDATE notes SET body='Synthetic damaged note' WHERE id='rehearsal-note'").run();
    this.db.prepare("UPDATE recovery_binary_fixture SET value=? WHERE id='fixture'").run(new Uint8Array([42]));
    return this.inspect();
  }
}

export default {
  async fetch(request, env) {
    const secret = String(env.RECOVERY_SECRET || "");
    const supplied = Buffer.from(request.headers.get("Authorization") || "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new Response("Not found", { status: 404 });
    if (!env.REHEARSAL_DB) return new Response("Rehearsal finished", { status: 410 });
    const database = env.REHEARSAL_DB.getByName("isolated-synthetic-recovery-rehearsal");
    const endpoint = new URL(request.url).pathname;
    const input = request.method === "POST" ? await request.json() : {};
    try {
      if (endpoint === "/seed" && request.method === "POST") return Response.json(await database.seed());
      if (endpoint === "/inspect" && request.method === "GET") return Response.json(await database.inspect());
      if (endpoint === "/damage" && request.method === "POST") return Response.json(await database.damage());
      if (endpoint === "/status" && request.method === "GET") return Response.json(await database.recoveryInfo());
      if (endpoint === "/bookmark" && request.method === "POST") return Response.json(await database.recoveryBookmarkForTime(input));
      if (endpoint === "/prepare" && request.method === "POST") return Response.json(await database.prepareRecovery(input));
      if (endpoint === "/restart" && request.method === "POST") {
        try { await database.restartRecovery(input); }
        catch (error) { if (!String(error.message).includes(RECOVERY_RESTART_MESSAGE)) throw error; }
        return Response.json({ status: "restart_requested" }, { status: 202 });
      }
      return new Response("Not found", { status: 404 });
    } catch (error) { return Response.json({ error: String(error.message).slice(0, 240) }, { status: 409 }); }
  },
};
