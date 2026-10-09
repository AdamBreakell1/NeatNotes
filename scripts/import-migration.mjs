import { createReadStream, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { validateMigrationChunk, validateMigrationManifest } from "../backend/cloudflare/data-transfer.mjs";

function argumentsFor(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    if (!["--input", "--url", "--token-file"].includes(argv[index]) || !argv[index + 1] || parsed[argv[index]]) throw new Error("Use --input <export.migration-private.json> --url <private transfer service URL> --token-file <private token path>.");
    parsed[argv[index]] = argv[index + 1];
  }
  if (!["--input", "--url", "--token-file"].every((key) => parsed[key])) throw new Error("Input, private service URL and token file are required.");
  return parsed;
}

// The export is ordinary JSON, formatted with one bounded chunk per line. Read
// it incrementally so large snapshots do not need to fit in the CLI's memory.
async function* records(filePath) {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let state = 0;
  let chunkCount = 0;
  try {
    for await (const original of lines) {
      const line = original.trim();
      if (!line) continue;
      if (state === 0 && line === "{") { state = 1; continue; }
      if (state === 1 && line.startsWith('"manifest":') && line.endsWith(",")) {
        yield { manifest: JSON.parse(line.slice(11, -1)) };
        state = 2;
        continue;
      }
      if (state === 2 && line === '"chunks":[') { state = 3; continue; }
      if (state === 3 && line === "]") { state = 4; continue; }
      if (state === 3) {
        if (chunkCount && !line.startsWith(",") || !chunkCount && line.startsWith(",")) throw new Error("Invalid migration JSON chunk separation.");
        yield { chunk: JSON.parse(chunkCount ? line.slice(1) : line) };
        chunkCount += 1;
        continue;
      }
      if (state === 4 && line === "}") { state = 5; continue; }
      throw new Error("Invalid migration file structure.");
    }
    if (state !== 5) throw new Error("The migration file is incomplete.");
  } finally {
    lines.close();
    stream.destroy();
  }
}

try {
  const argumentsList = argumentsFor(process.argv.slice(2));
  const inputPath = path.resolve(argumentsList["--input"]);
  if (!inputPath.endsWith(".migration-private.json")) throw new Error("Use a private migration export file.");
  const baseUrl = new URL(argumentsList["--url"]);
  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash
    || baseUrl.protocol !== "https:" && !(baseUrl.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname))) {
    throw new Error("Use an HTTPS transfer service URL, or local HTTP for synthetic tests.");
  }
  const tokenPath = path.resolve(argumentsList["--token-file"]);
  if (process.platform !== "win32" && (statSync(tokenPath).mode & 0o077)) throw new Error("The transfer token file must have owner-only permissions (0600).");
  const token = readFileSync(tokenPath, "utf8").trim();
  if (token.length < 32 || /\s/.test(token)) throw new Error("Use a transfer token of at least 32 characters without whitespace.");

  let manifest;
  let checkedChunks = 0;
  // Check the entire private file before a target seed row can be replaced.
  for await (const record of records(inputPath)) {
    if (record.manifest) manifest = validateMigrationManifest(record.manifest);
    else {
      if (record.chunk.index !== checkedChunks) throw new Error("Migration file chunks are out of order.");
      validateMigrationChunk(manifest, record.chunk);
      checkedChunks += 1;
    }
  }
  if (!manifest || checkedChunks !== manifest.chunks.length) throw new Error("Migration file chunk count is incomplete.");

  const call = async (endpoint, data) => {
    const response = await fetch(new URL(endpoint, baseUrl), {
      method: data === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data), redirect: "error", signal: AbortSignal.timeout(60000),
    });
    let result;
    try { result = await response.json(); } catch { throw new Error(`Transfer service returned HTTP ${response.status}.`); }
    if (!response.ok) throw new Error(result.error || `Transfer service returned HTTP ${response.status}.`);
    return result;
  };
  let status = await call("/begin", manifest);
  if (status.importId !== manifest.importId || status.totalChunks !== manifest.chunks.length) throw new Error("The transfer service returned a different import identity.");
  if (status.status === "failed") throw new Error(status.error || "The target import has failed verification.");
  if (status.status !== "complete") {
    for await (const record of records(inputPath)) {
      if (!record.chunk || record.chunk.index < status.nextChunk) continue;
      status = await call("/chunk", record.chunk);
      console.log(JSON.stringify({ importId: status.importId, nextChunk: status.nextChunk, totalChunks: status.totalChunks, importedRows: status.importedRows }));
    }
    status = await call("/finish", {});
  }
  if (status.status !== "complete") throw new Error("The target did not confirm complete data verification.");
  console.log(JSON.stringify({ imported: true, ...status }, null, 2));
} catch (error) {
  console.error(`Migration import failed: ${error.message}`);
  process.exitCode = 1;
}
