// Local compatibility spike. No real app data, provider configuration or email.
import { DurableObject } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import { createServer } from "node:http";
import { scryptSync } from "node:crypto";
import express from "express";
import { createDurableDatabase } from "./durable-sqlite-adapter.mjs";
import { createCheckoutContract, createSubscriptionConfirmations } from "../services/subscriptionConfirmation.js";

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
    // This synthetic-only route exercises the actual durable contract/outbox
    // service against workerd SQLite, never Stripe or a network mail transport.
    const contractConfig = { configured: true, version: "2026-10-10", operatorName: "Synthetic Operator", tradingName: "Synthetic Systems",
      postalAddress: "1 Fixture Street, Example City", supportEmail: "support@fixture.test", website: "https://recallstride.fixture.test" };
    const syntheticUser = { id: "synthetic-confirmation-owner", name: "Synthetic Student", email: "student@fixture.test" };
    const session = { id: "cs_workerd_confirmation", amount_total: 399, currency: "gbp" };
    const sent = [];
    let rejectMail = true;
    const confirmations = createSubscriptionConfirmations({ db: this.db, sendMessage: async message => {
      sent.push(message);
      if (rejectMail) throw Object.assign(new Error("Synthetic mail failure"), { code: "ETIMEDOUT" });
    } });
    const confirmationState = () => ({
      contract: confirmations.export(syntheticUser.id).checkoutContracts[0]?.contract,
      queue: this.db.prepare("SELECT status,attempts,last_error_code,created_at,next_attempt_at FROM subscription_confirmation_queue WHERE checkout_session_id=?").get(session.id),
      contracts: this.db.prepare("SELECT count(*) AS n FROM billing_checkout_contracts").get().n,
      confirmations: this.db.prepare("SELECT count(*) AS n FROM subscription_confirmation_queue").get().n,
      sent: sent.length, stableMessageId: sent.length < 2 || sent[0].messageId === sent[1].messageId,
    });
    app.get("/confirmation/probe", (req, res) => res.json(confirmationState()));
    app.post("/confirmation/probe", async (req, res) => {
      if (req.body.action === "seed") {
        const date = new Date().toISOString();
        this.db.prepare("INSERT INTO users(id,email,name,created_at,updated_at) VALUES(?,?,?,?,?)").run(syntheticUser.id, syntheticUser.email, syntheticUser.name, date, date);
        const contract = createCheckoutContract(contractConfig);
        this.db.transactionSync(() => {
          confirmations.recordCheckout(session.id, syntheticUser.id, contract);
          confirmations.recordCheckout(session.id, syntheticUser.id, contract);
          confirmations.enqueue({ user: syntheticUser, session, currentConfig: contractConfig });
          confirmations.enqueue({ user: syntheticUser, session, currentConfig: contractConfig });
        });
        let rollbackVerified = false;
        try {
          this.db.transactionSync(() => {
            confirmations.recordCheckout("cs_workerd_rollback", syntheticUser.id, contract);
            confirmations.enqueue({ user: syntheticUser, session: { ...session, id: "cs_workerd_rollback" }, currentConfig: contractConfig });
            this.db.prepare("UPDATE users SET name='Must rollback' WHERE id=?").run(syntheticUser.id);
            throw new Error("Synthetic durable confirmation rollback");
          });
        } catch {
          rollbackVerified = !confirmations.contract("cs_workerd_rollback") && !confirmations.completed("cs_workerd_rollback")
            && this.db.prepare("SELECT name FROM users WHERE id=?").get(syntheticUser.id).name === syntheticUser.name;
        }
        await confirmations.retry();
        return res.json({ ...confirmationState(), rollbackVerified });
      }
      if (req.body.action === "deliver") {
        rejectMail = false;
        this.db.prepare("UPDATE subscription_confirmation_queue SET next_attempt_at=? WHERE checkout_session_id=?").run(new Date(Date.now() - 1000).toISOString(), session.id);
        await confirmations.retry(); await confirmations.retry();
        return res.json({ ...confirmationState(), attachmentCount: sent.at(-1)?.attachments.length });
      }
      if (req.body.action === "erase") {
        this.db.prepare("DELETE FROM users WHERE id=?").run(syntheticUser.id);
        return res.json(confirmationState());
      }
      return res.status(400).json({ error: "Unknown synthetic action" });
    });
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
