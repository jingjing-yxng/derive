import { test, expect, Page } from "@playwright/test";

const BASE = "https://derive-app.vercel.app";

// Collect all issues found
const issues: string[] = [];
function flag(issue: string) {
  issues.push(issue);
  console.log(`🐛 ISSUE: ${issue}`);
}

test.describe("Full Platform Audit — Cycle 1", () => {
  test.setTimeout(120000);

  test("1. Landing page loads, no console errors, no broken images", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(BASE, { waitUntil: "networkidle" });

    // Page should load
    await expect(page).toHaveTitle(/.+/);

    // Check for broken images
    const images = await page.$$eval("img", (imgs) =>
      imgs.map((img) => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        alt: img.alt,
      }))
    );
    for (const img of images) {
      if (img.naturalWidth === 0) {
        flag(`Broken image on landing: src="${img.src}" alt="${img.alt}"`);
      }
    }

    // Check for overlapping or clipped text
    const viewport = page.viewportSize()!;
    const overflows = await page.$$eval("*", (els) =>
      els
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.right > window.innerWidth + 5 || rect.left < -5;
        })
        .map((el) => ({
          tag: el.tagName,
          class: el.className?.toString().slice(0, 60),
          text: el.textContent?.slice(0, 40),
        }))
    );
    if (overflows.length > 0) {
      flag(`${overflows.length} element(s) overflow viewport on landing page`);
    }

    // Check CTA / primary buttons exist and are clickable
    const ctaButtons = await page.$$("a, button");
    if (ctaButtons.length === 0) {
      flag("No buttons or links found on landing page");
    }

    // Log console errors (filter noise)
    const realErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("manifest") && !e.includes("third-party")
    );
    if (realErrors.length > 0) {
      flag(`Console errors on landing: ${realErrors.join(" | ")}`);
    }
  });

  test("2. Navigation: all main links work (no 404s)", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Collect all internal links
    const links = await page.$$eval("a[href]", (anchors) =>
      anchors
        .map((a) => a.getAttribute("href") || "")
        .filter((h) => h.startsWith("/") || h.includes("derive-app.vercel.app"))
    );
    const unique = [...new Set(links)];

    for (const link of unique) {
      const url = link.startsWith("/") ? `${BASE}${link}` : link;
      try {
        const res = await page.request.get(url);
        if (res.status() >= 400) {
          flag(`Broken link: ${link} → ${res.status()}`);
        }
      } catch {
        flag(`Failed to fetch link: ${link}`);
      }
    }
  });

  test("3. Dashboard page loads correctly", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });

    // Should show dashboard content or redirect
    const url = page.url();
    console.log(`Dashboard resolved to: ${url}`);

    // Check for error states
    const errorText = await page.textContent("body");
    if (errorText?.includes("500") || errorText?.includes("Internal Server Error")) {
      flag("Dashboard shows 500 error");
    }

    // Check for broken images
    const brokenImages = await page.$$eval("img", (imgs) =>
      imgs.filter((img) => img.naturalWidth === 0).map((img) => img.src)
    );
    if (brokenImages.length > 0) {
      flag(`Broken images on dashboard: ${brokenImages.join(", ")}`);
    }
  });

  test("4. New trip flow loads", async ({ page }) => {
    await page.goto(`${BASE}/trip/new`, { waitUntil: "networkidle" });

    const url = page.url();
    console.log(`New trip page resolved to: ${url}`);

    // Check for any form fields or input areas
    const inputs = await page.$$("input, textarea, select, [contenteditable]");
    console.log(`Found ${inputs.length} input elements on trip/new`);

    // Should have some interactive elements for creating a trip
    const buttons = await page.$$("button");
    console.log(`Found ${buttons.length} buttons on trip/new`);

    // Check for error states
    const body = await page.textContent("body");
    if (body?.includes("Error") && body?.includes("500")) {
      flag("New trip page shows error");
    }
  });

  test("5. Onboarding page loads and is functional", async ({ page }) => {
    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });

    const url = page.url();
    console.log(`Onboarding resolved to: ${url}`);

    // Check for form elements
    const inputs = await page.$$("input, textarea");
    console.log(`Onboarding has ${inputs.length} inputs`);

    // Check visual: no horizontal scroll
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    if (hasHScroll) {
      flag("Onboarding page has horizontal scroll overflow");
    }
  });

  test("6. Onboarding profile page loads", async ({ page }) => {
    await page.goto(`${BASE}/onboarding/profile`, { waitUntil: "networkidle" });

    const url = page.url();
    console.log(`Onboarding/profile resolved to: ${url}`);

    const body = await page.textContent("body");
    if (body?.includes("500") || body?.includes("Internal Server Error")) {
      flag("Onboarding/profile shows 500 error");
    }
  });

  test("7. Profile page loads", async ({ page }) => {
    await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    const url = page.url();
    console.log(`Profile page resolved to: ${url}`);
  });

  test("8. Visual: Check z-index / overlap issues on landing", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Take a screenshot for manual review
    await page.screenshot({ path: "tests/screenshots/landing-desktop.png", fullPage: true });
    console.log("Saved landing-desktop.png");

    // Check if any fixed/sticky elements overlap content
    const fixedEls = await page.$$eval("*", (els) =>
      els
        .filter((el) => {
          const style = window.getComputedStyle(el);
          return style.position === "fixed" || style.position === "sticky";
        })
        .map((el) => ({
          tag: el.tagName,
          class: el.className?.toString().slice(0, 60),
          rect: el.getBoundingClientRect(),
        }))
    );
    console.log(`Found ${fixedEls.length} fixed/sticky elements`);
  });

  test("9. API health checks", async ({ page }) => {
    // Check key API endpoints return valid responses (not 500)
    const endpoints = [
      "/api/chat-messages?tripId=test",
      "/api/itinerary?tripId=test",
      "/api/photos?q=test",
    ];

    for (const ep of endpoints) {
      try {
        const res = await page.request.get(`${BASE}${ep}`);
        console.log(`${ep} → ${res.status()}`);
        if (res.status() >= 500) {
          flag(`API ${ep} returns 500`);
        }
      } catch (e) {
        flag(`API ${ep} fetch failed`);
      }
    }
  });

  test("10. Landing page responsive: mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE, { waitUntil: "networkidle" });

    await page.screenshot({ path: "tests/screenshots/landing-mobile.png", fullPage: true });

    // Check horizontal overflow
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    if (hasHScroll) {
      flag("Landing page has horizontal scroll on mobile");
    }

    // Check touch targets: buttons should be at least 44px
    const smallButtons = await page.$$eval("button, a", (els) =>
      els
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 30 || rect.height < 30);
        })
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent?.slice(0, 30),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
        }))
    );
    if (smallButtons.length > 0) {
      console.log(`Small touch targets on mobile: ${JSON.stringify(smallButtons.slice(0, 5))}`);
    }
  });

  test("11. Dashboard responsive: mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/dashboard-mobile.png", fullPage: true });

    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    );
    if (hasHScroll) {
      flag("Dashboard has horizontal scroll on mobile");
    }
  });

  test("12. Trip creation form validation", async ({ page }) => {
    await page.goto(`${BASE}/trip/new`, { waitUntil: "networkidle" });

    await page.screenshot({ path: "tests/screenshots/trip-new.png", fullPage: true });

    // Try to find and check form inputs
    const textareas = await page.$$("textarea");
    const inputs = await page.$$("input");
    console.log(`Trip/new: ${inputs.length} inputs, ${textareas.length} textareas`);

    // Check for placeholder text
    for (const input of inputs) {
      const placeholder = await input.getAttribute("placeholder");
      const type = await input.getAttribute("type");
      console.log(`  Input type="${type}" placeholder="${placeholder}"`);
    }
  });

  test("13. Check all pages for unhandled JS errors", async ({ page }) => {
    const pages = ["/", "/dashboard", "/trip/new", "/onboarding", "/profile"];

    for (const path of pages) {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });

      if (errors.length > 0) {
        flag(`JS errors on ${path}: ${errors.join(" | ")}`);
      }
    }
  });

  test("14. CSS: check for invisible text (same color as bg)", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    const invisibleText = await page.$$eval("p, span, h1, h2, h3, h4, h5, h6, a, button, label", (els) =>
      els
        .filter((el) => {
          const style = window.getComputedStyle(el);
          const text = el.textContent?.trim();
          if (!text || text.length === 0) return false;
          // Check if text color matches background
          return style.color === style.backgroundColor && style.color !== "rgba(0, 0, 0, 0)";
        })
        .map((el) => el.textContent?.slice(0, 30))
    );
    if (invisibleText.length > 0) {
      flag(`Invisible text found: ${invisibleText.join(", ")}`);
    }
  });

  test("15. Check font loading", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    const fontsLoaded = await page.evaluate(async () => {
      await document.fonts.ready;
      const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
      const failed = [...document.fonts].filter((f) => f.status === "error").map((f) => f.family);
      return { loaded, failed };
    });

    console.log(`Fonts loaded: ${fontsLoaded.loaded.join(", ")}`);
    if (fontsLoaded.failed.length > 0) {
      flag(`Failed to load fonts: ${fontsLoaded.failed.join(", ")}`);
    }
  });

  test("16. Onboarding flow: step-by-step walkthrough", async ({ page }) => {
    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/onboarding-step1.png", fullPage: true });

    // Try to interact with the first step
    const buttons = await page.$$("button");
    console.log(`Onboarding buttons: ${buttons.length}`);
    for (const btn of buttons.slice(0, 5)) {
      const text = await btn.textContent();
      const visible = await btn.isVisible();
      console.log(`  Button: "${text?.trim()}" visible=${visible}`);
    }
  });

  test("17. Check for accessibility basics", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Check images have alt text
    const imagesWithoutAlt = await page.$$eval("img", (imgs) =>
      imgs.filter((img) => !img.alt && img.src).map((img) => img.src)
    );
    if (imagesWithoutAlt.length > 0) {
      flag(`${imagesWithoutAlt.length} images missing alt text`);
    }

    // Check for form labels
    const inputsWithoutLabel = await page.$$eval("input:not([type=hidden]):not([type=submit])", (inputs) =>
      inputs.filter((inp) => {
        const id = inp.id;
        if (!id) return true;
        return !document.querySelector(`label[for="${id}"]`);
      }).length
    );
    if (inputsWithoutLabel > 0) {
      console.log(`${inputsWithoutLabel} inputs without associated labels (minor a11y)`);
    }

    // Check color contrast on buttons
    const lowContrastButtons = await page.$$eval("button", (btns) =>
      btns
        .filter((btn) => {
          const style = window.getComputedStyle(btn);
          return style.opacity !== "" && parseFloat(style.opacity) < 0.5 && btn.textContent?.trim();
        })
        .map((btn) => btn.textContent?.slice(0, 30))
    );
    if (lowContrastButtons.length > 0) {
      console.log(`Low contrast buttons: ${lowContrastButtons.join(", ")}`);
    }
  });

  test("18. Trip page with invalid ID shows graceful error", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE}/trip/nonexistent-id-12345`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "tests/screenshots/trip-invalid.png", fullPage: true });

    const body = await page.textContent("body");
    // Should show some kind of error/not found, not a crash
    const hasGracefulHandling =
      body?.includes("not found") ||
      body?.includes("Not Found") ||
      body?.includes("doesn't exist") ||
      body?.includes("error") ||
      body?.includes("Error") ||
      body?.includes("loading") ||
      body?.includes("Loading") ||
      page.url().includes("/dashboard") ||
      page.url() === `${BASE}/`;

    if (!hasGracefulHandling) {
      flag("Trip page with invalid ID does not show graceful error or redirect");
    }
    console.log(`Invalid trip page body snippet: "${body?.slice(0, 200)}"`);
  });

  test("19. Check CSS custom properties are defined", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle" });

    // Check that custom colors referenced in tailwind config exist
    const cssVarCheck = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const vars = [
        "--color-n-50", "--color-n-100", "--color-n-200", "--color-n-300",
        "--color-n-400", "--color-n-500", "--color-n-900",
        "--color-lavender-400", "--color-lavender-500",
      ];
      const missing = vars.filter((v) => !root.getPropertyValue(v).trim());
      return missing;
    });

    if (cssVarCheck.length > 0) {
      flag(`Missing CSS custom properties: ${cssVarCheck.join(", ")}`);
    }
  });

  test("20. Summary: print all issues found", async () => {
    console.log("\n\n========================================");
    console.log("AUDIT SUMMARY");
    console.log("========================================");
    if (issues.length === 0) {
      console.log("✅ No issues found!");
    } else {
      console.log(`Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }
    console.log("========================================\n");
  });
});
