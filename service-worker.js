const CACHE_NAME = "neat-notes-shell-20261010-ui-r1";
const APP_SHELL = [
  "/",
  "/styles-relaunch.css?v=20260907-student-r1",
  "/student-layout.css?v=20261010-ui-r1",
  "/theme-init.js?v=20260824-relaunch",
  "/learning-model.js?v=20260911-student-only",
  "/revision-generator.js?v=20260907-student-r1",
  "/revision-session.js?v=20260907-student-r1",
  "/neat-questions.js?v=20260824-relaunch",
  "/practice-drafts.js?v=20260911-resume-r1",
  "/workspace-navigation.js?v=20261008-navigation-r1",
  "/app-relaunch.js?v=20261010-ui-r1",
  "/policy-content.js?v=20261007-code-studio-r2",
  "/pseudocode-drafts.js?v=20261007-code-studio-r2",
  "/pseudocode-practice.js?v=20261010-ux-r1",
  "/pseudocode.css?v=20261010-ui-r1",
  "/pseudocode-engine.js?v=rs-h446-2.0.0",
  "/pseudocode-worker.js?v=rs-h446-2.0.0",
  "/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/revision-topics.js") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only the public app shell belongs under /. Never cache account,
          // verification, shared-note or topic HTML as a navigation fallback.
          if (url.pathname === "/" && !url.search && response.ok && !response.redirected) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put("/", copy)));
          }
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  if (APP_SHELL.includes(url.pathname + url.search)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Other resources remain network-only, including personalised content.
});
