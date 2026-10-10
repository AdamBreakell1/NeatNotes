"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { DatabaseSync } = require("node:sqlite");
const { createApplication } = require("../server");
const { loadTopics, isReleased } = require("./services/contentRepository");

test("public discovery links, canonical pages and sitemap agree without an account", async () => {
  const db = new DatabaseSync(":memory:");
  const application = createApplication({ db, runtime: { scheduleCleanup: false }, environment: {
    NODE_ENV: "production", BASE_URL: "https://recallstride.com", CONTACT_RETRY_INTERVAL_MS: "0",
    POLICY_OPERATOR_NAME: "Fixture Operator", POLICY_POSTAL_ADDRESS: "1 Example Street, Leeds, LS1 1AA",
  } });
  const server = application.app.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await (await fetch(base)).text();
    const landing = home.match(/<main\s[^>]*id="landing-view"[^>]*>/)?.[0];
    assert.ok(landing && !/\bhidden\b/.test(landing), "The public landing must be in the initial visible HTML.");
    assert.match(home, /rel="canonical" href="https:\/\/recallstride\.com\/"/);
    const homeLinks = [...home.matchAll(/href="(\/ocr-h446\/[^"#]+)"/g)].map((match) => match[1]);
    const topics = loadTopics().filter((topic) => isReleased(topic, true));
    assert.deepEqual(homeLinks, topics.map((topic) => `/ocr-h446/${topic.code}`));
    const sitemap = await (await fetch(base + "/sitemap.xml")).text();
    const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    assert.deepEqual(sitemapUrls, ["https://recallstride.com/", ...homeLinks.map((link) => "https://recallstride.com" + link)]);
    const robots = await (await fetch(base + "/robots.txt")).text();
    assert.match(robots, /Sitemap: https:\/\/recallstride\.com\/sitemap.xml/);
    assert.match(robots, /Disallow: \/api\//);
    const first = await (await fetch(base + homeLinks[0])).text();
    const last = await (await fetch(base + homeLinks.at(-1))).text();
    assert.notEqual(first.match(/<title>(.+?)<\/title>/)?.[1], last.match(/<title>(.+?)<\/title>/)?.[1]);
    assert.match(first, /itemtype="https:\/\/schema.org\/LearningResource"/);
    assert.ok(first.includes(`href="https://recallstride.com${homeLinks[1]}"`), "Topic pages link to other real previews.");
    assert.match(first, /not endorsed by OCR/);
    assert.equal((await fetch(base + "/does-not-exist")).status, 404);
    const duplicate = await fetch(base + "/index.html?signup=1", { redirect: "manual" });
    assert.equal(duplicate.status, 308); assert.equal(duplicate.headers.get("location"), "/?signup=1");
    for (const route of ["/api/session", "/?reset=synthetic-token"]) {
      const response = await fetch(base + route);
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    }
    assert.equal((await fetch(base + "/?reset=synthetic-token")).headers.get("cache-control"), "private, no-store");
  } finally { await new Promise((resolve) => server.close(resolve)); db.close(); }
});

test("Cloudflare prevents private and missing-document indexing without changing API responses", async () => {
  const { publicIndexRedirect, protectPublicResponse } = await import("./cloudflare/public-seo.mjs");
  const missing = protectPublicResponse(new Request("https://recallstride.com/missing-page"), new Response("<h1>Landing</h1>", { headers: { "Content-Type": "text/html" } }));
  assert.equal(missing.status, 404); assert.equal(missing.headers.get("x-robots-tag"), "noindex, nofollow");
  const homepage = new Response("<h1>Landing</h1>", { headers: { "Content-Type": "text/html" } });
  assert.equal(protectPublicResponse(new Request("https://recallstride.com/"), homepage), homepage);
  const api = protectPublicResponse(new Request("https://recallstride.com/api/notes"), Response.json({ id: "synthetic" }, { status: 201 }));
  assert.equal(api.status, 201); assert.deepEqual(await api.json(), { id: "synthetic" });
  assert.equal(api.headers.get("x-robots-tag"), "noindex, nofollow");
  const action = protectPublicResponse(new Request("https://recallstride.com/?reset=synthetic-token"), new Response("Reset", { headers: { "Content-Type": "text/html" } }));
  assert.equal(action.headers.get("cache-control"), "private, no-store");
  assert.equal(action.headers.get("x-robots-tag"), "noindex, nofollow");
  const redirect = publicIndexRedirect(new Request("https://recallstride.com/index.html?signup=1"));
  assert.equal(redirect.status, 308); assert.equal(redirect.headers.get("location"), "https://recallstride.com/?signup=1");
  assert.equal(publicIndexRedirect(new Request("https://recallstride.com/api/notes", { method: "POST" })), null);
});
