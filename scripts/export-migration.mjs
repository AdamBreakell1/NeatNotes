import { closeSync, existsSync, fsyncSync, openSync, unlinkSync, writeSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createMigrationExport } from "../backend/cloudflare/data-transfer.mjs";

function argumentsFor(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    if (!["--source", "--output"].includes(argv[index]) || !argv[index + 1] || parsed[argv[index]]) throw new Error("Use --source <SQLite path> --output <name.migration-private.json>.");
    parsed[argv[index]] = argv[index + 1];
  }
  if (!parsed["--source"] || !parsed["--output"]) throw new Error("Use --source <SQLite path> --output <name.migration-private.json>.");
  return parsed;
}

let db;
let snapshot;
let descriptor;
let outputPath;
let completed = false;
try {
  const argumentsList = argumentsFor(process.argv.slice(2));
  const sourcePath = path.resolve(argumentsList["--source"]);
  outputPath = path.resolve(argumentsList["--output"]);
  if (!existsSync(sourcePath)) throw new Error("The explicit source database does not exist.");
  if (!outputPath.endsWith(".migration-private.json")) throw new Error("Use the ignored .migration-private.json suffix for private account exports.");
  db = new DatabaseSync(sourcePath, { readOnly: true });
  snapshot = createMigrationExport(db);
  // Exclusive creation prevents overwriting any backup or earlier export.
  descriptor = openSync(outputPath, "wx", 0o600);
  writeSync(descriptor, `{\n"manifest":${JSON.stringify(snapshot.manifest)},\n"chunks":[\n`);
  let chunks = 0;
  for (const chunk of snapshot.chunks()) {
    writeSync(descriptor, `${chunks ? "," : ""}${JSON.stringify(chunk)}\n`);
    chunks += 1;
  }
  writeSync(descriptor, "]\n}\n");
  fsyncSync(descriptor);
  completed = true;
  console.log(JSON.stringify({ exported: true, importId: snapshot.manifest.importId, tables: snapshot.manifest.tables.length,
    rows: snapshot.manifest.tables.reduce((total, table) => total + table.rowCount, 0), chunks, sha256: snapshot.manifest.sha256,
    privateFile: outputPath, sourceMode: "read-only consistent SQLite snapshot" }, null, 2));
} catch (error) {
  console.error(`Migration export failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (descriptor !== undefined) closeSync(descriptor);
  snapshot?.close();
  db?.close();
  if (!completed && descriptor !== undefined) unlinkSync(outputPath);
}
