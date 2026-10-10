// Deploy only during an operator session and delete it afterwards. The public
// application has no recovery URL. This Worker cannot export customer records.
import { timingSafeEqual } from "node:crypto";
import { RECOVERY_RESTART_MESSAGE } from "./recovery.mjs";

const json = (value, status = 200) => Response.json(value, { status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

async function inputOf(request) {
  const body = await request.text();
  if (body.length > 4096) throw new Error("Recovery request is too large.");
  return JSON.parse(body);
}

export default {
  async fetch(request, env) {
    const secret = String(env.RECOVERY_SECRET || "");
    const supplied = Buffer.from(request.headers.get("Authorization") || "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return json({ error: "Not found" }, 404);
    }
    const database = env.RECALLSTRIDE_DB.getByName("recallstride-production", { locationHint: "weur" });
    const path = new URL(request.url).pathname;
    try {
      if (path === "/status" && request.method === "GET") return json(await database.recoveryInfo());
      if (request.method !== "POST") return json({ error: "Not found" }, 404);
      const input = await inputOf(request);
      if (path === "/bookmark") return json(await database.recoveryBookmarkForTime(input));
      if (path === "/prepare") return json(await database.prepareRecovery(input));
      if (path === "/restart") {
        try { await database.restartRecovery(input); }
        catch (error) {
          if (!String(error?.message || "").includes(RECOVERY_RESTART_MESSAGE)) throw error;
        }
        return json({ objectId: input.objectId, status: "restart_requested" }, 202);
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: String(error?.message || "Recovery failed").slice(0, 240) }, 409);
    }
  },
};
