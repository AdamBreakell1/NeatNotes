"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
function scripts(directory, recurse = true) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return recurse ? scripts(file) : [];
    return /\.(?:c?js)$/.test(entry.name) ? [file] : [];
  });
}
const files = [...scripts(root, false), ...scripts(path.join(root, "backend")), ...scripts(__dirname)];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} JavaScript files.`);
