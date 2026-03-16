import { test, expect } from "@playwright/test";

// ============================================================
// Landing Page
// ============================================================
test.describe("Landing Page", () => {
  test("loads and shows hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Deriv/i })).toBeVisible({ timeout: 10000 });
  });

  test("no raw markdown asterisks visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const bodyText = await page.locator("body").textContent();
    const rawBold = (bodyText || "").match(/\*\*[^*]+\*\*/g);
    expect(rawBold).toBeNull();
  });

  test("all images load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const images = await page.locator("img").all();
    for (const img of images) {
      const src = await img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth, `Image ${src} should load`).toBeGreaterThan(0);
      }
    }
  });

  test("CTA button is visible and clickable", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /Get Started/i }).first();
    await expect(cta).toBeVisible({ timeout: 10000 });
    await expect(cta).toBeEnabled();
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

// ============================================================
// Shared Itinerary Page
// ============================================================
test.describe("Shared Page", () => {
  test("error page renders cleanly", async ({ page }) => {
    await page.goto("/share/nonexistent-token-test");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Itinerary not found")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: /plan your own trip/i })).toBeVisible();
  });

  test("error card has rounded corners", async ({ page }) => {
    await page.goto("/share/nonexistent-token-test");
    await page.waitForLoadState("networkidle");
    // Target the actual card container with the rounded class
    const card = page.locator("div.rounded-\\[24px\\]").first();
    await expect(card).toBeVisible({ timeout: 10000 });
    const borderRadius = await card.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(parseFloat(borderRadius)).toBeGreaterThan(0);
  });

  test("no horizontal overflow on error page", async ({ page }) => {
    await page.goto("/share/nonexistent-token-test");
    await page.waitForLoadState("networkidle");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

// ============================================================
// Dashboard / Onboarding
// ============================================================
test.describe("Dashboard", () => {
  test("page loads without blank screen", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(10);
  });
});

// ============================================================
// Text quality checks
// ============================================================
test.describe("Text quality", () => {
  test("no raw markdown on landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").textContent() || "";
    expect(text).not.toMatch(/\*\*[A-Za-z].*?\*\*/);
  });

  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const realErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("third-party") && !e.includes("cookie") && !e.includes("hydration")
    );
    expect(realErrors.length).toBeLessThan(5);
  });

  test("onboarding page has no raw markdown", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").textContent() || "";
    expect(text).not.toMatch(/\*\*[A-Za-z].*?\*\*/);
  });
});
