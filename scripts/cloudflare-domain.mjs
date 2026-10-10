import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CUSTOM_ORIGIN, LEGACY_ORIGIN } from "../backend/cloudflare/domain-routing.mjs";

export function configuredOrigin(config) {
  const origin = config.vars?.BASE_URL ?? LEGACY_ORIGIN;
  assert.ok([LEGACY_ORIGIN, CUSTOM_ORIGIN].includes(origin), "Unexpected production origin.");
  if (config.vars?.CORS_ORIGIN !== undefined) assert.equal(config.vars.CORS_ORIGIN, origin, "BASE_URL and CORS_ORIGIN must match.");
  if (origin === CUSTOM_ORIGIN) {
    for (const hostname of ["recallstride.com", "www.recallstride.com"]) {
      assert.ok(config.routes?.some((route) => route.pattern === hostname && route.custom_domain === true), `Missing ${hostname} Custom Domain.`);
    }
    assert.equal(config.assets?.run_worker_first, true, "Canonical redirects need the Worker before static assets.");
  }
  return origin;
}

export function prepareDomainConfiguration(config, zone) {
  assert.equal(config.name, "recallstride", "Only the existing RecallStride Worker can be configured.");
  assert.equal(zone?.name, "recallstride.com", "Verify ownership of the RecallStride.com Cloudflare zone first.");
  assert.equal(zone.status, "active", "The domain's Cloudflare zone must be active before switching the application origin.");
  assert.ok(typeof zone.id === "string" && /^[a-f0-9]{32}$/.test(zone.id), "A verified Cloudflare zone ID is required.");
  const prepared = structuredClone(config);
  prepared.vars = { ...prepared.vars, BASE_URL: CUSTOM_ORIGIN, CORS_ORIGIN: CUSTOM_ORIGIN };
  const otherRoutes = (prepared.routes ?? []).filter((route) => !["recallstride.com", "www.recallstride.com"].includes(route.pattern));
  prepared.routes = [...otherRoutes, ...["recallstride.com", "www.recallstride.com"].map((pattern) => ({ pattern, custom_domain: true, zone_id: zone.id }))];
  prepared.assets.run_worker_first = true;
  configuredOrigin(prepared);
  return prepared;
}

// Local configuration only; deployment is a separate reviewed commit. Input is
// an API/dashboard-confirmed zone record, never a claimed or unowned hostname.
export function main(args = process.argv.slice(2)) {
  const options = new Map();
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(["--zone-file", "--config"].includes(args[i]) && args[i + 1], "Use --zone-file <verified-zone.json> [--config wrangler.jsonc].");
    options.set(args[i], args[i + 1]);
  }
  assert.ok(options.has("--zone-file"), "Provide the verified active Cloudflare zone record with --zone-file.");
  const configPath = path.resolve(options.get("--config") || "wrangler.jsonc");
  const zone = JSON.parse(fs.readFileSync(path.resolve(options.get("--zone-file")), "utf8"));
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const prepared = prepareDomainConfiguration(config, zone);
  if (JSON.stringify(config) === JSON.stringify(prepared)) {
    console.log("RecallStride.com configuration is already prepared.");
    return;
  }
  fs.writeFileSync(configPath, JSON.stringify(prepared, null, 2) + "\n");
  console.log("Prepared RecallStride.com and www Custom Domains, canonical links and account/billing return URLs. Commit and deploy after domain ownership and HTTPS are confirmed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
