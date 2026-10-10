import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { configuredOrigin, prepareDomainConfiguration } from "./cloudflare-domain.mjs";
import { canonicalRedirect, CUSTOM_ORIGIN, LEGACY_ORIGIN } from "../backend/cloudflare/domain-routing.mjs";
import { confirmPreservedDeployment, deploymentState } from "./deploy-cloudflare-ci.mjs";

const loadedConfig = JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const config = { ...loadedConfig, routes: undefined,
  vars: { ...loadedConfig.vars, BASE_URL: LEGACY_ORIGIN, CORS_ORIGIN: LEGACY_ORIGIN } };
const zone = { id: "a".repeat(32), name: "recallstride.com", status: "active" };

test("owned active zone preparation is idempotent and preserves database, secrets configuration and Worker identity", () => {
  const prepared = prepareDomainConfiguration(config, zone);
  assert.deepEqual(prepareDomainConfiguration(prepared, zone), prepared);
  assert.equal(configuredOrigin(prepared), CUSTOM_ORIGIN);
  assert.equal(prepared.name, config.name);
  assert.deepEqual(prepared.durable_objects, config.durable_objects);
  assert.deepEqual(prepared.migrations, config.migrations);
  assert.equal(prepared.keep_vars, true);
  assert.equal(prepared.workers_dev, true);
  assert.equal(configuredOrigin(config), LEGACY_ORIGIN, "The unowned domain must not become live during preparation.");
});

test("unknown, inactive and mismatched origins refuse preparation", () => {
  assert.throws(() => prepareDomainConfiguration(config, { ...zone, name: "unowned.example" }), /ownership/);
  assert.throws(() => prepareDomainConfiguration(config, { ...zone, status: "pending" }), /active/);
  assert.throws(() => configuredOrigin({ vars: { BASE_URL: "https://unowned.example" } }), /Unexpected/);
  assert.throws(() => configuredOrigin({ ...config, vars: { BASE_URL: CUSTOM_ORIGIN } }), /Custom Domain/);
  assert.throws(() => configuredOrigin({ vars: { BASE_URL: LEGACY_ORIGIN, CORS_ORIGIN: CUSTOM_ORIGIN } }), /must match/);
});

test("canonical redirects preserve paths and verification/reset queries only after domain activation", () => {
  for (const origin of [LEGACY_ORIGIN, "https://www.recallstride.com"]) {
    const request = new Request(`${origin}/api/auth/verify?token=synthetic-token`);
    assert.equal(canonicalRedirect(request, { BASE_URL: LEGACY_ORIGIN }), null);
    const redirect = canonicalRedirect(request, { BASE_URL: CUSTOM_ORIGIN });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get("Location"), `${CUSTOM_ORIGIN}/api/auth/verify?token=synthetic-token`);
    assert.equal(canonicalRedirect(new Request(`${origin}/api/billing/stripe/webhook`, { method: "POST" }), { BASE_URL: CUSTOM_ORIGIN }), null);
  }
  assert.equal(canonicalRedirect(new Request(CUSTOM_ORIGIN), { BASE_URL: CUSTOM_ORIGIN }), null);
  assert.equal(canonicalRedirect(new Request("https://preview.example"), { BASE_URL: CUSTOM_ORIGIN }), null);
});

test("future GitHub deployments validate the configured custom origin without replacing its database", () => {
  const settings = { bindings: [
    { name: "RECALLSTRIDE_DB", type: "durable_object_namespace", namespace_id: "existing-production" },
    { name: "BASE_URL", type: "plain_text", text: CUSTOM_ORIGIN },
    { name: "CORS_ORIGIN", type: "plain_text", text: CUSTOM_ORIGIN },
  ] };
  assert.equal(deploymentState(settings, CUSTOM_ORIGIN).origin, CUSTOM_ORIGIN);
  assert.throws(() => deploymentState(settings), /BASE_URL/);
  const custom = { ...deploymentState(settings, CUSTOM_ORIGIN), release: "a".repeat(40) };
  const legacy = { ...custom, origin: LEGACY_ORIGIN };
  assert.throws(() => confirmPreservedDeployment(legacy, custom, custom.release), /origin/);
  confirmPreservedDeployment(legacy, custom, custom.release, CUSTOM_ORIGIN);
});
