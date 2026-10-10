import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Used only for deleting temporary operator/fixture Workers. Wrangler's delete
// command also queries KV namespaces even when a Worker has no KV bindings;
// this API operation needs only the existing Workers Scripts permission.
export async function deleteTemporaryWorker(workerName) {
  assert.match(workerName, /^recallstride-recovery(?:-rehearsal-[a-f0-9]{8})?$/, "Only a temporary recovery Worker can be deleted with this helper.");
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    const locations = [path.join(os.homedir(), "Library/Preferences/.wrangler/config/default.toml"),
      path.join(os.homedir(), ".config/.wrangler/config/default.toml"), path.join(os.homedir(), ".wrangler/config/default.toml")];
    for (const location of locations) {
      if (!fs.existsSync(location)) continue;
      token = fs.readFileSync(location, "utf8").match(/^oauth_token\s*=\s*"([^"\r\n]+)"/m)?.[1];
      if (token) break;
    }
  }
  assert.ok(token, "Existing Wrangler authentication could not be found; sign in with Wrangler before cleanup.");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/7656ff3b3eaa33f5eb0e17d1b026f7f0/workers/scripts/${workerName}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  const alreadyAbsent = response.status === 404 && result.errors?.some((error) => error.code === 10007);
  assert.ok((response.ok && result.success) || alreadyAbsent, `Temporary Worker cleanup failed (HTTP ${response.status}); no credential details were logged.`);
  return { workerName, deleted: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deleteTemporaryWorker(process.argv[2]).then((result) => console.log(`Deleted ${result.workerName} and its temporary secrets.`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
