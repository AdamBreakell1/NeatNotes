"use strict";

// Rendered UI checks use a disposable account/database; no provider or production requests.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { chromium } = require(process.env.NEAT_PLAYWRIGHT_PATH || "playwright");
const { TASKS } = require("../backend/services/pseudocodeTasks");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "recallstride-ui-audit-"));
const output = path.join(root, "test-results", "ui-audit");
fs.mkdirSync(output, { recursive: true });
const port = 6950 + Math.floor(Math.random() * 150);
const base = `http://127.0.0.1:${port}`;
const checks = [], measurements = [], errors = [];
const server = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, RECALLSTRIDE_SKIP_DOTENV: "true", NODE_ENV: "development",
    PORT: String(port), BASE_URL: base, CORS_ORIGIN: base,
    DATABASE_PATH: path.join(temp, "fixture.sqlite"), ALLOW_MOCK_BILLING: "true",
    AUTH_RATE_LIMIT: "200", REVISION_RATE_LIMIT: "400", CONTACT_RETRY_INTERVAL_MS: "0",
    SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" },
});
let browser, page, logs = "";
server.stdout.on("data", chunk => { logs += chunk; });
server.stderr.on("data", chunk => { logs += chunk; });

async function ready() { await page.locator("#launch-overlay").waitFor({ state: "hidden" }); }
async function settle() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function theme(value) {
  await page.evaluate(value => { appSettings.theme = value; applyThemePreference(); }, value);
  await settle();
}
async function nav(section) {
  await page.locator(`.topbar-section-switch a[data-app-section="${section}"]`).click();
  await settle();
}
function passed(name) { checks.push(name); }
async function colours(locator) {
  return locator.evaluate(element => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const rgba = value => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
    const blend = (front, back) => { const alpha = front[3] / 255; return front.slice(0, 3).map((value, index) => value * alpha + back[index] * (1 - alpha)); };
    const background = node => node ? blend(rgba(getComputedStyle(node).backgroundColor), background(node.parentElement)) : [255, 255, 255];
    const luminance = channels => channels.slice(0, 3).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const contrast = (left, right) => { const a = luminance(left), b = luminance(right); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
    const style = getComputedStyle(element), bg = background(element);
    const text = [element, ...element.querySelectorAll("strong,span,small")].filter(node => node.getClientRects().length && node.textContent.trim()).map(node => ({ text: node.textContent.trim().slice(0, 80), colour: getComputedStyle(node).color, contrast: contrast(blend(rgba(getComputedStyle(node).color), background(node)), background(node)) }));
    return { colour: style.color, background: style.backgroundColor, border: style.borderTopColor,
      borderWidth: parseFloat(style.borderTopWidth), borderContrast: contrast(rgba(style.borderTopColor), bg),
      outerBorderContrast: contrast(rgba(style.borderTopColor), background(element.parentElement)),
      outline: style.outlineColor, outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), outlineOffset: parseFloat(style.outlineOffset), boxShadow: style.boxShadow,
      focus: rgba(getComputedStyle(document.documentElement).getPropertyValue("--focus")),
      outlineRGBA: rgba(style.outlineColor), text };
  });
}
async function textContrast(selector, state) {
  const locator = page.locator(selector); await locator.waitFor({ state: "visible" });
  const values = await colours(locator);
  for (const text of values.text) assert.ok(text.contrast >= 4.5, `${selector} ${state}: ${JSON.stringify(text)}`);
  measurements.push({ selector, state, minimumTextContrast: Math.min(...values.text.map(value => value.contrast)) });
}
async function primary(selector, currentTheme) {
  const locator = page.locator(selector);
  await page.mouse.move(0, 0); await page.waitForTimeout(180);
  await textContrast(selector, `${currentTheme} rest`);
  await locator.hover(); await page.waitForTimeout(180);
  await textContrast(selector, `${currentTheme} hover`);
}
async function field(selector, currentTheme) {
  const locator = page.locator(selector); await locator.waitFor({ state: "visible" });
  const value = await colours(locator);
  assert.ok(value.borderWidth >= 1, `${selector} needs a visible boundary`);
  assert.ok(value.borderContrast >= 3 && value.outerBorderContrast >= 3,
    `${selector} ${currentTheme}: boundary contrast ${value.borderContrast}/${value.outerBorderContrast}`);
  measurements.push({ selector, state: currentTheme, borderContrast: value.borderContrast, outerBorderContrast: value.outerBorderContrast });
}
async function noOverflow(label) {
  const values = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
  assert.ok(values.documentWidth <= values.width + 1, `${label}: ${JSON.stringify(values)}`);
}
async function modalBounds(open, modal, title, close, width) {
  await page.evaluate(open); await page.locator(modal).waitFor({ state: "visible" }); await settle();
  const bounds = await page.locator(title).evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    return [...range.getClientRects()].map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
  });
  const button = await page.locator(close).boundingBox();
  assert.ok(button && button.x >= 0 && button.x + button.width <= width + 1, `${modal}: close control outside viewport`);
  for (const rect of bounds) {
    const overlaps = rect.x < button.x + button.width && rect.x + rect.width > button.x && rect.y < button.y + button.height && rect.y + rect.height > button.y;
    assert.equal(overlaps, false, `${modal} ${width}px title and close control overlap: ${JSON.stringify({ rect, button })}`);
    assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1, `${modal}: title text outside viewport`);
  }
  await noOverflow(`${modal} ${width}px`);
  await page.keyboard.press("Escape"); await page.locator(modal).waitFor({ state: "hidden" });
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
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base); await ready();
    for (const currentTheme of ["light", "dark"]) {
      await theme(currentTheme);
      await primary('.landing-nav [data-landing-action="signup"]', currentTheme);
      await page.locator('.landing-nav [data-landing-action="login"]').click();
      await primary("#login-submit-button", currentTheme);
      await page.locator("#close-auth-button").focus();
      await field("#login-email", currentTheme); await field("#login-form .password-field", currentTheme);
      await page.keyboard.press("Escape");
    }
    passed("Public and authentication primary actions retain readable labels at rest and on hover in both themes");
    passed("Empty email and password boundaries meet 3:1 in both themes without adding an inner password border");

    const data = { name: "UI Fixture", email: "ui-fixture@example.test", password: "UIFixturePass123" };
    const signup = await context.request.post(`${base}/api/auth/signup`, { data }); assert.equal(signup.status(), 201);
    await context.request.get((await signup.json()).devVerificationUrl);
    assert.equal((await context.request.post(`${base}/api/auth/login`, { data })).status(), 200);
    await context.request.patch(`${base}/api/profile`, { data: { completeOnboarding: true } });
    await context.request.post(`${base}/api/revision/free-deck`, { data: { deckId: "cs-1-1-1" } });
    await page.goto(`${base}/#/today`); await page.reload(); await ready(); await page.locator("#app-view").waitFor({ state: "visible" });
    await page.waitForFunction(() => currentUser?.email === "ui-fixture@example.test" && !isGuestMode);

    for (const currentTheme of ["light", "dark"]) {
      await theme(currentTheme); await nav("home"); await primary(".today-session-actions > button", currentTheme);
      await page.locator("[data-open-pricing-footer]").click(); await primary('[data-plan="pro"]', currentTheme);
      await primary("[data-billing-portal]", currentTheme); await page.keyboard.press("Escape");
      await page.evaluate(() => setAppSection("contact")); await primary(".contact-submit-button", currentTheme);
      await page.locator("#workspace-page-title").focus();
      await field("#contact-form input[type=email]", currentTheme); await field("#contact-form textarea", currentTheme);
    }
    passed("Revision, pricing, filled secondary hover and support actions keep readable text in both themes");
    passed("Support input and textarea boundaries meet 3:1 in both themes");

    await nav("coding"); await page.locator("#coding-source").waitFor();
    await page.locator("#coding-task-select").selectOption("worksheet-1-1");
    await page.locator("#coding-source").fill(TASKS.find(task => task.id === "worksheet-1-1").solutions[0]);
    await page.locator("#coding-check").click();
    await page.locator("#coding-status").filter({ hasText: /Passes all/ }).waitFor();
    for (const currentTheme of ["light", "dark"]) {
      await theme(currentTheme); await primary("#coding-run", currentTheme);
      const labels = page.locator(".coding-result-pass"); assert.ok(await labels.count() > 0);
      for (const label of await labels.all()) {
        const values = await colours(label); assert.ok(values.text[0].contrast >= 4.5, `${currentTheme} Pass: ${JSON.stringify(values)}`);
        measurements.push({ selector: ".coding-result-pass", state: currentTheme, contrast: values.text[0].contrast });
      }
      await page.locator("#coding-run").focus(); await field("#coding-task-select", currentTheme);
      await page.locator('[data-code-action="browse"]').click(); await page.locator("#coding-run").focus();
      await field("#coding-search", currentTheme); await field("#coding-category", currentTheme);
      await page.locator('[data-code-action="browse"]').click();
      await page.locator("#coding-source").focus(); await page.keyboard.press("ArrowRight");
      assert.equal(await page.locator("#coding-source").evaluate(element => element.matches(":focus-visible")), true);
      const frame = await colours(page.locator(".coding-editor"));
      assert.ok(frame.outlineWidth >= 3 && frame.outlineOffset >= 2, `Editor focus frame: ${JSON.stringify(frame)}`);
      assert.deepEqual(frame.outlineRGBA, frame.focus);
      const source = await colours(page.locator("#coding-source")); assert.equal(source.outlineStyle, "none"); assert.equal(source.boxShadow, "none"); assert.equal(source.borderWidth, 0);
      assert.equal(await page.locator("#coding-source").evaluate(element => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
    }
    await page.screenshot({ path: path.join(output, "code-focus-dark.png"), fullPage: false });
    passed("Real successful task checks and Run labels meet 4.5:1 in light and dark themes");
    passed("Code task field boundaries meet 3:1 and keyboard focus outlines the full editor without disturbing its source/highlight layers");

    await page.evaluate(() => setAppSection("notes")); await page.locator("#workspace-new-note-button").click();
    await page.locator("#note-body:not([disabled])").waitFor();
    for (const currentTheme of ["light", "dark"]) {
      await theme(currentTheme); await primary("#instant-cards-button", currentTheme); await primary("#new-note-button", currentTheme);
      const danger = page.locator("#delete-note-button"); await danger.hover(); await page.waitForTimeout(180);
      const values = await colours(danger);
      const dangerColour = await danger.evaluate(element => getComputedStyle(document.documentElement).getPropertyValue("--danger").trim());
      const actual = await danger.evaluate(element => { const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); ctx.fillStyle = getComputedStyle(element).color; return ctx.fillStyle; });
      assert.equal(actual.toLowerCase(), dangerColour.toLowerCase(), "Delete hover must retain the semantic danger colour");
      await textContrast("#delete-note-button", `${currentTheme} destructive hover`);
      await page.locator("#workspace-page-title").focus(); await field("#tag-input", currentTheme); await field("#note-body", currentTheme);
      await page.locator("#auto-title").focus(); await page.keyboard.press("ArrowRight");
      const title = await colours(page.locator("#auto-title")); assert.ok(title.outlineWidth >= 3); assert.deepEqual(title.outlineRGBA, title.focus);
    }
    passed("Notes solid actions retain readable labels while Delete retains its danger colour on hover");
    passed("Note title keyboard focus uses the shared colour and note fields have visible 3:1 boundaries in both themes");

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 900 }); await theme("light");
      for (const label of ["Formatting", "More"]) {
        const menu = page.locator(".editor-control-menu").filter({ has: page.getByText(label, { exact: true }) });
        await menu.locator("summary").click(); await settle();
        const popup = menu.locator(label === "Formatting" ? ".format-toolbar" : ".editor-toolbar");
        const bounds = await popup.boundingBox();
        assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1, `${label} ${width}px: ${JSON.stringify(bounds)}`);
        for (const control of await popup.locator("button").all()) {
          const button = await control.boundingBox(); assert.ok(button && button.x >= -1 && button.x + button.width <= width + 1, `${label}: hidden menu control`);
        }
        await noOverflow(`${label} ${width}px`); await menu.locator("summary").click();
      }
      const modals = [
        [() => openPlansModal(), "#pricing-modal", "#pricing-title", "#close-plans-button"],
        [() => openAuthModal("login"), "#auth-view", "#auth-card-title", "#close-auth-button"],
        [() => openSettingsModal(), "#settings-modal", "#settings-title", "#close-settings-button"],
        [() => openBadgeModal(), "#badge-modal", "#badge-title", "#close-badges-button"],
        [() => openLegalModal("privacy"), "#legal-modal", "#legal-title", ".legal-dialog > .modal-close-button"],
        [() => openGlobalSearch(), "#global-search-modal", "#global-search-title", ".global-search-head > .modal-close-button"],
      ];
      for (const [open, modal, title, close] of modals) await modalBounds(open, modal, title, close, width);
    }
    passed("Formatting and More popups and every contained control fit 320px and 390px viewports");
    passed("Pricing, auth, Settings, badges, legal and Search titles do not overlap close controls at 320px or 390px");

    for (const width of [821, 900]) {
      await page.setViewportSize({ width, height: 1000 }); await settle();
      const editor = await page.locator(".editor").boundingBox();
      const writing = await page.locator("#note-body").boundingBox();
      assert.ok(editor.width >= 400 && writing.width >= 350, `${width}px Notes too narrow: ${JSON.stringify({ editor, writing })}`);
      assert.equal(await page.locator("#search-input").isVisible(), false);
      assert.equal(await page.locator("#mobile-notes-button").isVisible(), true);
      await page.locator("#mobile-notes-button").click();
      await page.waitForFunction(() => document.activeElement.id === "mobile-sidebar-close");
      assert.equal(await page.locator("#notes-sidebar").getAttribute("aria-modal"), "true");
      await page.evaluate(() => getModalControls(document.querySelector("#notes-sidebar")).at(-1).focus());
      await page.keyboard.press("Tab"); assert.equal(await page.evaluate(() => document.activeElement.id), "mobile-sidebar-close");
      const drawer = await page.locator("#notes-sidebar").boundingBox(); assert.ok(drawer.x >= -1 && drawer.x + drawer.width <= width + 1);
      await page.keyboard.press("Escape"); assert.equal(await page.evaluate(() => document.activeElement.id), "mobile-notes-button");
      await noOverflow(`Notes ${width}px`);
      await page.screenshot({ path: path.join(output, `notes-${width}.png`), fullPage: false });
      measurements.push({ viewport: width, editorWidth: editor.width, writingWidth: writing.width });
    }
    passed("Intermediate Notes layouts provide at least 400px editor/350px writing space and an accessible contained drawer at 821px and 900px");
    await page.setViewportSize({ width: 1440, height: 1000 }); await settle(); await page.locator("#search-input").focus();
    assert.equal(await page.evaluate(() => document.activeElement.id), "search-input");
    await page.setViewportSize({ width: 900, height: 1000 });
    await page.waitForFunction(() => document.activeElement.id === "mobile-notes-button");
    assert.equal(await page.locator("#search-input").isVisible(), false);
    await page.locator("#mobile-notes-button").click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForFunction(() => document.activeElement.id === "search-input");
    assert.equal(await page.locator("#notes-sidebar").getAttribute("aria-modal"), null);
    passed("Desktop/intermediate resizing keeps focus visible and removes the temporary drawer dialog role");
    await page.locator("#note-body").focus(); await page.setViewportSize({ width: 900, height: 1000 }); await settle();
    assert.equal(await page.evaluate(() => document.activeElement.id), "note-body");
    await page.evaluate(() => openSettingsModal());
    await page.locator('[data-settings-tab="general"]').waitFor({ state: "visible" });
    await page.waitForFunction(() => document.activeElement.matches('[data-settings-tab="general"]'));
    await page.setViewportSize({ width: 1440, height: 1000 }); await settle();
    assert.equal(await page.locator("#settings-modal").evaluate(element => element.contains(document.activeElement)), true);
    await page.setViewportSize({ width: 900, height: 1000 }); await settle();
    assert.equal(await page.locator("#settings-modal").evaluate(element => element.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    passed("Notes resize recovery leaves writing focus and active dialog focus undisturbed");
    assert.deepEqual(errors, []);
    const report = { passed: true, checks, measurements, pageErrors: errors, providerActions: 0 };
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await page?.screenshot({ path: path.join(output, "failure.png"), fullPage: false }).catch(() => {});
    console.error(error.stack || error.message); process.exitCode = 1;
  } finally {
    await browser?.close();
    if (server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); }
    fs.rmSync(temp, { recursive: true, force: true });
  }
})();
