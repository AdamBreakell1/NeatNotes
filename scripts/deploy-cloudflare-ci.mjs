import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const accountId = "7656ff3b3eaa33f5eb0e17d1b026f7f0";
export const workerName = "recallstride";
export const productionOrigin = "https://recallstride.breakellsystems.workers.dev";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function deploymentState(settings) {
  assert.ok(Array.isArray(settings?.bindings), "The existing Worker bindings could not be read.");
  const bindings = new Map(settings.bindings.map((binding) => [binding.name, binding]));
  const database = bindings.get("RECALLSTRIDE_DB");
  assert.equal(database?.type, "durable_object_namespace", "The production database binding is missing.");
  assert.ok(typeof database.namespace_id === "string" && database.namespace_id.length > 0, "The production database namespace is missing.");
  if (database.class_name !== undefined) assert.equal(database.class_name, "RecallStrideDatabase", "The production database class has changed.");
  const variable = (name) => {
    const binding = bindings.get(name);
    if (!binding) return undefined;
    assert.equal(binding.type, "plain_text", `Expected a plain-text ${name} binding.`);
    return binding.text;
  };
  const baseUrl = variable("BASE_URL");
  const corsOrigin = variable("CORS_ORIGIN");
  assert.equal(baseUrl, productionOrigin, "The production BASE_URL differs from the deployment destination.");
  assert.equal(corsOrigin, productionOrigin, "The production CORS_ORIGIN differs from the deployment destination.");
  const migrationMode = variable("MIGRATION_MODE") ?? "false";
  assert.ok(["true", "false"].includes(migrationMode), "MIGRATION_MODE must be true, false or absent.");
  return {
    namespaceId: database.namespace_id,
    migrationMode,
    release: variable("RELEASE_SHA"),
    secretNames: settings.bindings.filter((binding) => ["secret_text", "secret_key"].includes(binding.type)).map((binding) => binding.name).sort(),
  };
}

export function confirmPreservedDeployment(before, after, revision) {
  assert.equal(after.namespaceId, before.namespaceId, "Deployment changed the production database namespace.");
  assert.equal(after.migrationMode, before.migrationMode, "Deployment changed the maintenance state.");
  for (const name of before.secretNames) assert.ok(after.secretNames.includes(name), `Deployment removed the ${name} secret binding.`);
  assert.equal(after.release, revision, "The Worker does not have the committed release binding.");
}

export function confirmHealth(status, health, state, revision) {
  if (state.migrationMode === "true") {
    assert.equal(status, 503, "The Worker must remain closed during data transfer.");
    assert.equal(health?.error, "RecallStride is moving its database. Please try again shortly.", "Unexpected maintenance response.");
    return;
  }
  assert.equal(status, 200, "The live Worker health check failed.");
  assert.equal(health?.ok, true, "The live database check failed.");
  assert.equal(health.databasePersistent, true, "The live database is not persistent.");
  assert.equal(health.databaseFallbackActive, false, "The live database is using a fallback.");
  assert.equal(health.release, revision.slice(0, 12), "The live revision does not match this deployment.");
}

async function readSettings(token) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `Cloudflare settings request failed (HTTP ${response.status}); check the deployment token and existing Worker.`);
  const payload = await response.json();
  assert.equal(payload.success, true, "Cloudflare could not read the existing Worker settings.");
  return deploymentState(payload.result);
}

export async function main() {
  assert.equal(process.env.GITHUB_REF, "refs/heads/main", "Production deployment is restricted to the main branch.");
  assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID, accountId, "Unexpected Cloudflare deployment account.");
  const token = process.env.CLOUDFLARE_API_TOKEN;
  assert.ok(token, "Set the repository Actions secret CLOUDFLARE_API_TOKEN before enabling deployment.");
  const revisionResult = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  assert.equal(revisionResult.status, 0, "Cannot read the committed deployment revision.");
  const revision = revisionResult.stdout.trim();
  assert.equal(revision, process.env.GITHUB_SHA, "The checkout does not match the GitHub deployment revision.");
  // This repository's config is valid JSON. A config edit must keep the existing
  // production identity; new deployments must not create an empty database.
  const config = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"));
  assert.equal(config.name, workerName, "The production Worker name must remain recallstride.");
  assert.deepEqual(config.durable_objects?.bindings, [{ name: "RECALLSTRIDE_DB", class_name: "RecallStrideDatabase" }], "The production database binding must be preserved.");
  for (const migration of config.migrations ?? []) {
    assert.ok(!(migration.deleted_classes ?? []).includes("RecallStrideDatabase"), "Do not delete the production database class.");
    assert.ok(!(migration.renamed_classes ?? []).some((entry) => entry.from === "RecallStrideDatabase"), "A database class rename requires a planned migration.");
  }
  assert.ok(!Object.hasOwn(config.vars ?? {}, "MIGRATION_MODE"), "Keep MIGRATION_MODE as an operational Cloudflare variable, preserved by --keep-vars.");
  const before = await readSettings(token);
  const deployment = spawnSync(process.execPath, [path.join(root, "scripts/deploy-cloudflare.mjs"), "--config", "wrangler.jsonc", "--keep-vars"], {
    cwd: root, stdio: "inherit", env: process.env,
  });
  assert.equal(deployment.status, 0, "Cloudflare deployment failed.");
  let lastError;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const after = await readSettings(token);
      confirmPreservedDeployment(before, after, revision);
      const response = await fetch(`${productionOrigin}/api/health`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) });
      confirmHealth(response.status, await response.json(), after, revision);
      const summary = `Deployed ${revision.slice(0, 12)} to ${productionOrigin}. Database and secrets preserved; ${after.migrationMode === "true" ? "maintenance remains enabled" : "live health and persistent database confirmed"}.`;
      console.log(summary);
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 11) await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
  throw lastError;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    // Do not print API responses, bindings or provider/token values.
    console.error(error.message);
    process.exitCode = 1;
  });
}
