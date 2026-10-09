// Preserve the application's synchronous SQLite statement interface while its
// database is managed by a SQLite-backed Durable Object.
export function createDurableDatabase(storage) {
  if (!storage?.sql?.exec || !storage?.transactionSync) {
    throw new TypeError("A SQLite-backed Durable Object storage binding is required.");
  }

  const validateBindings = (bindings) => {
    for (const binding of bindings) {
      if (binding !== null && !["string", "number", "bigint"].includes(typeof binding) && !ArrayBuffer.isView(binding) && !(binding instanceof ArrayBuffer)) {
        throw new TypeError("SQLite parameters must be strings, numbers, bigints, binary values or null.");
      }
    }
  };
  const consume = (query, bindings) => {
    validateBindings(bindings);
    return storage.sql.exec(query, ...bindings).toArray();
  };
  const database = {
    exec(query) {
      consume(String(query), []);
    },
    prepare(query) {
      const sql = String(query);
      return {
        all(...bindings) {
          return consume(sql, bindings);
        },
        get(...bindings) {
          return consume(sql, bindings)[0];
        },
        iterate(...bindings) {
          validateBindings(bindings);
          return storage.sql.exec(sql, ...bindings)[Symbol.iterator]();
        },
        run(...bindings) {
          consume(sql, bindings);
          // rowsWritten also counts index changes, unlike DatabaseSync.run().
          // SQLite's changes() preserves the application's affected-row contract.
          const result = consume("SELECT changes() AS changes, last_insert_rowid() AS lastInsertRowid", [])[0];
          return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
        },
      };
    },
    transactionSync(callback) {
      return storage.transactionSync(() => {
        const result = callback();
        if (result && typeof result.then === "function") {
          throw new TypeError("SQLite transaction callbacks must finish synchronously.");
        }
        return result;
      });
    },
  };
  return database;
}
