"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { chromium } = require(process.env.NEAT_PLAYWRIGHT_PATH || "playwright");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "neat-browser-"));
const output = path.join(root, "test-results/student-relaunch");
fs.mkdirSync(output, { recursive: true });
const port = 5200 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
let server = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PORT: String(port), BASE_URL: base, CORS_ORIGIN: base, DATABASE_PATH: path.join(temp, "fixture.sqlite"), NODE_ENV: "development", ALLOW_MOCK_BILLING: "true", AUTH_RATE_LIMIT: "100", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
});
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });
let browser;
const errors = [];
const evidence = [];

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}
async function checkWidth(page, label) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const widths = await page.evaluate(() => ({ viewport: innerWidth, body: document.documentElement.scrollWidth }));
  if (widths.body > widths.viewport + 1) {
    await screenshot(page, "overflow-failure");
    console.error(await page.evaluate(() => [...document.querySelectorAll("body *")].filter((element) => {
      const rect = element.getBoundingClientRect(); return rect.width && (rect.right > innerWidth + 1 || rect.left < -1);
    }).slice(0, 18).map((element) => ({ tag: element.tagName, id: element.id, className: element.className, width: element.getBoundingClientRect().width }))));
  }
  assert.ok(widths.body <= widths.viewport + 1, `${label}: overflow ${JSON.stringify(widths)}`);
  evidence.push(`${label}: no document overflow`);
}
async function navigate(page, section) {
  const buttons = page.locator(`button[data-app-section="${section}"]:visible`);
  await buttons.first().click();
}
async function dismissLaunch(page) {
  await page.locator("#launch-overlay").waitFor({ state: "hidden", timeout: 10000 });
}

(async () => {
  try {
    for (let count = 0; ; count++) {
      if (server.exitCode !== null) throw new Error(logs);
      try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
      if (count > 100) throw new Error("Local fixture failed to start");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.NEAT_BROWSER_EXECUTABLE || undefined });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript(() => localStorage.setItem("neat-notes-learning-mode", "teacher"));
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/\/api\/(classes|centres|assignments)(?:\/|$|\?)/.test(request.url())) errors.push(`Retired workflow requested: ${request.url()}`);
    });
    await page.goto(base);
    await dismissLaunch(page);
    assert.equal(await page.locator('[data-app-section="teacher"], #teacher-mode-panel, #student-class-panel, #landing-schools').count(), 0);
    assert.match(await page.title(), /RecallStride/);
    assert.doesNotMatch(await page.locator("body").innerText(), /Neat Notes|Teacher dashboard|Create class|Join class/i);
    evidence.push("Student-only shell omits retired workflows and ignores old learning-mode preferences");
    await screenshot(page, "landing-desktop");
    await page.getByRole("button", { name: "Try a revision session", exact: true }).click();
    await page.locator(".focused-retrieval-card").waitFor();
    assert.equal(await page.locator(".focused-retrieval-card").count(), 1);
    assert.equal(await page.locator(".retrieval-answer").count(), 0);
    assert.equal(await page.getByRole("button", { name: "Good", exact: true }).count(), 0);
    const prompt = await page.locator(".focused-retrieval-card h3").innerText();
    await screenshot(page, "retrieve-desktop");
    await page.getByRole("button", { name: "Reveal answer", exact: true }).click();
    assert.equal(await page.locator(".retrieval-answer").count(), 1);
    await page.getByRole("button", { name: "Good", exact: true }).click();
    assert.notEqual(await page.locator(".focused-retrieval-card h3").innerText(), prompt);
    evidence.push("Guest demo: one activity, answer/rating absent before reveal, next activity after rating");

    await page.locator(".global-account-menu summary").click();
    await page.locator('[data-global-action="login"]').click();
    assert.equal(await page.locator(".google-button:visible").count(), 0);
    const signup = await context.request.post(`${base}/api/auth/signup`, { data: { name: "Browser Student", email: "browser@example.test", password: "BrowserPass123" } });
    assert.equal(signup.status(), 201);
    const signupData = await signup.json();
    await context.request.get(signupData.devVerificationUrl);
    await page.locator("#login-email").fill("browser@example.test");
    await page.locator("#login-password").fill("BrowserPass123");
    await page.locator("#login-form button[type=submit]").click();
    await page.locator("#menu-profile-avatar").waitFor({ state: "visible" });
    if (await page.locator("#onboarding-modal").isVisible()) await page.getByRole("button", { name: "Set up later" }).click();
    await context.request.patch(`${base}/api/profile`, { data: { completeOnboarding: true } });
    assert.equal(await page.locator("#topbar-login-button:visible").count(), 0);
    assert.match(await page.locator("#topbar-user-label").innerText(), /Browser/);
    const returnSignup = await context.request.post(`${base}/api/auth/signup`, { data: { name: "Return Student", email: "return@example.test", password: "ReturnPass123", returnTask: { section: "practice", topicId: "cs-1-1-2", practiceMode: "exam" } } });
    const returnData = await returnSignup.json();
    const otherBrowser = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const returnPage = await otherBrowser.newPage();
    returnPage.on("pageerror", (error) => errors.push(error.message));
    await returnPage.goto(returnData.devVerificationUrl);
    await dismissLaunch(returnPage);
    await returnPage.locator("#login-email").fill("return@example.test");
    await returnPage.locator("#login-password").fill("ReturnPass123");
    await returnPage.locator("#login-form button[type=submit]").click();
    await returnPage.locator("#menu-profile-avatar").waitFor({ state: "visible" });
    await returnPage.locator('#revision-view[data-student-view="practice"]').waitFor({ timeout: 10000 }).catch(async (error) => {
      console.error(await returnPage.locator("body").innerText());
      console.error(await otherBrowser.request.get(`${base}/api/auth/continuation`).then((r) => r.json()));
      throw error;
    });
    if (await returnPage.locator("#onboarding-modal").isVisible()) await returnPage.getByRole("button", { name: "Set up later" }).click();
    assert.equal(await returnPage.locator("#component-topic-select").inputValue(), "cs-1-1-2");
    assert.equal((await otherBrowser.request.get(`${base}/api/auth/continuation`).then((r) => r.json())).task, null);
    assert.equal((await otherBrowser.request.get(`${base}/api/profile`).then((r) => r.json())).user.freeRevisionDeckId, null);
    evidence.push("Verification in another browser restores only the owning account's topic/mode; no automatic free-deck claim");
    await otherBrowser.close();
    const claim = await context.request.post(`${base}/api/revision/free-deck`, { data: { deckId: "cs-1-1-1" } });
    assert.equal(claim.status(), 200);
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator("[data-open-repair]").click();
    await page.locator('[data-repair-id="repair-address-data"]').click();
    assert.equal(await page.locator("#repair-response").count(), 0);
    await page.locator("[data-repair-step]").click();
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator("[data-open-repair]").click();
    assert.match(await page.locator(".repair-step-count").innerText(), /Step 2 of 3/);
    for (let step = 0; step < 2; step++) await page.locator("[data-repair-step]").click();
    await page.locator("#repair-response").fill("17");
    await navigate(page, "notes");
    await navigate(page, "practice");
    assert.equal(await page.locator("#repair-response").inputValue(), "17");
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator("[data-open-repair]").click();
    assert.equal(await page.locator("#repair-response").inputValue(), "17");
    await page.locator("[data-close-repair]").click();
    await context.setOffline(true);
    await page.locator("[data-open-repair]").click();
    await page.getByText("You are offline.", { exact: false }).waitFor();
    await context.setOffline(false);
    await page.locator("[data-repair-reload]").click();
    assert.equal(await page.locator("#repair-response").inputValue(), "17");
    await context.setOffline(true);
    await page.locator("#repair-answer-form button").click();
    await page.getByText("You are offline. Your response is saved", { exact: false }).waitFor();
    assert.equal(await page.locator("#repair-response").inputValue(), "17");
    await context.setOffline(false);
    evidence.push("Worked example draft survives navigation/reload and offline retry without submitting or losing its answer");
    await page.locator("#repair-answer-form button").click();
    assert.match(await page.locator(".repair-result").innerText(), /Expected answer: 64/);
    await page.locator("[data-repair-next]").click();
    await page.locator("#repair-response").fill("93");
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator("[data-open-repair]").click();
    assert.match(await page.locator('#repair-answer-form label').innerText(), /value received by the MDR/);
    assert.equal(await page.locator("#repair-response").inputValue(), "93");
    await page.locator("#repair-answer-form button").click();
    assert.match(await page.locator(".repair-result").innerText(), /Correct application/);
    assert.match(await page.locator(".repair-result").innerText(), /not an exam mark/);
    await page.setViewportSize({ width: 390, height: 844 });
    await checkWidth(page, "Worked example on mobile");
    await screenshot(page, "repair-mobile");
    await page.locator("[data-close-repair]").first().click();
    await page.setViewportSize({ width: 1280, height: 900 });
    evidence.push("Worked repair: progressive steps, wrong-answer correction, different retry and truthful feedback");
    await context.request.post(`${base}/api/auth/login`, { data: { email: "return@example.test", password: "ReturnPass123" } });
    await context.request.post(`${base}/api/revision/free-deck`, { data: { deckId: "cs-1-1-1" } });
    await page.reload();
    await dismissLaunch(page);
    if (await page.locator("#onboarding-modal").isVisible()) await page.getByRole("button", { name: "Set up later" }).click();
    await navigate(page, "practice");
    await page.locator("[data-open-repair]").click();
    await page.locator('[data-repair-id="repair-address-data"]').waitFor();
    assert.equal(await page.locator("#repair-response").count(), 0);
    assert.equal(await page.locator('[data-repair-id="repair-address-data"]').count(), 1);
    await context.request.post(`${base}/api/auth/login`, { data: { email: "browser@example.test", password: "BrowserPass123" } });
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator("[data-open-repair]").click();
    assert.equal(await page.locator("#repair-response").inputValue(), "93");
    await page.locator("[data-close-repair]").click();
    evidence.push("Switching accounts in the same browser cannot restore another student's repair draft; original owner can resume");
    const originalDraft = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((key) => key.startsWith("neat-practice-draft:") && key.endsWith(":repair:cs-1-1-1"));
      const value = localStorage.getItem(key);
      const stale = JSON.parse(value);
      stale.data.contentVersion = "superseded-fixture-version";
      localStorage.setItem(key, JSON.stringify(stale));
      return { key, value };
    });
    await page.locator("[data-open-repair]").click();
    await page.locator('[data-repair-id="repair-address-data"]').waitFor();
    assert.equal(await page.locator("#repair-response").count(), 0);
    assert.match(await page.locator(".repair-player").innerText(), /changed or is no longer available/);
    await page.locator("[data-close-repair]").click();
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), originalDraft);
    evidence.push("Changed lesson version does not restore a stale response or step and explains why");
    await navigate(page, "notes");
    await page.locator("#new-note-button").click();
    await page.locator("#note-body").fill("# Browser retrieval note\n\n- The MAR holds the address.\n- The MDR holds the transferred data.");
    await page.getByText("All changes synced", { exact: true }).waitFor();
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "notes");
    assert.match(await page.locator("#note-body").inputValue(), /The MAR holds the address/);
    await navigate(page, "practice");
    await page.locator('[data-practice-mode="quick"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator('[data-practice-mode="exam"]').getAttribute("aria-selected"), "true");
    await page.keyboard.press("Home");
    assert.equal(await page.locator('[data-practice-mode="quick"]').getAttribute("aria-selected"), "true");
    evidence.push("Account note edits persist through reload; practice tabs support arrow/Home keyboard navigation");
    await navigate(page, "revise");
    await page.locator('[data-component="h446-02"]').first().click();
    assert.equal(await page.locator("#component-topic-select option").count(), 8);
    assert.match(await page.locator("#revision-card-grid").innerText(), /Pro/);
    evidence.push("Verified free account: profile replaces login; other component content is gated");

    const upgrade = await context.request.post(`${base}/api/billing/mock-upgrade`, { data: { plan: "pro" } });
    assert.equal(upgrade.status(), 200);
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "revise");
    await page.locator('[data-component="h446-02"]').first().click();
    await page.locator(".focused-retrieval-card").waitFor();
    assert.match(await page.locator("#component-content-status").innerText(), /review pending/i);
    await page.locator("#component-topic-select").selectOption("cs-2-3-1");
    assert.match(await page.locator("#revision-topic-title").innerText(), /Algorithms/);
    await screenshot(page, "component2-desktop");
    await navigate(page, "practice");
    await page.locator("#practice-length").selectOption("5");
    await page.locator("[data-start-current-quiz]").click();
    await page.locator(".neat-quiz-player").waitFor();
    assert.equal(await page.locator("#neat-questions-grid:visible").count(), 0);
    await page.locator("[data-quiz-option]").first().click();
    assert.equal(await page.locator(".neat-quiz-feedback").count(), 1);
    await screenshot(page, "quick-practice-desktop");
    const quizPrompt = await page.locator(".neat-quiz-question").innerText();
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator("#component-topic-select").selectOption("cs-2-3-1");
    await page.locator("[data-start-current-quiz]").click();
    assert.equal(await page.locator(".neat-quiz-question").innerText(), quizPrompt);
    assert.equal(await page.locator(".neat-quiz-feedback").count(), 1);
    assert.equal(await page.locator("[data-quiz-option]:enabled").count(), 0);
    evidence.push("Quiz reload restores the same marked question without allowing a duplicate answer");
    await page.locator('[data-practice-mode="exam"]').click();
    await page.locator("#exam-answer").waitFor();
    await page.locator("#exam-answer").fill("A partial explanation for guided review, not an automatic examiner mark.");
    const writtenPrompt = await page.locator(".exam-question-card > h3").innerText();
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator("#component-topic-select").selectOption("cs-2-3-1");
    await page.locator('[data-practice-mode="exam"]').click();
    await page.locator("#exam-answer").waitFor();
    assert.equal(await page.locator(".exam-question-card > h3").innerText(), writtenPrompt);
    assert.match(await page.locator("#exam-answer").inputValue(), /partial explanation/);
    await page.locator(".exam-answer-form button[type=submit]").click();
    await page.locator(".guided-answer-review").waitFor();
    assert.match(await page.locator(".guided-answer-review").innerText(), /not an examiner mark/);
    await screenshot(page, "written-review-desktop");
    await page.locator('[data-practice-mode="mock"]').click();
    await page.locator("#mini-mock-answer").fill("A draft answer that should survive a normal page refresh.");
    const mockPrompt = await page.locator(".mini-mock-question h3").innerText();
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator('[data-practice-mode="mock"]').click();
    await page.locator("#mini-mock-answer").waitFor();
    assert.equal(await page.locator(".mini-mock-question h3").innerText(), mockPrompt);
    assert.match(await page.locator("#mini-mock-answer").inputValue(), /survive a normal page refresh/);
    await page.locator('[data-practice-mode="exam"]').click();
    await page.locator("#exam-answer").waitFor();
    assert.equal(await page.locator(".mini-mock-shell:visible").count(), 0);
    evidence.push("Written question/draft and timed paper/draft resume after reload; practice modes replace the correct panel");
    await navigate(page, "home");
    await page.locator(".today-preview summary").click();
    const preview = await page.locator(".today-session-list li strong").allTextContents();
    await page.locator('[data-session-duration="15"]').click();
    assert.equal(await page.locator(".focused-retrieval-card h3").innerText(), preview[0]);
    await page.getByRole("button", { name: "Reveal answer", exact: true }).click();
    await page.getByRole("button", { name: "Good", exact: true }).click();
    assert.equal(await page.locator(".focused-retrieval-card h3").innerText(), preview[1]);
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "home");
    await page.getByRole("button", { name: "Resume revision", exact: true }).click();
    assert.equal(await page.locator(".focused-retrieval-card h3").innerText(), preview[1]);
    let delivered = 1;
    while (await page.locator(".focused-retrieval-card").count()) {
      if (delivered < preview.length) assert.equal(await page.locator(".focused-retrieval-card h3").innerText(), preview[delivered]);
      await page.getByRole("button", { name: "Reveal answer", exact: true }).click();
      await page.getByRole("button", { name: "Good", exact: true }).click();
      assert.ok(++delivered <= 30, "Session must end within its bounded queue");
    }
    assert.match(await page.locator(".deck-summary-panel").innerText(), /Session complete/i);
    await page.getByRole("button", { name: "Back to Today", exact: true }).click();
    evidence.push("Adaptive preview equals ordered delivery; refresh resumes the next card; bounded session completes and returns to Today");
    evidence.push("Local Pro editorial preview: 8 ordered C2 topics; focused quiz and guided written feedback work");

    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ["home", "revise", "practice", "progress", "notes", "contact"]) {
        if (section === "contact") {
          await page.locator(".global-account-menu summary").click();
          await page.locator('[data-global-action="contact"]').click();
        } else await navigate(page, section);
        await checkWidth(page, `${width}px ${section}`);
        if (section === "home" && [1280, 390].includes(width)) await screenshot(page, `today-${width}`);
      }
      if (width <= 900) {
        await page.locator(".global-account-menu summary").click();
        assert.equal(await page.locator('[data-global-action="settings"]:visible').count(), 1);
        assert.equal(await page.locator('[data-global-action="plans"]:visible').count(), 1);
        await page.locator('[data-global-action="settings"]').click();
        await screenshot(page, `settings-${width}`);
        await page.keyboard.press("Escape");
      }
      await navigate(page, "revise");
      await screenshot(page, `retrieve-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".global-account-menu summary").click();
    await page.locator('[data-global-action="theme"]').click();
    await screenshot(page, "retrieve-dark-mobile");
    await checkWidth(page, "dark mobile");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)))).flat());
    assert.ok(cached.includes("/"));
    assert.equal(cached.some((url) => url.startsWith("/api/") || url === "/revision-topics.js"), false);
    const publicTopic = await context.newPage();
    await publicTopic.goto(`${base}/ocr-h446/1.1.1`);
    await publicTopic.close();
    assert.match(await page.evaluate(async () => (await (await caches.match("/")).text())), /id="app-view"/);
    evidence.push("Offline cache contains shell assets only; public topic navigation cannot replace the app fallback");

    // Restart only this disposable fixture in production to exercise the actual publication gate.
    server.kill("SIGTERM");
    if (server.exitCode === null) await once(server, "exit");
    server = spawn(process.execPath, [path.join(root, "server.js")], {
      cwd: root, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(port), BASE_URL: base, CORS_ORIGIN: base, DATABASE_PATH: path.join(temp, "fixture.sqlite"), NODE_ENV: "production", ALLOW_MOCK_BILLING: "false", SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
    });
    server.stdout.on("data", (chunk) => { logs += chunk; });
    server.stderr.on("data", (chunk) => { logs += chunk; });
    for (let count = 0; ; count++) {
      if (server.exitCode !== null || count > 100) throw new Error(`Production fixture failed: ${logs}`);
      try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "practice");
    await page.locator('[data-component="h446-01"]').first().click();
    await page.locator("#component-topic-select").selectOption("cs-1-1-1");
    await page.locator('[data-practice-mode="quick"]').click();
    await page.locator("#practice-length").selectOption("5");
    const { DatabaseSync } = require("node:sqlite");
    const evidenceDb = new DatabaseSync(path.join(temp, "fixture.sqlite"), { readOnly: true });
    const countEvidence = () => evidenceDb.prepare("SELECT COUNT(*) AS total FROM learning_evidence").get().total;
    const beforeRecall = countEvidence();
    await page.locator("[data-start-current-quiz]").click();
    await page.locator("#recall-response").fill("My own recall attempt");
    assert.equal(await page.locator("[data-recall-rating]").count(), 0);
    await page.locator("[data-recall-reveal]").click();
    assert.match(await page.locator(".recall-comparison").innerText(), /not a verified result/);
    await page.locator('[data-recall-rating="revisit"]').click();
    await page.locator("#recall-response").fill("A saved second answer");
    await page.reload();
    await dismissLaunch(page);
    await navigate(page, "home");
    await page.locator(".today-tools summary").click();
    await page.locator('[data-student-action="saved-practice"]').click();
    assert.match(await page.locator(".recall-position").innerText(), /Question 2 of 5/);
    assert.equal(await page.locator("#recall-response").inputValue(), "A saved second answer");
    await checkWidth(page, "Production recall on mobile");
    await screenshot(page, "recall-mobile");
    await page.screenshot({ path: path.join(output, "recall-mobile-viewport.png"), fullPage: false });
    for (let index = 0; index < 4; index++) {
      await page.locator("[data-recall-reveal]").click();
      await page.locator('[data-recall-rating="recalled"]').click();
    }
    assert.match(await page.locator(".recall-player").innerText(), /do not change quiz accuracy/);
    assert.equal(countEvidence(), beforeRecall);
    evidenceDb.close();
    await page.locator("[data-recall-retry]").click();
    assert.match(await page.locator(".recall-position").innerText(), /Question 1 of 1/);
    await page.locator("[data-recall-pause]").click();
    await page.locator('[data-component="h446-02"]').first().click();
    assert.equal(await page.locator("[data-start-current-quiz]").isDisabled(), true);
    evidence.push("Production C1 fallback: recall before reveal, own reflection, reload resume, bounded finish and revisit; no mastery evidence writes; C2 stays gated");
    assert.deepEqual(errors, [], `Browser errors: ${errors.join("; ")}`);
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify({ passed: true, evidence, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, checks: evidence.length, output }, null, 2));
  } catch (error) {
    console.error(error.stack);
    const failedPage = browser?.contexts()[0]?.pages()[0];
    if (failedPage) {
      await screenshot(failedPage, "failure");
      console.error(await failedPage.evaluate(() => [...document.querySelectorAll("body *")].map((el) => ({ el, rect: el.getBoundingClientRect() })).filter(({ el, rect }) => rect.right > innerWidth + 1 && rect.width > 0 && getComputedStyle(el).visibility !== "hidden").slice(0, 25).map(({ el, rect }) => `${el.tagName}#${el.id}.${el.className}: ${rect.right}`)));
    }
    fs.writeFileSync(path.join(output, "results.json"), JSON.stringify({ passed: false, error: error.message, evidence, errors }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
    if (server.exitCode === null) await once(server, "exit");
    fs.rmSync(temp, { recursive: true, force: true });
  }
})();
