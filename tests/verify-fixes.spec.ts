import { test, expect } from "@playwright/test";

const BASE = "https://derive-app.vercel.app";
const issues: string[] = [];
function flag(issue: string) {
  issues.push(issue);
  console.log(`BUG: ${issue}`);
}

test.describe("Verification Audit — Cycle 2", () => {
  test.setTimeout(60000);

  test("1. Chat-messages API: invalid UUID returns 400 (not 500)", async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/chat-messages?tripId=test`);
    console.log(`/api/chat-messages?tripId=test → ${res.status()}`);
    if (res.status() === 500) {
      flag("API /api/chat-messages still returns 500 for invalid UUID");
    }
    expect(res.status()).toBe(400);
  });

  test("2. Chat-messages API: valid UUID format returns 200", async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/chat-messages?tripId=00000000-0000-0000-0000-000000000000`);
    console.log(`/api/chat-messages?tripId=valid-uuid → ${res.status()}`);
    // Should return 200 with empty messages array, not 500
    expect(res.status()).toBe(200);
  });

  test("3. All key pages load without JS errors", async ({ page }) => {
    const pages = [
      { url: BASE, name: "Landing" },
      { url: `${BASE}/onboarding`, name: "Onboarding" },
      { url: `${BASE}/trip/new`, name: "Trip New" },
      { url: `${BASE}/profile`, name: "Profile" },
    ];

    for (const p of pages) {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(p.url, { waitUntil: "domcontentloaded" });

      if (errors.length > 0) {
        flag(`JS error on ${p.name}: ${errors[0].slice(0, 100)}`);
      }
      console.log(`${p.name}: ${errors.length} JS errors`);
    }
  });

  test("4. Landing page: scroll reveals activate", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });

    // Scroll to bottom
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(400);
    }

    const revealed = await page.$$eval(".reveal-up", (els) =>
      els.filter((el) => window.getComputedStyle(el).opacity !== "0").length
    );
    console.log(`Revealed sections: ${revealed}`);
    expect(revealed).toBeGreaterThan(0);
  });

  test("5. Trip not found page is graceful", async ({ page }) => {
    await page.goto(`${BASE}/trip/00000000-0000-0000-0000-000000000000`, { waitUntil: "domcontentloaded" });
    const body = await page.textContent("body");
    const hasGraceful = body?.includes("not found") || body?.includes("Not Found") || body?.includes("Trip not found");
    expect(hasGraceful).toBeTruthy();
  });

  test("6. No broken images on key pages", async ({ page }) => {
    for (const url of [BASE, `${BASE}/onboarding`, `${BASE}/trip/new`]) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const broken = await page.$$eval("img", (imgs) =>
        imgs.filter((img) => img.naturalWidth === 0 && img.src && !img.src.includes("data:")).length
      );
      if (broken > 0) flag(`Broken images on ${url}`);
    }
  });

  test("7. No horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const url of [BASE, `${BASE}/onboarding`, `${BASE}/trip/new`]) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const hasHScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      );
      if (hasHScroll) flag(`Horizontal overflow on mobile: ${url}`);
    }
  });

  test("8. Other API endpoints healthy", async ({ page }) => {
    const endpoints = [
      { url: `${BASE}/api/itinerary?tripId=00000000-0000-0000-0000-000000000000`, expect: [200, 400] },
      { url: `${BASE}/api/photos?q=tokyo`, expect: [200] },
    ];

    for (const ep of endpoints) {
      const res = await page.request.get(ep.url);
      console.log(`${ep.url.replace(BASE, "")} → ${res.status()}`);
      if (!ep.expect.includes(res.status()) && res.status() >= 500) {
        flag(`API returns 500: ${ep.url}`);
      }
    }
  });

  test("9. Trip creation form has all required elements", async ({ page }) => {
    await page.goto(`${BASE}/trip/new`, { waitUntil: "domcontentloaded" });

    // Date inputs
    const dateInputs = await page.$$("input[type='date']");
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);

    // Region input
    const regionInput = await page.$("input[placeholder*='city'], input[placeholder*='region']");
    expect(regionInput).toBeTruthy();

    // Submit button
    const submitBtn = await page.$("button:has-text('Get recommendations')");
    expect(submitBtn).toBeTruthy();

    // Textarea for additional notes
    const textarea = await page.$("textarea");
    expect(textarea).toBeTruthy();
  });

  test("10. Onboarding has all key elements", async ({ page }) => {
    await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });

    // Tab buttons
    const pasteTab = await page.$("button:has-text('Paste')");
    const uploadTab = await page.$("button:has-text('Upload')");
    const importTab = await page.$("button:has-text('Import')");

    expect(pasteTab).toBeTruthy();
    expect(uploadTab).toBeTruthy();
    expect(importTab).toBeTruthy();

    // Extract button
    const extractBtn = await page.$("button:has-text('Extract')");
    expect(extractBtn).toBeTruthy();

    // Generate profile button
    const genBtn = await page.$("button:has-text('Generate profile')");
    expect(genBtn).toBeTruthy();
  });

  test("99. Summary", async () => {
    console.log("\n========================================");
    console.log("VERIFICATION AUDIT SUMMARY — Cycle 2");
    console.log("========================================");
    if (issues.length === 0) {
      console.log("All issues from Cycle 1 are fixed. No new issues found.");
    } else {
      console.log(`Found ${issues.length} remaining issue(s):\n`);
      issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }
    console.log("========================================\n");
  });
});
