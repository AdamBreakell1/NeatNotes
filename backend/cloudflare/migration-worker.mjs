// Temporary operator-only transfer service. Deploy only for the migration,
// then delete this service. The public application exposes no transfer route.
import { timingSafeEqual } from "node:crypto";

async function boundedJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A JSON body is required.");
  let size = 0;
  const chunks = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Transfer request exceeds 2 MB.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

const json = (value, status = 200) => Response.json(value, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export default {
  async fetch(request, env) {
    const secret = String(env.MIGRATION_SECRET || "");
    const supplied = request.headers.get("Authorization") || "";
    const expected = `Bearer ${secret}`;
    const suppliedBytes = Buffer.from(supplied);
    const expectedBytes = Buffer.from(expected);
    if (secret.length < 32 || suppliedBytes.length !== expectedBytes.length
      || !timingSafeEqual(suppliedBytes, expectedBytes)) {
      return json({ error: "Not found" }, 404);
    }
    const path = new URL(request.url).pathname;
    const database = env.RECALLSTRIDE_DB.getByName("recallstride-production", { locationHint: "weur" });
    try {
      if (path === "/status" && request.method === "GET") return json(await database.importStatus());
      if (request.method !== "POST") return json({ error: "Not found" }, 404);
      if (path === "/begin") return json(await database.beginImport(await boundedJson(request)));
      if (path === "/chunk") return json(await database.appendImport(await boundedJson(request)));
      if (path === "/finish") return json(await database.finishImport());
      return json({ error: "Not found" }, 404);
    } catch (error) {
      // Do not include source rows, credentials or provider details in logs.
      return json({ error: String(error?.message || "Transfer failed").slice(0, 240) }, 409);
    }
  },
};
