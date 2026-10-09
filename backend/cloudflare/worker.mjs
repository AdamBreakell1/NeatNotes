import { DurableObject } from "cloudflare:workers";
import { httpServerHandler } from "cloudflare:node";
import { createServer } from "node:http";
import { createApplication } from "../../server.js";
import { createDurableDatabase } from "./durable-sqlite-adapter.mjs";
import { createDataTransfer } from "./data-transfer.mjs";

const OBJECT_NAME = "recallstride-production";
const dynamicPath = (path) => path.startsWith("/api/") || path.startsWith("/ocr-h446/")
  || ["/revision-topics.js", "/robots.txt", "/sitemap.xml"].includes(path);

// One managed database preserves cross-workspace relationships and Stripe event
// idempotency. Static files bypass it. This does not claim horizontal DB sharding.
export class RecallStrideDatabase extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.db = createDurableDatabase(ctx.storage);
    this.runtime = null;
    this.handler = null;
    this.transfer = createDataTransfer(this.db);
  }

  initialize(origin) {
    if (this.runtime) return;
    const environment = {
      ...this.env,
      NODE_ENV: this.env.NODE_ENV || "production",
      BASE_URL: this.env.BASE_URL || origin,
      CORS_ORIGIN: this.env.CORS_ORIGIN || this.env.BASE_URL || origin,
      ALLOW_MOCK_BILLING: this.env.ALLOW_MOCK_BILLING || "false",
      MIGRATION_MODE: this.env.MIGRATION_MODE === "true" || ["importing", "failed"].includes(this.transfer.importStatus().status) ? "true" : "false",
    };
    this.runtime = createApplication({
      db: this.db, environment, staticAssets: false,
      runtime: { scheduleCleanup: false, persistentRateLimits: true, waitUntil: (promise) => this.ctx.waitUntil(promise) },
    });
    this.handler = httpServerHandler(createServer(this.runtime.app));
  }

  async fetch(request) {
    this.initialize(new URL(request.url).origin);
    const importState = this.transfer.importStatus();
    if (this.env.MIGRATION_MODE === "true" || ["importing", "failed"].includes(importState.status)) {
      return Response.json({ error: "RecallStride is moving its database. Please try again shortly." }, {
        status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      });
    }
    // Durable alarms replace process timers, allowing an idle database to sleep.
    const interval = this.runtime.configuration.contactRetryIntervalMs;
    if (interval > 0 && await this.ctx.storage.getAlarm() === null) {
      await this.ctx.storage.setAlarm(Date.now() + Math.max(60_000, interval));
    }
    return this.handler.fetch(request);
  }

  async alarm() {
    // BASE_URL is required for background jobs. Public requests can infer the
    // Workers origin before a branded domain is configured.
    if (!this.env.BASE_URL) return;
    this.initialize(this.env.BASE_URL);
    if (this.env.MIGRATION_MODE === "true" || ["importing", "failed"].includes(this.transfer.importStatus().status)) return;
    await this.runtime.retryQueuedContactEnquiries();
    const interval = this.runtime.configuration.contactRetryIntervalMs;
    if (interval > 0) await this.ctx.storage.setAlarm(Date.now() + Math.max(60_000, interval));
  }

  migration() {
    if (this.env.MIGRATION_MODE !== "true" || !this.env.BASE_URL) {
      throw new Error("Data transfer requires MIGRATION_MODE=true and the canonical BASE_URL.");
    }
    this.initialize(this.env.BASE_URL);
    return this.transfer;
  }

  // Accessible only through a bound Worker in this Cloudflare account. The
  // separate temporary transfer service authenticates its operator with a secret.
  beginImport(manifest) { return this.migration().beginImport(manifest); }
  appendImport(chunk) { return this.migration().appendImport(chunk); }
  finishImport() { return this.migration().finishImport(); }
  importStatus() { return this.migration().importStatus(); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__migration/")) {
      // Migration RPC is deliberately not exposed by the public application.
      return new Response("Not found", { status: 404 });
    }
    if (!dynamicPath(url.pathname)) return env.ASSETS.fetch(request);
    const headers = new Headers(request.headers);
    headers.delete("Forwarded");
    headers.delete("X-Forwarded-For");
    headers.delete("X-Forwarded-Host");
    headers.set("X-Forwarded-Proto", url.protocol.slice(0, -1));
    const clientIp = request.headers.get("CF-Connecting-IP");
    if (clientIp) headers.set("X-Forwarded-For", clientIp);
    return env.RECALLSTRIDE_DB.getByName(OBJECT_NAME, { locationHint: "weur" })
      .fetch(new Request(request, { headers }));
  },
};
