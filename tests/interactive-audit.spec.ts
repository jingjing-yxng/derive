import { test, expect } from "@playwright/test";

const BASE = "https://derive-app.vercel.app";
const issues: string[] = [];
function flag(issue: string) {
  issues.push(issue);
  console.log(`BUG: ${issue}`);
}

test.describe("Interactive Audit — Cycle 1", () => {
  test.setTimeout(180000);

  test("1. Landing page scroll reveals work", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Scroll down step by step and check if demo sections appear
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(500);
    }

    // After scrolling, the scroll-reveal sections should become visible
    const revealedSections = await page.$$eval(".reveal-up", (els) =>
      els.filter((el) => window.getComputedStyle(el).opacity !== "0").length
    );
    console.log(`Revealed sections after scroll: ${revealedSections}`);
    if (revealedSections === 0) {
      flag("No ScrollReveal sections became visible after scrolling");
    }

    await page.screenshot({ path: "tests/screenshots/landing-scrolled.png" });
  });

  test("2. Onboarding form: URL paste + extract flow", async ({ page }) => {
    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/onboarding-loaded.png", fullPage: true });

    // Look for the URL input or link paste functionality
    const pasteBtn = page.getByText("Paste links");
    if (await pasteBtn.isVisible()) {
      await pasteBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "tests/screenshots/onboarding-paste-clicked.png" });
    }

    // Check for textarea or input to paste URLs
    const textareas = await page.$$("textarea");
    const inputs = await page.$$("input");
    console.log(`After paste click: ${textareas.length} textareas, ${inputs.length} inputs`);

    // Try typing a URL into any visible textarea
    for (const ta of textareas) {
      if (await ta.isVisible()) {
        await ta.fill("https://pinterest.com/test-board");
        await page.waitForTimeout(300);
        break;
      }
    }

    await page.screenshot({ path: "tests/screenshots/onboarding-url-typed.png" });
  });

  test("3. Trip creation: complete the form", async ({ page }) => {
    await page.goto(`${BASE}/trip/new`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/trip-new-loaded.png", fullPage: true });

    // Check if all form fields are accessible
    const dateInputs = await page.$$("input[type='date']");
    console.log(`Date inputs found: ${dateInputs.length}`);
    if (dateInputs.length < 2) {
      flag("Trip creation form missing date inputs (expected 2)");
    }

    // Check for region/destination input
    const regionInput = page.locator("input[placeholder*='city'], input[placeholder*='region'], input[placeholder*='City'], input[placeholder*='Region'], input[placeholder*='destination']");
    const regionCount = await regionInput.count();
    console.log(`Region inputs found: ${regionCount}`);

    // Check for travel party input
    const partyInput = page.locator("input[placeholder*='Solo'], input[placeholder*='party'], input[placeholder*='Couple']");
    const partyCount = await partyInput.count();
    console.log(`Party inputs found: ${partyCount}`);

    // Check for description/textarea
    const descTextarea = page.locator("textarea");
    const descCount = await descTextarea.count();
    console.log(`Description textarea found: ${descCount}`);

    // Check for the submit/start button
    const startBtn = page.locator("button:has-text('Start'), button:has-text('Plan'), button:has-text('Create'), button:has-text('Go'), button:has-text('Begin')");
    const startBtnCount = await startBtn.count();
    console.log(`Start/submit button found: ${startBtnCount}`);
    if (startBtnCount === 0) {
      flag("No 'Start'/'Plan'/'Create' button found on trip creation page");
    }

    // Fill out the form
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill("2026-06-01");
      await dateInputs[1].fill("2026-06-07");
    }
    if (regionCount > 0) {
      await regionInput.first().fill("Tokyo");
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: "tests/screenshots/trip-new-filled.png", fullPage: true });
  });

  test("4. Trip page: check existing trip or invalid ID handling", async ({ page }) => {
    // Test with invalid ID — should show "Trip not found"
    await page.goto(`${BASE}/trip/00000000-0000-0000-0000-000000000000`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/trip-invalid-uuid.png", fullPage: true });

    const body = await page.textContent("body");
    console.log(`Invalid trip page: "${body?.slice(0, 200)}"`);
  });

  test("5. Dashboard: check layout and trip cards", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const url = page.url();
    console.log(`Dashboard resolved to: ${url}`);

    await page.screenshot({ path: "tests/screenshots/dashboard-final.png", fullPage: true });

    // If redirected to onboarding, check onboarding layout
    if (url.includes("onboarding")) {
      console.log("Redirected to onboarding (no profile) — checking onboarding layout");

      // Check for upload/paste functionality
      const uploadBtn = page.getByText("Upload");
      const pasteBtn = page.getByText("Paste links");
      const importBtn = page.getByText("Import");
      const extractBtn = page.getByText("Extract");

      console.log(`  Upload visible: ${await uploadBtn.isVisible()}`);
      console.log(`  Paste links visible: ${await pasteBtn.isVisible()}`);
      console.log(`  Import visible: ${await importBtn.isVisible()}`);
      console.log(`  Extract visible: ${await extractBtn.isVisible()}`);
    }
  });

  test("6. Mobile: onboarding layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/onboarding-mobile.png", fullPage: true });

    // Check for horizontal overflow
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    if (hasHScroll) {
      flag("Onboarding has horizontal scroll on mobile");
    }

    // Check text is not truncated/clipped
    const clippedText = await page.$$eval("h1, h2, h3, p", (els) =>
      els.filter((el) => {
        const style = window.getComputedStyle(el);
        return el.scrollWidth > el.clientWidth && style.overflow === "hidden";
      }).length
    );
    if (clippedText > 0) {
      flag(`${clippedText} text elements are clipped/truncated on mobile onboarding`);
    }
  });

  test("7. Mobile: trip creation", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/trip/new`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/trip-new-mobile.png", fullPage: true });

    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    if (hasHScroll) {
      flag("Trip creation has horizontal scroll on mobile");
    }
  });

  test("8. Mobile: landing page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Scroll through the page
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(400);
    }

    await page.screenshot({ path: "tests/screenshots/landing-mobile-scrolled.png" });

    // Verify CTA button at bottom is visible
    const ctaBtn = page.locator("a:has-text('Start planning')");
    const ctaVisible = await ctaBtn.isVisible().catch(() => false);
    console.log(`Bottom CTA visible after scroll: ${ctaVisible}`);
  });

  test("9. Check navigation between pages", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Click "Get Started"
    const getStarted = page.locator("a:has-text('Get Started'), button:has-text('Get Started')").first();
    if (await getStarted.isVisible()) {
      await getStarted.click();
      await page.waitForURL(/\/(onboarding|trip)/, { timeout: 10000 });
      console.log(`Get Started navigated to: ${page.url()}`);
    }

    // Navigate to dashboard
    await page.goto(BASE, { waitUntil: "networkidle" });
    const loginBtn = page.locator("a:has-text('Log'), button:has-text('Log')").first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(2000);
      console.log(`Log In navigated to: ${page.url()}`);
    }
  });

  test("10. Check profile page", async ({ page }) => {
    await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/profile.png", fullPage: true });

    const body = await page.textContent("body");
    // Check for error states
    if (body?.match(/error|crash|undefined/i) && !body?.match(/font|css/i)) {
      flag(`Profile page has error text: ${body?.slice(0, 100)}`);
    }
  });

  test("11. Check all images load on key pages", async ({ page }) => {
    const pagesToCheck = [
      { url: BASE, name: "Landing" },
      { url: `${BASE}/onboarding`, name: "Onboarding" },
      { url: `${BASE}/trip/new`, name: "Trip New" },
    ];

    for (const p of pagesToCheck) {
      await page.goto(p.url, { waitUntil: "networkidle" });
      const broken = await page.$$eval("img", (imgs) =>
        imgs.filter((img) => img.naturalWidth === 0 && img.src && !img.src.includes("data:")).map((img) => img.src)
      );
      if (broken.length > 0) {
        flag(`Broken images on ${p.name}: ${broken.join(", ")}`);
      }
    }
  });

  test("12. Check share page with invalid token", async ({ page }) => {
    await page.goto(`${BASE}/share/invalid-token`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/share-invalid.png", fullPage: true });

    const body = await page.textContent("body");
    console.log(`Share page body: "${body?.slice(0, 200)}"`);
  });

  test("13. Performance: check page load times", async ({ page }) => {
    const pagesToTime = [
      { url: BASE, name: "Landing" },
      { url: `${BASE}/onboarding`, name: "Onboarding" },
      { url: `${BASE}/trip/new`, name: "Trip New" },
      { url: `${BASE}/dashboard`, name: "Dashboard" },
    ];

    for (const p of pagesToTime) {
      const start = Date.now();
      await page.goto(p.url, { waitUntil: "networkidle" });
      const loadTime = Date.now() - start;
      console.log(`${p.name} load time: ${loadTime}ms`);
      if (loadTime > 10000) {
        flag(`${p.name} takes over 10s to load (${loadTime}ms)`);
      }
    }
  });

  test("14. Check for console warnings/errors across all pages", async ({ page }) => {
    const pagesToCheck = [
      BASE,
      `${BASE}/onboarding`,
      `${BASE}/trip/new`,
      `${BASE}/profile`,
    ];

    for (const url of pagesToCheck) {
      const errors: string[] = [];
      const warnings: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
        if (msg.type() === "warning") warnings.push(msg.text());
      });

      await page.goto(url, { waitUntil: "networkidle" });

      const realErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("manifest") &&
          !e.includes("third-party") &&
          !e.includes("Download the React DevTools")
      );

      if (realErrors.length > 0) {
        console.log(`Console errors on ${url}:`);
        realErrors.forEach((e) => console.log(`  ${e.slice(0, 150)}`));
      }
    }
  });

  test("99. Summary", async () => {
    console.log("\n========================================");
    console.log("INTERACTIVE AUDIT SUMMARY");
    console.log("========================================");
    if (issues.length === 0) {
      console.log("No issues found!");
    } else {
      console.log(`Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }
    console.log("========================================\n");
  });
});
