"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { chromium } = require(process.env.NEAT_PLAYWRIGHT_PATH || "playwright");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-navigation-"));
const output = path.join(root, "test-results/navigation-redesign");
fs.mkdirSync(output, { recursive: true });
const port = 6100 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const checks = [], errors = [], leaks = [];
const privateMarker = "PRIVATE-NAVIGATION-DRAFT";
const server = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, RECALLSTRIDE_SKIP_DOTENV: "true", NODE_ENV: "development",
    PORT: String(port), BASE_URL: base, CORS_ORIGIN: base,
    DATABASE_PATH: path.join(temp, "fixture.sqlite"), ALLOW_MOCK_BILLING: "true",
    AUTH_RATE_LIMIT: "200", REVISION_RATE_LIMIT: "400", CONTACT_RETRY_INTERVAL_MS: "0",
    SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
});
let browser, logs = "";
server.stdout.on("data", chunk => { logs += chunk; });
server.stderr.on("data", chunk => { logs += chunk; });

function observe(page) {
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (request.url().includes("/api/") && (request.postData() || "").includes(privateMarker)) leaks.push(request.url());
  });
}
async function ready(page) {
  await page.locator("#launch-overlay").waitFor({ state: "hidden" });
  await page.locator("#app-view").waitFor({ state: "visible" });
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
}
async function nav(page, section) {
  await page.locator(`.topbar-section-switch a[data-app-section="${section}"]`).click();
}
async function examReady(page) {
  await page.locator('#exam-practice-panel[aria-busy="true"]').waitFor({ state: "hidden" });
  await page.locator("#exam-answer").waitFor();
}
async function account(context, email, pro = false) {
  const response = await context.request.post(`${base}/api/auth/signup`, {
    data: { name: "Navigation Student", email, password: "NavigationPass123" },
  });
  assert.equal(response.status(), 201);
  const data = await response.json();
  await context.request.get(data.devVerificationUrl);
  const login = await context.request.post(`${base}/api/auth/login`, { data: { email, password: "NavigationPass123" } });
  assert.equal(login.status(), 200);
  await context.request.patch(`${base}/api/profile`, { data: { completeOnboarding: true } });
  await context.request.post(`${base}/api/revision/free-deck`, { data: { deckId: "cs-1-1-1" } });
  if (pro) assert.equal((await context.request.post(`${base}/api/billing/mock-upgrade`, { data: { plan: "pro" } })).status(), 200);
  return (await login.json()).user;
}
async function width(page, label) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, `${label}: ${JSON.stringify(dimensions)}`);
  const links = page.locator(".topbar-section-switch a");
  assert.equal(await links.count(), 5);
  assert.deepEqual((await links.allTextContents()).map(text => text.replace(/\s+/g, " ").trim().replace(/^[⌂▤✓↗]\s*/, "").replace(/^<\/>\s*/, "")), ["Today", "Revise", "Practice", "Code", "Progress"]);
  for (const link of await links.all()) {
    const box = await link.boundingBox();
    assert.ok(box && box.x >= -1 && box.x + box.width <= dimensions.viewport + 1, `${label}: navigation extends beyond the viewport`);
    assert.ok(box.y >= -1 && box.y + box.height <= (await page.viewportSize()).height + 1, `${label}: primary navigation is off screen`);
  }
}
function passed(name, detail) { checks.push({ name, ...(detail ? { detail } : {}) }); }

(async () => {
  try {
    for (let count = 0; ; count++) {
      if (server.exitCode !== null || count > 100) throw new Error(`Disposable fixture failed to start: ${logs}`);
      try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.NEAT_BROWSER_EXECUTABLE || undefined });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await account(context, "navigation-owner@example.test", true);
    const page = await context.newPage(); observe(page);
    await page.goto(`${base}/#/today`); await ready(page);
    await page.locator(".today-code-card").waitFor();
    assert.match(await page.locator(".today-code-card").innerText(), /60 coding tasks/);
    await screenshot(page, "today-desktop");
    passed("Today advertises the complete Code studio with a direct entry");

    for (const size of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width: size, height: 900 });
      await nav(page, "home"); await width(page, `Today ${size}px`);
      await nav(page, "coding"); await page.locator("#coding-source").waitFor(); await width(page, `Code ${size}px`);
      if (size === 390) {
        assert.equal(await page.locator("#coding-guidance").getAttribute("open"), null);
        const run = await page.locator("#coding-run").boundingBox();
        assert.ok(run.y + run.height < 820, `Mobile Run is too far down: ${JSON.stringify(run)}`);
        await screenshot(page, "code-mobile");
      }
    }
    passed("Five stable primary links and reachable Code controls at 1440, 768, 390 and 320px");
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto(`${base}/#/code?task=worksheet-4-7`); await ready(page); await page.locator("#coding-source").waitFor();
    assert.equal(await page.locator("#coding-task-select").inputValue(), "worksheet-4-7");
    const source = `print("${privateMarker} first")`;
    await page.locator("#coding-source").fill(source);
    await page.reload(); await ready(page); await page.locator("#coding-source").waitFor();
    assert.equal(await page.locator("#coding-task-select").inputValue(), "worksheet-4-7");
    assert.equal(await page.locator("#coding-source").inputValue(), source);
    await page.locator("#coding-task-select").selectOption("worksheet-5-1");
    await page.waitForURL(/#\/code\?task=worksheet-5-1$/);
    const secondSource = `print("${privateMarker} second")`; await page.locator("#coding-source").fill(secondSource);
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("#coding-task-select")?.value === "worksheet-4-7");
    assert.equal(await page.locator("#coding-source").inputValue(), source);
    await page.goForward(); await page.waitForFunction(() => document.querySelector("#coding-task-select")?.value === "worksheet-5-1");
    assert.equal(await page.locator("#coding-source").inputValue(), secondSource);
    assert.doesNotMatch(page.url(), new RegExp(privateMarker));
    passed("Direct task links, refresh and browser Back/Forward restore the right project without URL source content");

    await nav(page, "practice");
    assert.equal(await page.locator(".practice-choice:visible").count(), 4);
    assert.equal(await page.locator('[data-practice-mode="coding"]').count(), 0);
    assert.equal(await page.locator("#quick-practice-section").isVisible(), false);
    await screenshot(page, "practice-desktop");
    await page.locator('[data-practice-mode="exam"]').click();
    await page.waitForURL(/#\/practice\/exam/); await page.locator("#exam-practice-panel[aria-busy]").waitFor({ state: "hidden" });
    assert.equal(await page.locator("#exam-practice-section").isVisible(), true);
    await page.locator("#exam-answer").waitFor();
    assert.equal(await page.locator("#practice-mode-bar").isVisible(), false);
    await page.locator("#practice-activity-navigation a").click();
    assert.equal(await page.locator(".practice-choice:visible").count(), 4);
    await page.locator('[data-practice-mode="labs"]').click(); await page.waitForURL(/#\/practice\/labs/);
    await page.locator(".cs-lab-shell, .cs-lab-picker").first().waitFor();
    await page.locator("#practice-activity-navigation a").click();
    assert.equal(await page.locator(".practice-choice:visible").count(), 4);
    await page.goBack(); await page.locator(".cs-lab-shell, .cs-lab-picker").first().waitFor();
    passed("Practice offers four clear activities; exam/lab content loads, returns to the hub and resumes with browser Back");

    const prediction = page.locator('.cs-lab-shell input[type="radio"]').first();
    const predictionValue = await prediction.inputValue(); await prediction.check();
    await nav(page, "coding"); await page.locator("#coding-source").waitFor();
    await page.goBack(); await page.locator('.cs-lab-shell input[type="radio"]:checked').waitFor();
    assert.equal(await page.locator('.cs-lab-shell input[type="radio"]:checked').inputValue(), predictionValue);
    await page.locator("#exam-load-question-button").click(); await page.locator('[data-lab-id="lab-sql-query"]').click();
    const sqlDraft = "SELECT Name FROM Student WHERE Score >= "; await page.locator("#cs-lab-response").fill(sqlDraft);
    await nav(page, "coding"); await page.locator("#coding-source").waitFor();
    await page.goBack(); await page.locator("#cs-lab-response").waitFor();
    assert.equal(await page.locator("#cs-lab-response").inputValue(), sqlDraft);
    passed("Unsubmitted lab predictions and SQL text survive leaving for Code and returning with browser Back");

    await nav(page, "revise"); await page.locator('#neat-questions-grid [data-topic-id="cs-1-1-1"]').click();
    await nav(page, "practice"); await page.locator('[data-practice-mode="exam"]').click(); await examReady(page);
    const firstExamPrompt = await page.locator(".exam-question-card > h3").innerText();
    const firstExamDraft = "Processor-topic answer still being written."; await page.locator("#exam-answer").fill(firstExamDraft);
    await nav(page, "revise"); await page.locator('#neat-questions-grid [data-topic-id="cs-1-1-2"]').click();
    await nav(page, "practice"); await page.locator('[data-practice-mode="exam"]').click(); await examReady(page);
    assert.equal(await page.locator("#component-topic-select").inputValue(), "cs-1-1-2");
    assert.notEqual(await page.locator(".exam-question-card > h3").innerText(), firstExamPrompt);
    assert.notEqual(await page.locator("#exam-answer").inputValue(), firstExamDraft);
    await page.locator("#exam-answer").fill("Second-topic draft stays with the second question.");
    await nav(page, "revise"); await page.locator('#neat-questions-grid [data-topic-id="cs-1-1-1"]').click();
    await nav(page, "practice"); await page.locator('[data-practice-mode="exam"]').click(); await examReady(page);
    assert.equal(await page.locator(".exam-question-card > h3").innerText(), firstExamPrompt);
    assert.equal(await page.locator("#exam-answer").inputValue(), firstExamDraft);
    passed("Changing course topics opens the matching exam question and restores each topic’s own unsent answer");

    let releaseExamAttempt, seenExamAttempt;
    const examAttemptSeen = new Promise(resolve => { seenExamAttempt = resolve; });
    await page.route("**/api/exam/attempts", async route => {
      const response = await route.fetch(); seenExamAttempt();
      await new Promise(resolve => { releaseExamAttempt = resolve; }); await route.fulfill({ response });
    });
    await page.locator('[data-exam-answer-form] button[type="submit"]').click(); await examAttemptSeen;
    await nav(page, "practice"); await page.locator('[data-practice-mode="labs"]').click(); await page.locator(".cs-lab-shell").waitFor();
    const pendingSubmitLab = await page.locator(".cs-lab-shell h3").innerText();
    const submittedResponse = page.waitForResponse(response => response.url().endsWith("/api/exam/attempts") && response.request().method() === "POST");
    releaseExamAttempt(); assert.equal((await submittedResponse).ok(), true);
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
    assert.equal(await page.locator(".cs-lab-shell h3").innerText(), pendingSubmitLab);
    assert.equal(await page.locator(".guided-answer-review").count(), 0);
    await page.unroute("**/api/exam/attempts");
    await page.goto(`${base}/#/practice/exam?component=h446-01&topic=cs-1-1-1`); await page.locator(".guided-answer-review").waitFor();
    assert.match(await page.locator(".guided-answer-review").innerText(), new RegExp(firstExamDraft.replace(/\./g, "\\.")));
    passed("Delayed written-answer feedback stays with its question and cannot overwrite a lab opened while submission finishes");

    await page.locator("#practice-activity-navigation a").click(); await page.locator('[data-practice-mode="mock"]').click();
    await page.locator("#mini-mock-answer").waitFor();
    const mockQuestion = await page.locator("#mini-mock-answer").getAttribute("data-question-id");
    const mockDraft = "Component one mock answer, unfinished."; await page.locator("#mini-mock-answer").fill(mockDraft);
    await page.locator("#mini-mock-confidence").selectOption("medium"); await page.locator("[data-mock-flag]").click();
    const initialMockTime = await page.locator("#mini-mock-time").innerText();
    await nav(page, "revise"); await page.locator('[data-component="h446-02"]').first().click();
    await nav(page, "coding"); await page.locator("#coding-source").waitFor();
    await page.goBack(); await page.locator("#course-library-section").waitFor({ state: "visible" });
    await page.goBack(); await page.locator("#mini-mock-answer").waitFor();
    assert.match(await page.locator(".mini-mock-head h3").innerText(), /Component 1/);
    assert.equal(await page.locator("#mini-mock-answer").getAttribute("data-question-id"), mockQuestion);
    assert.equal(await page.locator("#mini-mock-answer").inputValue(), mockDraft);
    assert.equal(await page.locator("#mini-mock-confidence").inputValue(), "medium");
    assert.match(await page.locator("[data-mock-flag]").innerText(), /Remove flag/);
    const seconds = text => text.split(":").reduce((total, value) => total * 60 + Number(value), 0);
    assert.ok(seconds(await page.locator("#mini-mock-time").innerText()) <= seconds(initialMockTime));
    await page.reload(); await ready(page); await page.locator("#mini-mock-answer").waitFor();
    assert.equal(await page.locator("#mini-mock-answer").getAttribute("data-question-id"), mockQuestion);
    assert.equal(await page.locator("#mini-mock-answer").inputValue(), mockDraft);
    passed("An unfinished mini mock retains its original component, answer, question, flag, confidence and elapsed timer after switching components and reloading");

    let releaseExamFailure, seenExamRequest;
    const examRequestSeen = new Promise(resolve => { seenExamRequest = resolve; });
    const delayedExamPattern = "**/api/exam/questions?topicId=cs-1-1-3";
    await page.route(delayedExamPattern, async route => {
      seenExamRequest(); await new Promise(resolve => { releaseExamFailure = resolve; });
      await route.fulfill({ status: 503, json: { error: "Delayed exam fixture failure" } });
    });
    await page.goto(`${base}/#/practice/exam?component=h446-01&topic=cs-1-1-3`); await examRequestSeen;
    await nav(page, "practice"); await page.locator('[data-practice-mode="labs"]').click();
    await page.locator(".cs-lab-shell").waitFor();
    const activeLabTitle = await page.locator(".cs-lab-shell h3").innerText();
    const delayedResponse = page.waitForResponse(response => response.url().includes("/api/exam/questions?topicId=cs-1-1-3") && response.status() === 503);
    releaseExamFailure(); await delayedResponse;
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
    assert.equal(await page.locator(".cs-lab-shell h3").innerText(), activeLabTitle);
    assert.doesNotMatch(await page.locator("#exam-practice-panel").innerText(), /Delayed exam fixture failure/);
    await page.unroute(delayedExamPattern);
    passed("A delayed exam-load failure cannot replace the lab currently being used");

    await nav(page, "coding"); await page.locator("#coding-source").waitFor();
    assert.equal(await page.locator("#coding-source").inputValue(), secondSource);
    passed("Changing study destinations preserves the account’s coding project");

    await nav(page, "revise"); await page.locator("#course-library-section").waitFor({ state: "visible" });
    await page.locator('#neat-questions-grid [data-topic-id="cs-1-1-1"]').click();
    await page.locator(".focused-retrieval-card").waitFor();
    assert.equal(await page.locator("#course-library-section").isVisible(), false);
    await page.locator("#study-activity-navigation a").click();
    assert.equal(await page.locator("#course-library-section").isVisible(), true);
    await screenshot(page, "topics-desktop");
    await nav(page, "progress");
    await page.locator('#revision-mastery-map .mastery-dot[data-jump-topic="cs-1-1-2"]').click();
    await page.locator(".focused-retrieval-card").waitFor();
    assert.equal(await page.locator("#component-topic-select").inputValue(), "cs-1-1-2");
    assert.match(page.url(), /#\/revise\/cards.*topic=cs-1-1-2/);
    passed("Topic catalogue, flashcards, All topics and Progress-map actions form a working study loop");

    await page.locator("#global-search-button").click(); await page.locator("#global-search-input").fill("2.2.1");
    await page.locator('[data-search-kind="topic"][data-search-id="cs-2-2-1"]').click();
    await page.locator(".focused-retrieval-card").waitFor();
    assert.equal(await page.locator("#component-topic-select").inputValue(), "cs-2-2-1");
    assert.equal(await page.locator('[data-component="h446-02"]').first().getAttribute("aria-pressed"), "true");
    await page.locator("#global-search-button").click(); await page.locator("#global-search-input").fill("three dimensions");
    await page.locator('[data-search-kind="coding-task"][data-search-id="worksheet-4-7"]').click();
    await page.locator("#coding-source").waitFor();
    assert.equal(await page.locator("#coding-task-select").inputValue(), "worksheet-4-7");
    assert.equal(await page.locator("#coding-source").inputValue(), source);
    passed("Global search opens the correct component/topic and a specific coding task");

    await nav(page, "revise"); await page.locator('#neat-questions-grid [data-topic-id="cs-2-2-1"]').click();
    await page.locator("#revision-focus-button").click();
    assert.equal(await page.locator("#app-view").evaluate(element => element.classList.contains("revision-focus-active")), true);
    await page.goBack(); await page.locator("#course-library-section").waitFor({ state: "visible" });
    assert.equal(await page.locator("#app-view").evaluate(element => element.classList.contains("revision-focus-active")), false);
    assert.equal(await page.locator('.topbar-section-switch a[data-app-section="coding"]').isVisible(), true);
    passed("Browser Back leaves focus mode and restores the complete navigation");

    const modified = await page.locator('.topbar-section-switch a[data-app-section="coding"]').evaluate(link => {
      let prevented;
      const observe = event => { prevented = event.defaultPrevented; event.preventDefault(); };
      window.addEventListener("click", observe, { once: true });
      link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
      return { prevented, href: link.getAttribute("href") };
    });
    assert.equal(modified.prevented, false); assert.equal(modified.href, "#/code");
    passed("Modified clicks retain native link behaviour instead of changing the current app destination");

    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator("#workspace-notes-link").click(); await page.locator("#workspace-new-note-button").waitFor({ state: "visible" });
    await page.locator("#workspace-new-note-button").click();
    await page.locator("#note-body").fill("Navigation fixture note: one coherent workspace.");
    await page.getByText("All changes synced", { exact: true }).waitFor();
    await page.locator("#mobile-notes-button").click();
    assert.equal(await page.locator("#mobile-notes-button").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#notes-sidebar").isVisible(), true);
    await page.locator("#mobile-sidebar-close").click();
    assert.equal(await page.locator("#mobile-notes-button").getAttribute("aria-expanded"), "false");
    await width(page, "Mobile notes"); await screenshot(page, "notes-mobile");
    passed("Mobile notes provide reachable New note and Browse notes controls with a working close action");

    await account(context, "navigation-other@example.test");
    await page.goto(`${base}/#/code?task=worksheet-4-7`); await page.reload(); await ready(page); await page.locator("#coding-source").waitFor();
    assert.doesNotMatch(await page.locator("#coding-source").inputValue(), new RegExp(privateMarker));
    passed("A different account in the same browser cannot inherit another student’s project");

    const guest = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
    const guestPage = await guest.newPage(); observe(guestPage);
    await guestPage.goto(`${base}/#/code?task=worksheet-3-8`); await ready(guestPage); await guestPage.locator("#coding-source").waitFor();
    await guestPage.locator("#coding-source").fill(`print("${privateMarker} guest")`);
    await guestPage.locator(".global-account-menu summary").click(); await guestPage.locator('[data-global-action="signup"]').click();
    await guestPage.locator("#signup-name").fill("Code Return Student");
    await guestPage.locator("#signup-email").fill("navigation-return@example.test");
    await guestPage.locator("#signup-password").fill("NavigationPass123");
    const signingUp = guestPage.waitForResponse(response => response.url().endsWith("/api/auth/signup") && response.request().method() === "POST");
    await guestPage.locator("#signup-form button[type=submit]").click();
    const signedUp = await signingUp; assert.equal(signedUp.status(), 201);
    const returnData = await signedUp.json();
    const verified = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
    const returnPage = await verified.newPage(); observe(returnPage);
    await returnPage.goto(returnData.devVerificationUrl); await returnPage.locator("#launch-overlay").waitFor({ state: "hidden" });
    await returnPage.locator("#login-email").fill("navigation-return@example.test");
    await returnPage.locator("#login-password").fill("NavigationPass123");
    await returnPage.locator("#login-form button[type=submit]").click();
    await returnPage.locator("#coding-source").waitFor();
    if (await returnPage.locator("#onboarding-modal").isVisible()) await returnPage.getByRole("button", { name: "Set up later", exact: true }).click();
    assert.equal(await returnPage.locator("#coding-task-select").inputValue(), "worksheet-3-8");
    assert.doesNotMatch(await returnPage.locator("#coding-source").inputValue(), new RegExp(privateMarker));
    assert.match(returnPage.url(), /#\/code\?task=worksheet-3-8$/);
    assert.equal((await (await verified.request.get(`${base}/api/auth/continuation`)).json()).task, null);
    await guest.close(); await verified.close();
    passed("Guest signup, verification and login restore the same coding task without transferring guest source");

    assert.deepEqual(errors, []); assert.deepEqual(leaks, []);
    passed("No browser exceptions or private coding source in API payloads");
    fs.writeFileSync(path.join(output, "browser-results.json"), JSON.stringify({ passed: true, checks, errors, leaks }, null, 2));
    console.log(JSON.stringify({ passed: true, checks: checks.length, output }));
  } catch (error) {
    console.error(error);
    if (browser) {
      for (const [index, context] of browser.contexts().entries()) {
        const page = context.pages()[0];
        if (page && !page.isClosed()) { await screenshot(page, `failure-${index}`); fs.writeFileSync(path.join(output, `failure-${index}.txt`), await page.locator("body").innerText()); }
      }
    }
    fs.writeFileSync(path.join(output, "browser-results.json"), JSON.stringify({ passed: false, checks, errors, leaks, error: String(error) }, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
    if (server.exitCode === null) await once(server, "exit");
    fs.rmSync(temp, { recursive: true, force: true });
  }
})();
