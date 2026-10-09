import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
if (revision.status !== 0 || !/^[a-f0-9]{40,64}$/.test(revision.stdout.trim())) {
  throw new Error("A committed Git revision is required for deployment.");
}
const changes = spawnSync("git", ["diff", "HEAD", "--quiet"], { cwd: root });
if (changes.status !== 0) throw new Error("Commit tracked changes before deployment so live health identifies the deployed revision.");
const build = spawnSync(process.execPath, [path.join(root, "scripts/build-cloudflare.js")], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);
const deployment = spawnSync(process.execPath, [path.join(root, "node_modules/wrangler/bin/wrangler.js"),
  "deploy", "--var", `RELEASE_SHA:${revision.stdout.trim()}`, ...process.argv.slice(2)], {
  cwd: root, stdio: "inherit", env: {
    ...process.env,
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
    WRANGLER_SEND_METRICS: "false",
  },
});
process.exit(deployment.status || (deployment.error ? 1 : 0));
