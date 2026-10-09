"use strict";
// Publish the same public files as the Node server. Never copy the repository,
// private revision bank, provider configuration, databases or migration tools.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist", "cloudflare");
const files = [
  "index.html", "app.js", "theme-init.js", "learning-model.js", "revision-session.js",
  "practice-drafts.js", "policy-content.js", "pseudocode-engine.js", "pseudocode-worker.js",
  "pseudocode-practice.js", "workspace-navigation.js", "pseudocode-drafts.js", "pseudocode.css",
  "ocr-content.js", "service-worker.js", "manifest.webmanifest", "styles.css", "student-layout.css",
  "UIVERSE-LICENSE.txt", "revision-generator.js", "neat-questions.js", "favicon.svg",
];
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(output, file));
fs.copyFileSync(path.join(root, "app.js"), path.join(output, "app-relaunch.js"));
fs.copyFileSync(path.join(root, "styles.css"), path.join(output, "styles-relaunch.css"));
fs.writeFileSync(path.join(output, "_headers"), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
/pseudocode-worker.js
  Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'none'
/service-worker.js
  Cache-Control: no-cache
`);
console.log(`Built ${files.length + 2} public files for Cloudflare.`);
