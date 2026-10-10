"use strict";

// Disposable accounts and intercepted failures only; this never calls a payment or mail provider.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { chromium } = require(process.env.NEAT_PLAYWRIGHT_PATH || "playwright");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-ux-account-"));
const port = 6550 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const checks = [], errors = [];
const server = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"],
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

function passed(name) { checks.push(name); }
async function focused(page, selector) {
  await page.waitForFunction(selector => document.activeElement === document.querySelector(selector), selector).catch(async error => {
    const state = await page.evaluate(() => ({ focused: document.activeElement?.id || document.activeElement?.tagName,
      dialogs: modalStack.map(entry => ({ id: entry.modal.id, origin: entry.returnFocus?.id || entry.returnFocus?.tagName })), appHidden: elements.appView.hidden }));
    throw new Error(`Expected focus on ${selector}; ${JSON.stringify(state)}. ${error.message}`);
  });
}
async function hidden(page, selector) { await page.locator(selector).waitFor({ state: "hidden" }); }
async function ready(page) { await hidden(page, "#launch-overlay"); }
async function fixtureAccount(context) {
  const data = { name: "UX Fixture", email: "ux-fixture@example.test", password: "UXFixturePass123" };
  const signup = await context.request.post(`${base}/api/auth/signup`, { data });
  assert.equal(signup.status(), 201);
  await context.request.get((await signup.json()).devVerificationUrl);
  assert.equal((await context.request.post(`${base}/api/auth/login`, { data })).status(), 200);
  await context.request.patch(`${base}/api/profile`, { data: { completeOnboarding: true } });
}
async function failRoute(page, route, message) {
  await page.route(`**${route}`, request => request.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ error: message }),
  }));
}

(async () => {
  try {
    for (let count = 0; ; count++) {
      if (server.exitCode !== null || count > 100) throw new Error(`Fixture failed to start: ${logs}`);
      try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.NEAT_BROWSER_EXECUTABLE || undefined });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base); await ready(page);
    const landingLogin = '.landing-nav [data-landing-action="login"]';
    await page.locator(landingLogin).click(); await focused(page, "#login-email");
    assert.equal(await page.locator("#landing-view").getAttribute("inert"), "");
    await page.locator("#close-auth-button").focus();
    await page.keyboard.press("Shift+Tab"); await focused(page, "#login-submit-button");
    await page.keyboard.press("Tab"); await focused(page, "#close-auth-button");
    await page.keyboard.press("Control+k");
    assert.equal(await page.locator("#global-search-modal").isVisible(), false);
    await page.locator("#show-login").focus();
    await page.keyboard.press("ArrowRight"); await focused(page, "#show-signup");
    assert.equal(await page.locator("#show-signup").getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#signup-form").isVisible(), true);
    await page.keyboard.press("Escape"); await hidden(page, "#auth-view");
    await focused(page, landingLogin);
    assert.equal(await page.locator("#landing-view").getAttribute("inert"), null);
    passed("Authentication traps focus, isolates its background, supports keyboard tabs and returns to its opener");

    await page.locator(landingLogin).click(); await focused(page, "#login-email");
    await page.locator("[data-auth-recovery]").click(); await focused(page, "#recovery-email");
    assert.equal(await page.locator(".auth-tabs").isVisible(), false);
    await page.locator("[data-auth-back-login]").click(); await focused(page, "#login-email");
    await page.keyboard.press("Escape");
    await page.goto(`${base}/?reset=synthetic-reset-token`); await ready(page);
    await focused(page, "#reset-password");
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await focused(page, "#reset-password");
    assert.equal(await page.locator("#login-form").isVisible(), false);
    await page.keyboard.press("Escape");
    passed("Recovery and reset keep focus in their visible form, including deferred reset focus");

    const pricingOpener = "[data-open-pricing-footer]";
    await page.locator(pricingOpener).click(); await focused(page, "#close-plans-button");
    await page.keyboard.press("Shift+Tab"); await focused(page, "[data-billing-portal]");
    await page.keyboard.press("Tab"); await focused(page, "#close-plans-button");
    await page.evaluate(() => openLegalModal("privacy"));
    await focused(page, "[data-close-legal].modal-close-button");
    await page.keyboard.press("Escape"); await hidden(page, "#legal-modal");
    assert.equal(await page.locator("#pricing-modal").isVisible(), true);
    assert.equal(await page.locator("body").evaluate(node => node.classList.contains("modal-open")), true);
    await focused(page, "#close-plans-button");
    await page.keyboard.press("Escape"); await focused(page, pricingOpener);
    passed("Stacked dialogs close only the top dialog and retain background isolation until the final close");

    await fixtureAccount(context);
    await page.goto(`${base}/#/today`); await page.reload(); await ready(page);
    await page.waitForFunction(() => currentUser?.email === "ux-fixture@example.test" && !isGuestMode);
    await page.route("**/api/account/sessions", request => request.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ sessions: [{ current: true }, { current: false }] }),
    }));
    let sessionActions = 0;
    await page.route("**/api/account/sessions/others", request => {
      sessionActions++;
      return request.fulfill({ status: sessionActions === 1 ? 503 : 200, contentType: "application/json",
        body: JSON.stringify(sessionActions === 1 ? { error: "Fixture session request failed. Please retry." } : { message: "Other devices signed out." }) });
    });
    await page.locator("#global-menu-label").click();
    await page.locator('[data-global-action="settings"]').click(); await focused(page, '[data-settings-tab="general"]');
    await page.keyboard.press("Home"); await focused(page, '[data-settings-tab="account"]');
    await page.keyboard.press("ArrowRight"); await focused(page, '[data-settings-tab="general"]');
    await page.keyboard.press("End"); await focused(page, '[data-settings-tab="data"]');
    assert.equal(await page.locator("#settings-data-panel").isVisible(), true);
    await page.keyboard.press("Home"); await focused(page, '[data-settings-tab="account"]');
    await page.keyboard.press("ArrowLeft"); await focused(page, '[data-settings-tab="data"]');
    await page.keyboard.press("Home");
    assert.equal(await page.locator("#settings-account-panel").getAttribute("aria-labelledby"), "settings-account-tab");
    await page.locator("#revoke-other-sessions-button").click();
    await page.waitForFunction(() => document.querySelector("#settings-message").textContent.includes("Fixture session"));
    assert.equal(await page.locator("#settings-message").isVisible(), true);
    assert.equal(await page.locator("#settings-data-panel").isVisible(), false);
    assert.equal(await page.locator("#revoke-other-sessions-button").isEnabled(), true);
    for (const size of [{ width: 390, height: 600 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(size);
      const bounds = await page.locator("#settings-message").boundingBox();
      const dialog = await page.locator(".settings-dialog").boundingBox();
      assert.ok(bounds && bounds.y >= -1 && bounds.y + bounds.height <= size.height + 1,
        `Settings feedback must fit the viewport: ${JSON.stringify({ size, bounds })}`);
      assert.ok(bounds.y >= dialog.y && bounds.y + bounds.height <= dialog.y + dialog.height + 1,
        "Settings feedback must stay inside the dialog clipping boundary");
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#revoke-other-sessions-button").click();
    await page.waitForFunction(() => document.querySelector("#settings-message").textContent === "Other devices signed out.");
    assert.equal(await page.locator("#settings-message").isVisible(), true);
    assert.equal(sessionActions, 2);
    passed("Every Settings panel is keyboard reachable and account action failure/success is visible with a working retry");

    await page.locator('[data-settings-tab="general"]').click();
    await page.locator('[data-theme-choice="dark"]').click();
    assert.equal(await page.locator('[data-theme-choice="dark"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator('[data-theme-choice="system"]').getAttribute("aria-pressed"), "false");
    assert.equal(await page.locator(".topbar-clock").getAttribute("aria-live"), null);
    const clock = await page.evaluate(() => {
      renderTopbarClock();
      const before = document.querySelector(".topbar-clock").textContent;
      const observer = new MutationObserver(() => {});
      observer.observe(document.querySelector(".topbar-clock"), { subtree: true, childList: true, characterData: true });
      renderTopbarClock();
      const mutations = observer.takeRecords().length;
      observer.disconnect();
      return { unchanged: before === document.querySelector(".topbar-clock").textContent, mutations };
    });
    if (clock.unchanged) assert.equal(clock.mutations, 0);
    await page.keyboard.press("Escape"); await focused(page, "#global-menu-label");
    passed("Theme selection is exposed accessibly and the passive clock avoids repeated text announcements");

    await failRoute(page, "/api/billing/checkout-session", "Fixture checkout temporarily unavailable. Please retry.");
    await failRoute(page, "/api/billing/customer-portal", "Fixture billing portal temporarily unavailable. Please retry.");
    await page.locator(pricingOpener).click(); await focused(page, "#close-plans-button");
    const proLabel = await page.locator('[data-plan="pro"]').textContent();
    await page.locator('[data-plan="pro"]').click();
    await page.waitForFunction(() => document.querySelector("#pricing-message").textContent.includes("Fixture checkout"));
    assert.equal(await page.locator("#pricing-message").isVisible(), true);
    assert.equal(await page.locator('[data-plan="pro"]').textContent(), proLabel);
    assert.equal(await page.locator('[data-plan="pro"]').isEnabled(), true);
    const portalLabel = await page.locator("[data-billing-portal]").textContent();
    await page.locator("[data-billing-portal]").click();
    await page.waitForFunction(() => document.querySelector("#pricing-message").textContent.includes("Fixture billing portal"));
    assert.equal(await page.locator("#pricing-message").isVisible(), true);
    assert.equal(await page.locator("[data-billing-portal]").textContent(), portalLabel);
    assert.equal(await page.locator("[data-billing-portal]").isEnabled(), true);
    await page.keyboard.press("Escape");
    passed("Checkout and billing failures stay visible inside pricing and preserve the original action labels");

    await page.evaluate(() => { document.activeElement.blur(); openPlansModal(); });
    await focused(page, "#close-plans-button");
    await page.keyboard.press("Escape"); await focused(page, "#workspace-page-title");
    passed("Dialogs opened without a focused control return to a visible workspace heading");

    await page.evaluate(() => setAppSection("notes"));
    await focused(page, "#workspace-page-title");
    await page.locator("#search-input").focus();
    await page.setViewportSize({ width: 390, height: 900 });
    await focused(page, "#mobile-notes-button");
    assert.equal(await page.locator("#search-input").isVisible(), false);
    for (let index = 0; index < 20; index++) {
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.querySelector("#notes-sidebar").contains(document.activeElement)), false);
    }
    await page.locator("#mobile-notes-button").click(); await focused(page, "#mobile-sidebar-close");
    assert.equal(await page.locator("#notes-sidebar").getAttribute("role"), "dialog");
    await page.evaluate(() => getModalControls(document.querySelector("#notes-sidebar")).at(-1).focus());
    await page.keyboard.press("Tab"); await focused(page, "#mobile-sidebar-close");
    await page.locator("#mobile-sidebar-close").click(); await focused(page, "#mobile-notes-button");
    assert.equal(await page.locator("#notes-sidebar").getAttribute("aria-modal"), null);
    await page.locator("#mobile-notes-button").click(); await focused(page, "#mobile-sidebar-close");
    await page.keyboard.press("Escape"); await focused(page, "#mobile-notes-button");
    await page.locator("#mobile-notes-button").click();
    await page.setViewportSize({ width: 1440, height: 1000 }); await focused(page, "#search-input");
    assert.equal(await page.locator("#notes-sidebar").getAttribute("role"), null);
    passed("Closed compact Notes navigation cannot take focus; open navigation contains and returns focus and recovers on resize");

    await page.evaluate(() => openBadgeModal()); await focused(page, "#close-badges-button");
    await page.keyboard.press("Escape"); await focused(page, "#search-input");
    await page.evaluate(() => showAchievementModal(REVISION_TOPICS[0])); await focused(page, "#close-achievement-button");
    await page.keyboard.press("Escape"); await focused(page, "#search-input");
    await page.evaluate(() => openGlobalSearch()); await focused(page, "#global-search-input");
    await page.keyboard.press("Escape"); await focused(page, "#search-input");
    passed("Badge, achievement and global Search dialogs share the focus lifecycle");

    await page.evaluate(() => openOnboarding());
    await focused(page, '[data-onboarding-step="1"] h3');
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.querySelector("#onboarding-modal").contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#onboarding-modal").isVisible(), true);
    await page.keyboard.press("Control+k");
    assert.equal(await page.locator("#global-search-modal").isVisible(), false);
    await page.evaluate(() => closeManagedModal(elements.onboardingModal));
    await focused(page, "#search-input");
    passed("Onboarding contains focus and preserves its existing non-dismissible setup behaviour");
    assert.deepEqual(errors, []);
    const report = { passed: true, checks, pageErrors: errors, providerActions: 0 };
    const output = path.join(root, "test-results", "ux-account");
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.stack || error.message); process.exitCode = 1;
  } finally {
    await browser?.close();
    if (server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); }
    fs.rmSync(temp, { recursive: true, force: true });
  }
})();
