"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { chromium } = require(process.env.NEAT_PLAYWRIGHT_PATH || "playwright");
const { REVISION_TOPICS } = require("../revision-topics.js");

const root = path.resolve(__dirname, "..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-ux-learning-"));
const output = path.join(root, "test-results/ux-learning");
fs.mkdirSync(output, { recursive: true });
const port = 6600 + Math.floor(Math.random() * 250);
const base = `http://127.0.0.1:${port}`;
const checks = [], errors = [];
const server = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, RECALLSTRIDE_SKIP_DOTENV: "true", NODE_ENV: "development",
    PORT: String(port), BASE_URL: base, CORS_ORIGIN: base,
    DATABASE_PATH: path.join(fixture, "fixture.sqlite"), ALLOW_MOCK_BILLING: "true",
    AUTH_RATE_LIMIT: "100", REVISION_RATE_LIMIT: "300", CONTACT_RETRY_INTERVAL_MS: "0",
    SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
});
let browser, logs = "";
server.stdout.on("data", chunk => { logs += chunk; });
server.stderr.on("data", chunk => { logs += chunk; });
const passed = text => checks.push(text);
function observe(page) {
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
}
async function ready(page) {
  await page.locator("#launch-overlay").waitFor({ state: "hidden" });
  await page.locator("#app-view").waitFor({ state: "visible" });
}
async function nav(page, section) {
  await page.locator(`.topbar-section-switch a[data-app-section="${section}"]`).click();
}
const duePanel = page => page.locator(".student-home-sections > section").filter({ hasText: "Due for review" });
async function guestNotes(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("neat-notes-guest-workspace")).notes);
}
async function signup(context) {
  const response = await context.request.post(`${base}/api/auth/signup`, {
    data: { name: "UX Learning Student", email: "ux-learning@example.test", password: "UXLearningPass123" },
  });
  assert.equal(response.status(), 201);
  const data = await response.json();
  await context.request.get(data.devVerificationUrl);
  assert.equal((await context.request.post(`${base}/api/auth/login`, {
    data: { email: "ux-learning@example.test", password: "UXLearningPass123" },
  })).status(), 200);
  assert.equal((await context.request.patch(`${base}/api/profile`, { data: { completeOnboarding: true } })).status(), 200);
}

(async () => {
  try {
    for (let count = 0; ; count++) {
      if (server.exitCode !== null || count > 100) throw new Error(`Disposable fixture failed to start: ${logs}`);
      try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.NEAT_BROWSER_EXECUTABLE || undefined });
    const guest = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await guest.addInitScript(() => {
      if (localStorage.getItem("ux-learning-seeded")) return;
      localStorage.setItem("ux-learning-seeded", "true");
      localStorage.setItem("neat-notes-landing-dismissed", "true");
      localStorage.setItem("neat-notes-guest-workspace", JSON.stringify({
        workspaces: [{ id: "demo-ocr-workspace", name: "UX guest notes", kind: "personal" }],
        members: [{ id: "guest", name: "Guest", email: "local", role: "local" }],
        notes: [
          { id: "older-note", workspace_id: "demo-ocr-workspace", owner_id: "guest", tag: "older",
            title: "Older selected note", summary: "Older summary", body: "Older note body", created_at: "2025-01-01T12:00:00Z", updated_at: "2025-01-01T12:00:00Z" },
          { id: "newest-note", workspace_id: "demo-ocr-workspace", owner_id: "guest", tag: "newest",
            title: "Newest named note", summary: "Newer summary", body: "Newest note body", created_at: "2026-01-01T12:00:00Z", updated_at: "2026-01-01T12:00:00Z" },
        ],
      }));
    });
    const page = await guest.newPage(); observe(page);
    await page.goto(`${base}/#/today`); await ready(page);
    assert.match(await page.locator('[data-student-action="note"]').locator("..").innerText(), /Newest named note/);
    await page.locator('[data-student-action="note"]').click();
    assert.equal(await page.locator("#note-body").inputValue(), "Newest note body");
    await page.locator('.folder-button[data-tag="older"]').click();
    await page.locator("#search-input").fill("no-such-note");
    await nav(page, "home");
    await page.locator('[data-student-action="note"]').click();
    assert.equal(await page.locator("#note-body").inputValue(), "Newest note body");
    assert.equal(await page.locator("#search-input").inputValue(), "");
    assert.equal((await page.locator("#active-folder-label").innerText()).toLowerCase(), "all notes");
    passed("Today opens the note it names, clearing a different selected note, folder and search");

    const originalNotes = await guestNotes(page);
    await page.locator("#search-input").fill("no-such-note");
    assert.match(await page.locator("#notes-list").innerText(), /No notes match/);
    assert.equal(await page.locator("#notes-list [data-reset-demo]").count(), 0);
    await page.locator("[data-notes-clear-search]").click();
    assert.equal(await page.locator(".note-card").count(), 2);
    assert.deepEqual(await guestNotes(page), originalNotes);
    passed("No-match guest search recovers without replacing any notes");

    await page.locator('.folder-button[data-tag="older"]').click();
    await page.locator("#tag-input").fill("newest");
    await page.locator("[data-notes-show-all]").waitFor();
    assert.match(await page.locator("#notes-list").innerText(), /No notes in #older/);
    await page.locator("[data-notes-show-all]").click();
    assert.equal(await page.locator(".note-card").count(), 2);
    passed("An emptied folder offers Show all notes and retains both notes");

    await page.locator("#search-input").fill("no-such-note");
    await page.locator("[data-notes-create-note]").click();
    assert.equal(await page.locator("#search-input").inputValue(), "");
    assert.equal(await page.locator(".note-card").count(), 3);
    assert.equal(await page.locator("#note-body").inputValue(), "");
    assert.equal(await page.locator(".note-card.active").count(), 1);
    const beforeResetCancel = await guestNotes(page);
    page.once("dialog", dialog => dialog.dismiss());
    // The legacy sidebar utility is hidden by the student layout; its handler must still be safe.
    await page.locator("#reset-demo-workspace-button").evaluate(button => button.click());
    assert.deepEqual(await guestNotes(page), beforeResetCancel);
    passed("Create note clears its hiding search; cancelling explicit guest reset preserves all work");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#mobile-notes-button").click();
    await page.locator("#search-input").fill("no-mobile-match");
    await page.locator("#mobile-sidebar-close").click();
    await page.locator("[data-notes-clear-search]").click();
    assert.equal(await page.locator("#search-input").isVisible(), false);
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest(".note-card"))), true);
    assert.equal(await page.locator(".note-card").count(), 3);
    passed("Mobile search recovery returns focus to a visible note instead of the closed sidebar");
    await page.screenshot({ path: path.join(output, "guest-notes.png") });
    await guest.close();

    const account = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await signup(account);
    const student = await account.newPage(); observe(student);
    await student.goto(`${base}/#/today`); await ready(student);
    assert.equal(await duePanel(student).locator(".section-title span").last().innerText(), "0");
    assert.match(await duePanel(student).innerText(), /No scheduled reviews are due/);
    await student.getByRole("button", { name: "Choose a topic", exact: true }).click();
    assert.equal(await student.locator("#course-library-section").isVisible(), true);
    assert.equal(await student.locator(".revision-stage").isVisible(), false);
    passed("First-use Choose a topic opens the catalogue; unstudied concepts are not labelled due");

    await student.locator("#workspace-notes-link").click();
    assert.match(await student.locator("#notes-list").innerText(), /No notes here yet/);
    assert.equal(await student.locator("#reset-demo-workspace-button").isVisible(), false);
    await student.locator("[data-notes-create-note]").click();
    await student.locator(".note-card").waitFor();
    await student.locator("#note-body").fill("# Account fixture note\nAn explanation kept in this account.");
    await student.locator("#save-state").filter({ hasText: "All changes synced" }).waitFor();
    const workspacesBefore = await (await account.request.get(`${base}/api/workspaces`)).json();
    const workspaceId = workspacesBefore.workspaces[0].id;
    const notesBefore = await (await account.request.get(`${base}/api/notes?workspaceId=${workspaceId}`)).json();
    await student.locator("#search-input").fill("no-account-match");
    assert.equal(await student.locator("#notes-list [data-reset-demo]").count(), 0);
    await student.locator("[data-notes-clear-search]").click();
    await student.locator("#reset-demo-workspace-button").evaluate(button => button.click());
    assert.deepEqual(await (await account.request.get(`${base}/api/workspaces`)).json(), workspacesBefore);
    assert.deepEqual(await (await account.request.get(`${base}/api/notes?workspaceId=${workspaceId}`)).json(), notesBefore);
    assert.equal(await student.locator("#workspace-title").innerText(), workspacesBefore.workspaces[0].name);
    passed("Authenticated empty/search states create and recover account notes without demo access or workspace changes");

    assert.equal((await account.request.post(`${base}/api/revision/free-deck`, { data: { deckId: "cs-1-1-1" } })).status(), 200);
    const firstTopic = REVISION_TOPICS.find(topic => topic.id === "cs-1-1-1");
    const inaccessibleTopic = REVISION_TOPICS.find(topic => topic.id === "cs-1-1-2");
    assert.ok(firstTopic.cards.length >= 16);
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    const schedules = firstTopic.cards.slice(0, 14).map(card => ({ concept_id: `${firstTopic.id}:${card.id}`, next_review_at: past }));
    schedules.push({ concept_id: `${firstTopic.id}:${firstTopic.cards[14].id}`, next_review_at: future },
      { concept_id: `${firstTopic.id}:${firstTopic.cards[15].id}`, next_review_at: "invalid-date" },
      { concept_id: `${inaccessibleTopic.id}:${inaccessibleTopic.cards[0].id}`, next_review_at: past });
    await student.route("**/api/revision/history", async route => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), schedules } });
    });
    await student.goto(`${base}/#/today`); await student.reload(); await ready(student);
    await student.waitForFunction(() => navigationReady);
    assert.equal(await duePanel(student).locator(".section-title span").last().innerText(), "14");
    assert.equal(await duePanel(student).getByRole("button").innerText(), "Start a short revision session");
    passed("Due count covers all 14 accessible scheduled reviews beyond the preview, excluding new, future, invalid and inaccessible concepts");

    await nav(student, "revise");
    await student.locator('#neat-questions-grid [data-topic-id="cs-1-1-1"]').click();
    await nav(student, "progress");
    assert.equal(await student.locator("#revision-session-label").innerText(), "Current deck session");
    assert.equal(await student.locator("#revision-session-topic").innerText(), "1.1.1 Structure of the processor");
    await nav(student, "home");
    await duePanel(student).getByRole("button").click();
    await nav(student, "progress");
    assert.equal(await student.locator("#revision-session-label").innerText(), "Current topic · 5-minute session");
    await nav(student, "home");
    await duePanel(student).getByRole("button").click();
    let reviewed = 0;
    while (await student.locator(".focused-retrieval-card").count()) {
      assert.ok(reviewed++ < 8, "Short adaptive session must remain bounded");
      await student.getByRole("button", { name: "Reveal answer", exact: true }).click();
      await student.getByRole("button", { name: "Good", exact: true }).click();
    }
    await nav(student, "progress");
    assert.equal(await student.locator("#revision-session-label").innerText(), "5-minute revision session");
    assert.match(await student.locator("#revision-session-topic").innerText(), /^\d+ retrieval activities reviewed$/);
    assert.equal(await student.locator("#revision-progress-percent").innerText(), "100%");
    passed("Progress identifies deck, active adaptive topic and completed adaptive session without changing percentages");

    assert.equal((await account.request.post(`${base}/api/billing/mock-upgrade`, { data: { plan: "pro" } })).status(), 200);
    await student.goto(`${base}/#/progress?component=h446-02`); await student.reload(); await ready(student);
    assert.equal(await student.locator("#revision-session-label").innerText(), "Current deck session");
    assert.match(await student.locator("#revision-session-topic").innerText(), /^2\.1\.1 /);
    assert.match(await student.locator("#progress-component-label").innerText(), /Component 2/i);
    await student.screenshot({ path: path.join(output, "progress-context.png") });
    passed("Progress topic context follows a changed component");
    assert.deepEqual(errors, []);
    passed("No browser exceptions in the focused learning and Notes journeys");
    fs.writeFileSync(path.join(output, "browser-results.json"), JSON.stringify({ passed: true, checks, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, checks: checks.length, output }));
  } catch (error) {
    console.error(error);
    if (browser) for (const [index, context] of browser.contexts().entries()) {
      const page = context.pages()[0];
      if (page && !page.isClosed()) {
        await page.screenshot({ path: path.join(output, `failure-${index}.png`) });
        fs.writeFileSync(path.join(output, `failure-${index}.txt`), await page.locator("body").innerText());
      }
    }
    fs.writeFileSync(path.join(output, "browser-results.json"), JSON.stringify({ passed: false, checks, errors, error: String(error) }, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
    if (server.exitCode === null) await once(server, "exit");
    fs.rmSync(fixture, { recursive: true, force: true });
  }
})();
