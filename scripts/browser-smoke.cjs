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
const server = spawn(process.execPath, [path.join(root, "server.js")], {
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
  const widths = await page.evaluate(() => ({ viewport: innerWidth, body: document.documentElement.scrollWidth }));
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
    const claim = await context.request.post(`${base}/api/revision/free-deck`, { data: { deckId: "cs-1-1-1" } });
    assert.equal(claim.status(), 200);
    await page.reload();
    await dismissLaunch(page);
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
