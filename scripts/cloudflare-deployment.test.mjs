import assert from "node:assert/strict";
import test from "node:test";
import { confirmHealth, confirmPreservedDeployment, deploymentState, productionOrigin } from "./deploy-cloudflare-ci.mjs";

const revision = "a".repeat(40);
const settings = (mode = "true") => ({ bindings: [
  { name: "RECALLSTRIDE_DB", type: "durable_object_namespace", class_name: "RecallStrideDatabase", namespace_id: "existing-database" },
  { name: "BASE_URL", type: "plain_text", text: productionOrigin },
  { name: "CORS_ORIGIN", type: "plain_text", text: productionOrigin },
  { name: "MIGRATION_MODE", type: "plain_text", text: mode },
  { name: "RELEASE_SHA", type: "plain_text", text: revision },
  { name: "SMTP_PASS", type: "secret_text" },
  { name: "STRIPE_SECRET_KEY", type: "secret_text" },
] });

test("deployment retains the existing database, closed state and provider secrets", () => {
  const before = deploymentState(settings());
  confirmPreservedDeployment(before, deploymentState(settings()), revision);
  assert.throws(() => confirmPreservedDeployment(before, { ...before, namespaceId: "empty-replacement" }, revision), /database namespace/);
  assert.throws(() => confirmPreservedDeployment(before, { ...before, migrationMode: "false" }, revision), /maintenance state/);
  assert.throws(() => confirmPreservedDeployment(before, { ...before, secretNames: ["SMTP_PASS"] }, revision), /STRIPE_SECRET_KEY/);
  assert.throws(() => confirmPreservedDeployment(before, { ...before, release: "b".repeat(40) }, revision), /committed release/);
});

test("preflight refuses missing database and a mismatched account-system origin", () => {
  assert.throws(() => deploymentState({ bindings: [] }), /database binding/);
  const wrongOrigin = settings();
  wrongOrigin.bindings.find((binding) => binding.name === "BASE_URL").text = "https://neatnotes.onrender.com";
  assert.throws(() => deploymentState(wrongOrigin), /BASE_URL/);
  assert.throws(() => deploymentState(settings("invalid")), /MIGRATION_MODE/);
});

test("the live app cannot silently enter or leave maintenance during deployment", () => {
  const state = deploymentState(settings());
  confirmHealth(503, { error: "RecallStride is moving its database. Please try again shortly." }, state, revision);
  assert.throws(() => confirmHealth(200, { ok: true }, state, revision), /remain closed/);
  assert.throws(() => confirmHealth(503, { error: "Internal server error" }, state, revision), /Unexpected maintenance/);
});

test("active deployment requires the right revision and a working persistent database", () => {
  const state = deploymentState(settings("false"));
  const health = { ok: true, databasePersistent: true, databaseFallbackActive: false, release: revision.slice(0, 12) };
  confirmHealth(200, health, state, revision);
  assert.throws(() => confirmHealth(200, { ...health, release: "previous" }, state, revision), /live revision/);
  assert.throws(() => confirmHealth(200, { ...health, databasePersistent: false }, state, revision), /not persistent/);
  assert.throws(() => confirmHealth(200, { ...health, databaseFallbackActive: true }, state, revision), /fallback/);
  assert.throws(() => confirmHealth(503, health, state, revision), /health check/);
});

test("absence of the operational maintenance variable keeps the app active", () => {
  const active = settings();
  active.bindings = active.bindings.filter((binding) => binding.name !== "MIGRATION_MODE");
  assert.equal(deploymentState(active).migrationMode, "false");
});
