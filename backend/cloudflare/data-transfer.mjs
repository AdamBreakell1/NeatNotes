import { createHash, randomUUID } from "node:crypto";

export const MIGRATION_FORMAT = "recallstride-sqlite-migration-v1";
export const MAX_CHUNK_BYTES = 1024 * 1024;
const INTERNAL_PREFIX = "_recallstride_migration_";
const REPLACEABLE_SEED_TABLES = new Set(["flashcard_decks", "flashcards", "runtime_metadata"]);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.byteLength(JSON.stringify(value));
const quote = (name) => {
  if (typeof name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name)) throw new Error("Invalid SQLite identifier.");
  return `"${name}"`;
};
const publicTable = (name) => !name.startsWith("sqlite_") && !name.startsWith("__cf_")
  && !name.startsWith("__miniflare_") && !name.startsWith(INTERNAL_PREFIX);

function tableSchemas(db) {
  return db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").all()
    .filter(({ name }) => publicTable(name)).map(({ name, sql }) => {
      quote(name);
      if (/CREATE\s+VIRTUAL\s+TABLE/i.test(sql || "")) throw new Error(`Virtual tables require an explicit migration: ${name}.`);
      const columns = db.prepare(`PRAGMA table_info(${quote(name)})`).all().map((column) => ({
        name: column.name, type: column.type, notnull: Number(column.notnull), pk: Number(column.pk),
      }));
      columns.forEach((column) => quote(column.name));
      if (!columns.some((column) => column.pk)) throw new Error(`A stable primary key is required for ${name}.`);
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all().map((key) => ({
        id: Number(key.id), seq: Number(key.seq), table: key.table, from: key.from, to: key.to,
        onUpdate: key.on_update, onDelete: key.on_delete,
      })).sort((a, b) => a.id - b.id || a.seq - b.seq);
      return { name, columns, foreignKeys };
    });
}

function dependencyOrder(tables) {
  const pending = new Map(tables.map((table) => [table.name, table]));
  const ordered = [];
  while (pending.size) {
    const next = [...pending.values()].find((table) => table.foreignKeys.every((key) =>
      key.table === table.name || !pending.has(key.table)));
    if (!next) throw new Error("Cross-table foreign-key cycles require an explicit migration before data is changed.");
    ordered.push(next);
    pending.delete(next.name);
  }
  return ordered;
}

function rowStatement(db, table) {
  const selected = table.columns.map((column) => `entry.${quote(column.name)}`).join(",");
  const primary = table.columns.filter((column) => column.pk).sort((a, b) => a.pk - b.pk);
  const selfKeys = table.foreignKeys.filter((key) => key.table === table.name);
  if (selfKeys.length) {
    // RecallStride's original_attempt_id references an earlier exam attempt.
    // A recursive SQL order keeps its parent in an earlier imported chunk.
    if (selfKeys.length !== 1 || primary.length !== 1 || selfKeys[0].to !== primary[0].name) {
      throw new Error(`Unsupported self-reference structure in ${table.name}; no target data was changed.`);
    }
    const pk = quote(primary[0].name);
    const parent = quote(selfKeys[0].from);
    return db.prepare(`WITH RECURSIVE migration_order(migration_id, migration_depth) AS (
      SELECT ${pk}, 0 FROM ${quote(table.name)} WHERE ${parent} IS NULL OR ${parent} = ${pk}
      UNION ALL
      SELECT child.${pk}, migration_order.migration_depth + 1 FROM ${quote(table.name)} child
      JOIN migration_order ON child.${parent} = migration_order.migration_id
      WHERE child.${parent} != child.${pk}
    ) SELECT ${selected} FROM ${quote(table.name)} entry
      JOIN migration_order ON entry.${pk} = migration_order.migration_id
      ORDER BY migration_order.migration_depth, entry.${pk}`);
  }
  return db.prepare(`SELECT ${selected} FROM ${quote(table.name)} entry ORDER BY ${primary.map((column) => `entry.${quote(column.name)}`).join(",")}`);
}

function encodeValue(value) {
  if (value === null || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (ArrayBuffer.isView(value)) return { $blob: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("base64") };
  if (value instanceof ArrayBuffer) return { $blob: Buffer.from(value).toString("base64") };
  throw new Error("A SQLite value cannot be transferred without losing its type.");
}

function decodeValue(value) {
  if (value === null || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && Object.keys(value).length === 1 && typeof value.$blob === "string") {
    const bytes = Buffer.from(value.$blob, "base64");
    if (bytes.toString("base64") === value.$blob) return bytes;
  }
  throw new Error("Invalid encoded SQLite value.");
}

function* rowBatches(db, table, { rowsPerChunk, bytesPerChunk }) {
  const statement = rowStatement(db, table);
  const iterable = typeof statement.iterate === "function" ? statement.iterate() : statement.all();
  let rows = [];
  let bytes = 2;
  for (const entry of iterable) {
    const row = table.columns.map((column) => encodeValue(entry[column.name]));
    const rowBytes = jsonBytes(row) + 1;
    if (rowBytes > bytesPerChunk) throw new Error(`A row in ${table.name} exceeds the migration chunk size.`);
    if (rows.length && (rows.length >= rowsPerChunk || bytes + rowBytes > bytesPerChunk)) {
      yield rows;
      rows = [];
      bytes = 2;
    }
    rows.push(row);
    bytes += rowBytes;
  }
  if (rows.length) yield rows;
}

function canonicalChunk(chunk) {
  return { importId: chunk.importId, index: chunk.index, table: chunk.table, rows: chunk.rows };
}

export function validateMigrationManifest(manifest) {
  if (!manifest || manifest.format !== MIGRATION_FORMAT || typeof manifest.importId !== "string"
    || !/^[A-Za-z0-9_-]{16,80}$/.test(manifest.importId) || !Array.isArray(manifest.tables) || !Array.isArray(manifest.chunks)
    || manifest.tables.length > 100 || manifest.chunks.length > 10000 || jsonBytes(manifest) > MAX_CHUNK_BYTES) {
    throw new Error("Invalid migration manifest.");
  }
  const { sha256, ...unsigned } = manifest;
  if (typeof sha256 !== "string" || sha256 !== digest(JSON.stringify(unsigned))) throw new Error("Migration manifest checksum does not match.");
  const tableNames = new Set();
  const counts = new Map();
  for (const table of manifest.tables) {
    quote(table.name);
    if (!publicTable(table.name) || tableNames.has(table.name) || !Array.isArray(table.columns) || !Array.isArray(table.foreignKeys)
      || !Number.isSafeInteger(table.rowCount) || table.rowCount < 0 || !/^[a-f0-9]{64}$/.test(table.sha256)) throw new Error("Invalid migration table.");
    tableNames.add(table.name);
    counts.set(table.name, 0);
    if (!table.columns.length || table.columns.length > 100 || new Set(table.columns.map((column) => column.name)).size !== table.columns.length) throw new Error("Invalid migration columns.");
    table.columns.forEach((column) => quote(column.name));
  }
  for (const [index, chunk] of manifest.chunks.entries()) {
    if (chunk.index !== index || !tableNames.has(chunk.table) || !Number.isSafeInteger(chunk.rowCount) || chunk.rowCount <= 0
      || !Number.isSafeInteger(chunk.bytes) || chunk.bytes > MAX_CHUNK_BYTES || chunk.bytes <= 0 || !/^[a-f0-9]{64}$/.test(chunk.sha256)) {
      throw new Error("Invalid migration chunk description.");
    }
    counts.set(chunk.table, counts.get(chunk.table) + chunk.rowCount);
  }
  if (manifest.tables.some((table) => counts.get(table.name) !== table.rowCount)) throw new Error("Migration row counts do not match the chunk manifest.");
  const order = new Map(manifest.tables.map((table, index) => [table.name, index]));
  for (const table of manifest.tables) {
    for (const key of table.foreignKeys) {
      if (!tableNames.has(key.table) || key.table !== table.name && order.get(key.table) > order.get(table.name)) throw new Error("Migration tables are not in parent-first order.");
    }
  }
  let lastTable = -1;
  for (const chunk of manifest.chunks) {
    const tableIndex = order.get(chunk.table);
    if (tableIndex < lastTable) throw new Error("Migration chunks are not in table order.");
    lastTable = tableIndex;
  }
  return manifest;
}

export function validateMigrationChunk(manifest, input) {
  if (!input || input.importId !== manifest.importId || !Number.isSafeInteger(input.index) || input.index < 0 || !Array.isArray(input.rows)) throw new Error("Invalid migration chunk.");
  const chunk = canonicalChunk(input);
  const descriptor = manifest.chunks[chunk.index];
  if (!descriptor || chunk.table !== descriptor.table || chunk.rows.length !== descriptor.rowCount || jsonBytes(chunk) !== descriptor.bytes
    || digest(JSON.stringify(chunk)) !== descriptor.sha256) throw new Error("Migration chunk checksum or row count does not match.");
  return chunk;
}

// This read transaction remains open until close() so both the manifest pass
// and streamed data pass observe the same SQLite/WAL snapshot.
export function createMigrationExport(db, options = {}) {
  const settings = { rowsPerChunk: options.rowsPerChunk ?? 100, bytesPerChunk: options.bytesPerChunk ?? 512 * 1024 };
  if (!Number.isSafeInteger(settings.rowsPerChunk) || settings.rowsPerChunk < 1
    || !Number.isSafeInteger(settings.bytesPerChunk) || settings.bytesPerChunk < 1024 || settings.bytesPerChunk > MAX_CHUNK_BYTES - 1024) throw new Error("Invalid migration chunk settings.");
  db.exec("BEGIN");
  let active = true;
  const close = () => { if (active) { db.exec("ROLLBACK"); active = false; } };
  try {
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("The source has invalid foreign-key references; repair them before export.");
    const schemas = dependencyOrder(tableSchemas(db));
    const manifest = { format: MIGRATION_FORMAT, importId: randomUUID(), createdAt: new Date().toISOString(), tables: [], chunks: [] };
    for (const table of schemas) {
      const hash = createHash("sha256");
      let rowCount = 0;
      for (const rows of rowBatches(db, table, settings)) {
        rows.forEach((row) => { hash.update(JSON.stringify(row) + "\n"); rowCount += 1; });
        const chunk = { importId: manifest.importId, index: manifest.chunks.length, table: table.name, rows };
        manifest.chunks.push({ index: chunk.index, table: chunk.table, rowCount: rows.length, bytes: jsonBytes(chunk), sha256: digest(JSON.stringify(chunk)) });
      }
      if (rowCount !== db.prepare(`SELECT COUNT(*) AS n FROM ${quote(table.name)}`).get().n) {
        throw new Error(`Unsortable self-reference cycle or unstable primary key in ${table.name}; no target data was changed.`);
      }
      manifest.tables.push({ ...table, rowCount, sha256: hash.digest("hex") });
    }
    manifest.sha256 = digest(JSON.stringify(manifest));
    validateMigrationManifest(manifest);
    return {
      manifest,
      *chunks() {
        if (!active) throw new Error("The export snapshot is closed.");
        let index = 0;
        for (const table of schemas) {
          for (const rows of rowBatches(db, table, settings)) {
            const chunk = { importId: manifest.importId, index, table: table.name, rows };
            if (digest(JSON.stringify(chunk)) !== manifest.chunks[index]?.sha256) throw new Error("The export snapshot changed unexpectedly.");
            index += 1;
            yield chunk;
          }
        }
        if (index !== manifest.chunks.length) throw new Error("The exported chunk count changed unexpectedly.");
      },
      close,
    };
  } catch (error) { close(); throw error; }
}

export function createDataTransfer(db) {
  if (typeof db.transactionSync !== "function") throw new Error("Data transfer requires synchronous, rollback-capable database transactions.");
  db.exec(`CREATE TABLE IF NOT EXISTS ${INTERNAL_PREFIX}state (
    singleton INTEGER PRIMARY KEY CHECK(singleton=1), import_id TEXT NOT NULL, status TEXT NOT NULL,
    manifest_json TEXT NOT NULL, next_chunk INTEGER NOT NULL, imported_rows INTEGER NOT NULL,
    error TEXT, created_at TEXT NOT NULL, finished_at TEXT
  ); CREATE TABLE IF NOT EXISTS ${INTERNAL_PREFIX}chunks (
    import_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, sha256 TEXT NOT NULL,
    PRIMARY KEY(import_id, chunk_index)
  );`);
  const state = () => db.prepare(`SELECT * FROM ${INTERNAL_PREFIX}state WHERE singleton=1`).get();
  const statusOf = (record) => {
    if (!record) return { status: "not_started", importId: null, nextChunk: 0, totalChunks: 0, importedRows: 0, totalRows: 0, error: null };
    const manifest = JSON.parse(record.manifest_json);
    return { status: record.status, importId: record.import_id, nextChunk: record.next_chunk, totalChunks: manifest.chunks.length,
      importedRows: record.imported_rows, totalRows: manifest.tables.reduce((sum, table) => sum + table.rowCount, 0), error: record.error };
  };

  return {
    importStatus() { return statusOf(state()); },
    beginImport(input) {
      const manifest = validateMigrationManifest(input);
      const existing = state();
      if (existing) {
        if (existing.import_id === manifest.importId && JSON.parse(existing.manifest_json).sha256 === manifest.sha256) return statusOf(existing);
        throw new Error("This target already has an import. Use a fresh target rather than overwriting it.");
      }
      const targets = tableSchemas(db);
      const targetMap = new Map(targets.map((table) => [table.name, table]));
      if (!targetMap.has("users")) throw new Error("Initialize the complete RecallStride database before importing.");
      if (!manifest.tables.some((table) => table.name === "users")) throw new Error("The source is not a complete RecallStride account database.");
      for (const table of manifest.tables) {
        const target = targetMap.get(table.name);
        if (!target) throw new Error(`The target does not contain the application table ${table.name}.`);
        for (const column of table.columns) {
          const destination = target.columns.find((candidate) => candidate.name === column.name);
          if (!destination || destination.type !== column.type || destination.pk !== column.pk || destination.notnull !== column.notnull) {
            throw new Error(`Source and target columns differ in ${table.name}.`);
          }
        }
        const keysForSourceColumns = target.foreignKeys.filter((key) => table.columns.some((column) => column.name === key.from));
        if (JSON.stringify(keysForSourceColumns) !== JSON.stringify(table.foreignKeys)) throw new Error(`Source and target foreign keys differ in ${table.name}.`);
        for (const column of target.columns) {
          if (!table.columns.some((candidate) => candidate.name === column.name) && column.notnull) {
            const info = db.prepare(`PRAGMA table_info(${quote(table.name)})`).all().find((candidate) => candidate.name === column.name);
            if (info.dflt_value === null) throw new Error(`A required new target column is missing in ${table.name}.`);
          }
        }
      }
      const clearOrder = dependencyOrder(targets).reverse();
      db.transactionSync(() => {
        for (const table of targets) {
          if (!REPLACEABLE_SEED_TABLES.has(table.name) && db.prepare(`SELECT COUNT(*) AS n FROM ${quote(table.name)}`).get().n !== 0) {
            throw new Error("The target contains existing account or operational data. Import was refused without replacing it.");
          }
        }
        for (const table of clearOrder) {
          // Runtime metadata newly introduced after the source release can stay.
          if (table.name === "runtime_metadata" && !manifest.tables.some((source) => source.name === table.name)) continue;
          db.exec(`DELETE FROM ${quote(table.name)}`);
        }
        db.prepare(`INSERT INTO ${INTERNAL_PREFIX}state VALUES(1,?,?,?,?,?,?,?,NULL)`)
          .run(manifest.importId, "importing", JSON.stringify(manifest), 0, 0, null, new Date().toISOString());
      });
      return statusOf(state());
    },
    appendImport(input) {
      const record = state();
      if (!record) throw new Error("Begin the import before sending data.");
      const manifest = JSON.parse(record.manifest_json);
      const chunk = validateMigrationChunk(manifest, input);
      const checksum = digest(JSON.stringify(chunk));
      if (chunk.index < record.next_chunk) {
        const receipt = db.prepare(`SELECT sha256 FROM ${INTERNAL_PREFIX}chunks WHERE import_id=? AND chunk_index=?`).get(record.import_id, chunk.index);
        if (receipt?.sha256 !== checksum) throw new Error("A replayed migration chunk differs from its durable receipt.");
        return { ...statusOf(record), duplicate: true };
      }
      if (record.status !== "importing" || chunk.index !== record.next_chunk) throw new Error("Send migration chunks in sequence while the import is active.");
      const table = manifest.tables.find((table) => table.name === chunk.table);
      const rows = chunk.rows.map((row) => {
        if (!Array.isArray(row) || row.length !== table.columns.length) throw new Error("Migration row columns do not match.");
        return row.map(decodeValue);
      });
      const insert = db.prepare(`INSERT INTO ${quote(table.name)} (${table.columns.map((column) => quote(column.name)).join(",")}) VALUES (${table.columns.map(() => "?").join(",")})`);
      db.transactionSync(() => {
        for (const row of rows) insert.run(...row);
        db.prepare(`INSERT INTO ${INTERNAL_PREFIX}chunks VALUES(?,?,?)`).run(record.import_id, chunk.index, checksum);
        db.prepare(`UPDATE ${INTERNAL_PREFIX}state SET next_chunk=next_chunk+1, imported_rows=imported_rows+? WHERE singleton=1`).run(rows.length);
      });
      return { ...statusOf(state()), duplicate: false };
    },
    finishImport() {
      const record = state();
      if (!record) throw new Error("No import has started.");
      if (record.status === "complete") return statusOf(record);
      const manifest = JSON.parse(record.manifest_json);
      if (record.status !== "importing" || record.next_chunk !== manifest.chunks.length) throw new Error("Import all chunks before completing the migration.");
      try {
        db.transactionSync(() => {
          for (const table of manifest.tables) {
            const actualCount = db.prepare(`SELECT COUNT(*) AS n FROM ${quote(table.name)}`).get().n;
            const hash = createHash("sha256");
            let checkedRows = 0;
            for (const rows of rowBatches(db, table, { rowsPerChunk: 100, bytesPerChunk: MAX_CHUNK_BYTES - 1024 })) {
              for (const row of rows) { hash.update(JSON.stringify(row) + "\n"); checkedRows += 1; }
            }
            if (actualCount !== table.rowCount || checkedRows !== table.rowCount || hash.digest("hex") !== table.sha256) throw new Error(`Imported data verification failed for ${table.name}.`);
          }
          if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Imported foreign-key verification failed.");
          db.prepare(`UPDATE ${INTERNAL_PREFIX}state SET status='complete', finished_at=? WHERE singleton=1`).run(new Date().toISOString());
        });
      } catch (error) {
        db.prepare(`UPDATE ${INTERNAL_PREFIX}state SET status='failed', error=? WHERE singleton=1`).run(String(error.message).slice(0, 300));
        throw error;
      }
      return statusOf(state());
    },
  };
}
