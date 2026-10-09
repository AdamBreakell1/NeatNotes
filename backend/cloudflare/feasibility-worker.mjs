// Local compatibility spike. No real app data, provider configuration or email.
import { DurableObject } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import { createServer } from "node:http";
import { scryptSync } from "node:crypto";
import express from "express";
import { createDurableDatabase } from "./durable-sqlite-adapter.mjs";

export class CompatibilityProbe extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.db = createDurableDatabase(ctx.storage);
    if (env.SYNTHETIC_APP_SCHEMA) this.db.exec(env.SYNTHETIC_APP_SCHEMA);
    this.db.exec(`CREATE TABLE IF NOT EXISTS synthetic_probe(id TEXT PRIMARY KEY, value INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS synthetic_probe_value ON synthetic_probe(value);
      CREATE TABLE IF NOT EXISTS synthetic_parent(id INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS synthetic_child(id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES synthetic_parent(id));`);
    const app = express();
    app.use(express.json());
    app.get("/probe", (req, res) => {
      const hash = scryptSync("synthetic-password", "synthetic-fixed-salt", 64).toString("hex");
      let rolledBack = false;
      try {
        this.db.transactionSync(() => {
          this.db.prepare("INSERT OR REPLACE INTO synthetic_probe VALUES (?, ?)").run("rollback", 10);
          throw new Error("Synthetic rollback fixture");
        });
      } catch {
        rolledBack = this.db.prepare("SELECT COUNT(*) AS n FROM synthetic_probe WHERE id=?").get("rollback").n === 0;
      }
      const runResult = this.db.prepare("INSERT INTO synthetic_probe VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value=value+1").run("persisted", 1);
      const result = this.db.prepare("SELECT * FROM synthetic_probe WHERE id=?").get("persisted");
      const boundValues = this.db.prepare("SELECT ? AS nullable, ? AS text, ? AS number").get(null, "synthetic", 37);
      const getMissing = this.db.prepare("SELECT * FROM synthetic_probe WHERE id=?").get("missing") === undefined;
      let invalidBindingRejected = false;
      try { this.db.prepare("SELECT ? AS undefined_value").get(undefined); }
      catch { invalidBindingRejected = true; }
      let foreignKeyEnforced = false;
      try { this.db.prepare("INSERT INTO synthetic_child VALUES(?,?)").run(1, 999); }
      catch { foreignKeyEnforced = true; }
      const spreadBindings = this.db.prepare("SELECT ? AS first_value, ? AS second_value").get(...["first", "second"]);
      let asyncTransactionRejected = false;
      try {
        this.db.transactionSync(() => {
          this.db.prepare("INSERT OR REPLACE INTO synthetic_probe VALUES (?, ?)").run("async-rollback", 20);
          return Promise.resolve("invalid");
        });
      } catch {
        asyncTransactionRejected = this.db.prepare("SELECT * FROM synthetic_probe WHERE id=?").get("async-rollback") === undefined;
      }
      const pragmas = {};
      for (const name of ["foreign_keys", "table_info(synthetic_probe)", "journal_mode"]) {
        try { pragmas[name] = this.db.prepare("PRAGMA " + name).all(); }
        catch (error) { pragmas[name] = { error: error.message }; }
      }
      const tableCount = this.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE '__cf_%'").get().n;
      res.json({ express: true, method: req.method, hash, rolledBack, result, runResult, boundValues, getMissing, invalidBindingRejected, foreignKeyEnforced, spreadBindings, asyncTransactionRejected, tableCount, pragmas });
    });
    app.post("/probe", (req, res) => res.status(201).json({ body: req.body }));
    this.handler = httpServerHandler(createServer(app));
  }
  fetch(request) {
    return this.handler.fetch(request);
  }
}

export default {
  fetch(request, env) {
    return env.PROBE.getByName("synthetic-feasibility-only").fetch(request);
  },
};
