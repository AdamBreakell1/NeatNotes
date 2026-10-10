"use strict";

// Development-only export. Requires sharp, available in Codex's bundled runtime.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const source = __dirname;
  const names = ["first-post-square", "first-post-portrait", "first-post-story", "profile-avatar", "profile-header", "social-preview"];
  const exports = [];
  for (const name of names) {
    const target = path.join(source, `${name}.png`);
    await sharp(path.join(source, `${name}.svg`)).png({ compressionLevel: 9 }).toFile(target);
    const metadata = await sharp(target).metadata();
    exports.push({ name, width: metadata.width, height: metadata.height, format: metadata.format, bytes: (await fs.stat(target)).size });
  }
  for (const name of ["first-post-portrait", "profile-header"]) {
    const target = path.join(source, `${name}.jpg`);
    await sharp(path.join(source, `${name}.png`)).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toFile(target);
    const metadata = await sharp(target).metadata();
    exports.push({ name, width: metadata.width, height: metadata.height, format: metadata.format, bytes: (await fs.stat(target)).size });
  }
  const publicFolder = path.resolve(source, "../../assets");
  await fs.mkdir(publicFolder, { recursive: true });
  await fs.copyFile(path.join(source, "social-preview.png"), path.join(publicFolder, "recallstride-social-preview.png"));
  await fs.writeFile(path.join(source, "export-manifest.json"), `${JSON.stringify(exports, null, 2)}\n`);
  console.log(JSON.stringify(exports, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
