import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = "/Users/jingjingyang/travel-planner/ux-screenshots";
if (fs.existsSync(SCREENSHOTS_DIR)) fs.rmSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let stepNum = 0;
async function snap(page, label, full = false) {
  stepNum++;
  const name = `${String(stepNum).padStart(2, "0")}-${label}.png`;
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: full });
  console.log(`  📸 ${name}${full ? " (full)" : ""}`);
}

const log = (msg) => console.log(`\n══ ${msg} ══`);

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  // ═══════════════════════════════════════
  // PHASE 1: Landing Page
  // ═══════════════════════════════════════
  log("PHASE 1: Landing Page");
  await page.goto("https://derive-app.vercel.app", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await snap(page, "landing-hero");

  // Scroll through sections
  for (const pct of [33, 66, 100]) {
    await page.evaluate((p) => window.scrollTo(0, (document.body.scrollHeight * p) / 100), pct);
    await page.waitForTimeout(800);
  }
  await snap(page, "landing-bottom", true);

  // Click Get Started
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('a[href="/onboarding"] button').first().click();
  await page.waitForURL("**/onboarding**");
  await page.waitForTimeout(2000);
  await snap(page, "onboarding-start");

  // ═══════════════════════════════════════
  // PHASE 2: Content Input (Pinterest URL)
  // ═══════════════════════════════════════
  log("PHASE 2: Onboarding — Paste Pinterest Link");

  // Make sure we're on the "Paste links" tab
  const pasteLinksTab = page.locator('button').filter({ hasText: "Paste links" });
  if (await pasteLinksTab.isVisible()) {
    await pasteLinksTab.click();
    await page.waitForTimeout(500);
  }

  // Find the URL input
  const urlInput = page.locator('input[placeholder*="Paste any link"], textarea[placeholder*="Paste"]').first();
  await urlInput.waitFor({ state: "visible" });
  await urlInput.fill("https://www.pinterest.com/xiaohanjj/travel/");
  await page.waitForTimeout(500);
  await snap(page, "pinterest-url-entered");

  // Click the Extract button
  const extractBtn = page.locator('button:has-text("Extract")').first();
  await extractBtn.click();
  console.log("  Clicked Extract — waiting for content extraction...");

  // Wait for mood board content to appear
  try {
    await page.locator('.break-inside-avoid').first()
      .waitFor({ state: "visible", timeout: 60000 });
    console.log("  Content extracted successfully!");
  } catch {
    console.log("  Extraction slow, waiting more...");
    await page.waitForTimeout(15000);
  }
  await page.waitForTimeout(3000);
  await snap(page, "pinterest-extracted");
  await snap(page, "moodboard-full", true);

  // ═══════════════════════════════════════
  // PHASE 3: Generate Profile
  // ═══════════════════════════════════════
  log("PHASE 3: Generate Taste Profile");

  const genProfileBtn = page.locator('button:has-text("Generate profile")');
  await genProfileBtn.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(2000);
  await snap(page, "before-generate-profile");

  await genProfileBtn.click({ force: true });
  console.log("  Clicked Generate Profile...");

  // Wait for navigation to profile page
  try {
    await page.waitForURL("**/onboarding/profile**", { timeout: 90000 });
    console.log("  Navigated to profile page!");
  } catch {
    console.log("  Still on:", page.url());
    await page.waitForTimeout(30000);
  }

  await page.waitForTimeout(3000);
  await snap(page, "taste-profile-page");
  await snap(page, "taste-profile-full", true);

  // ═══════════════════════════════════════
  // PHASE 4: Adjust Taste Profile
  // ═══════════════════════════════════════
  log("PHASE 4: Adjust Taste Profile");

  const sliders = await page.locator('input[type="range"]').all();
  console.log(`  Found ${sliders.length} dimension sliders`);

  // Adventure=6, Nature=9, Activity=7, Luxury=5, Cultural=9, Social=8
  const targetValues = [6, 9, 7, 5, 9, 8];
  for (let i = 0; i < Math.min(targetValues.length, sliders.length); i++) {
    await sliders[i].fill(String(targetValues[i]));
    await page.waitForTimeout(200);
  }
  console.log("  Adjusted all sliders");
  await snap(page, "profile-sliders-adjusted");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await snap(page, "profile-tags-section", true);

  // Go to dashboard
  const dashboardBtn = page.locator('button:has-text("dashboard"), button:has-text("Dashboard")').first();
  if (await dashboardBtn.isVisible().catch(() => false)) {
    await dashboardBtn.click();
    await page.waitForURL("**/dashboard**", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await snap(page, "dashboard");
  }

  // ═══════════════════════════════════════
  // PHASE 5: Create New Trip
  // ═══════════════════════════════════════
  log("PHASE 5: Create New Trip");

  // Navigate to trip creation
  const newTripLink = page.locator('a[href="/trip/new"], button:has-text("Plan a new trip")').first();
  if (await newTripLink.isVisible().catch(() => false)) {
    await newTripLink.click();
  } else {
    await page.goto("https://derive-app.vercel.app/trip/new");
  }
  await page.waitForTimeout(3000);
  await snap(page, "trip-form-initial");

  // ── Select dates via desktop calendar ──
  // Calendar shows March/April 2026, we need June 2026
  // Click the right arrow to navigate forward: March→April already showing, need 2 more clicks to get to June
  console.log("  Navigating calendar to June 2026...");
  const calNextBtn = page.locator('button:has(svg.lucide-chevron-right), button[aria-label*="next"]').first();

  // Navigate forward: currently showing Mar/Apr. Need May/Jun → click ">" twice
  // Actually the calendar shows 2 months. Mar/Apr → click once → Apr/May → click once → May/Jun → click once → Jun/Jul
  // We need June visible. Let's click 2 times to get to May/June
  for (let i = 0; i < 2; i++) {
    if (await calNextBtn.isVisible().catch(() => false)) {
      await calNextBtn.click();
      await page.waitForTimeout(400);
    }
  }
  await snap(page, "calendar-june");

  // Click June 15 (start date) — find by exact text within the calendar area
  // The calendar buttons contain just the day number
  // We need to click within the calendar grid, specifically in the June column
  // June starts after May in the two-month calendar view
  // Let's find all "15" buttons and click the one in the June area
  const day15Buttons = await page.locator('button').filter({ hasText: /^15$/ }).all();
  console.log(`  Found ${day15Buttons.length} buttons with text "15"`);
  if (day15Buttons.length > 0) {
    // Click the last one (should be in the right/second month which is June)
    await day15Buttons[day15Buttons.length - 1].click();
    await page.waitForTimeout(500);
    console.log("  Clicked start date: June 15");
  }

  // Click June 25 (end date)
  const day25Buttons = await page.locator('button').filter({ hasText: /^25$/ }).all();
  if (day25Buttons.length > 0) {
    await day25Buttons[day25Buttons.length - 1].click();
    await page.waitForTimeout(500);
    console.log("  Clicked end date: June 25");
  }
  await snap(page, "trip-dates-selected");

  // ── Add region ──
  const regionInput = page.locator('input[placeholder*="city or region"]').first();
  if (await regionInput.isVisible().catch(() => false)) {
    await regionInput.fill("Yunnan, China");
    await page.waitForTimeout(500);
    const addBtn = page.locator('button:has-text("Add")').first();
    await addBtn.click();
    await page.waitForTimeout(500);
    console.log("  Added region: Yunnan, China");
    await snap(page, "trip-region-added");
  }

  // ── Fill travel party ──
  const partyInput = page.locator('input[placeholder*="Solo"]').first();
  if (await partyInput.isVisible().catch(() => false)) {
    await partyInput.fill("Group of 8 adults — graduate school program");
    await page.waitForTimeout(300);
    console.log("  Filled travel party");
  }

  // ── Budget — "Moderate" is already selected from screenshot, but let's make sure ──
  const moderateBtn = page.locator('button').filter({ hasText: /^Moderate$/ }).first();
  if (await moderateBtn.isVisible().catch(() => false)) {
    await moderateBtn.click();
    await page.waitForTimeout(300);
  }

  // ── "Anything Else?" textarea ──
  const descTextarea = page.locator('textarea[placeholder*="interests"]').first();
  if (await descTextarea.isVisible().catch(() => false)) {
    await descTextarea.fill("Graduate school cultural immersion program. Focus on ethnic minority villages (Naxi, Bai, Yi cultures), Tiger Leaping Gorge hiking, ancient towns (Lijiang, Dali, Shaxi), authentic Yunnan cuisine (crossing-the-bridge noodles, mushroom hotpot), tea culture, Jade Dragon Snow Mountain, Erhai Lake. Balance of adventure and cultural depth.");
    await page.waitForTimeout(300);
    console.log("  Filled trip description");
  }

  await snap(page, "trip-form-filled");
  await snap(page, "trip-form-filled-full", true);

  // ── Submit ──
  const submitBtn = page.locator('button[type="submit"]').first();
  console.log("  Submitting trip form...");
  await submitBtn.click();

  // Wait for navigation to trip workspace
  try {
    await page.waitForURL(/\/trip\/[a-f0-9-]+/, { timeout: 30000 });
    console.log("  Navigated to trip workspace:", page.url());
  } catch {
    console.log("  Waiting more for trip creation...");
    await page.waitForTimeout(10000);
    console.log("  Current URL:", page.url());
  }
  await page.waitForTimeout(5000);
  await snap(page, "workspace-loading");

  // ═══════════════════════════════════════
  // PHASE 6: Trip Workspace — AI Recommendations
  // ═══════════════════════════════════════
  log("PHASE 6: Workspace — AI Recommendations");

  console.log("  Waiting for AI to stream recommendations (up to 40s)...");
  await page.waitForTimeout(40000);
  await snap(page, "workspace-with-recs");

  // Scroll the right panel to see all recommendation cards
  // The right panel is typically the itinerary/recommendations area
  try {
    const scrollContainer = page.locator('[class*="overflow-y"]').last();
    await scrollContainer.evaluate((el) => el.scrollTo(0, 300));
    await page.waitForTimeout(500);
    await snap(page, "workspace-recs-scrolled-mid");

    await scrollContainer.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(500);
    await snap(page, "workspace-recs-scrolled-bottom");

    // Scroll back to top
    await scrollContainer.evaluate((el) => el.scrollTo(0, 0));
    await page.waitForTimeout(300);
  } catch {
    console.log("  Could not scroll right panel");
  }

  await snap(page, "workspace-full", true);

  // ═══════════════════════════════════════
  // PHASE 7: Bookmark Recommendations
  // ═══════════════════════════════════════
  log("PHASE 7: Bookmark Recommendations");

  // Bookmark buttons are on RecommendationCards
  // They use the Bookmark lucide icon, likely inside small buttons
  // Let's try multiple selector strategies
  let bookmarkBtns = await page.locator('button svg.lucide-bookmark').locator('..').all();
  console.log(`  Found ${bookmarkBtns.length} bookmark buttons (lucide-bookmark parent)`);

  if (bookmarkBtns.length === 0) {
    // Try broader: any small button near recommendation cards
    bookmarkBtns = await page.locator('[class*="ecommendation"] button, [class*="card"] button').all();
    console.log(`  Found ${bookmarkBtns.length} buttons in card areas`);
  }

  if (bookmarkBtns.length === 0) {
    // Even broader — get all small icon-only buttons in the right panel area
    bookmarkBtns = await page.locator('button:has(svg)').all();
    console.log(`  Found ${bookmarkBtns.length} icon buttons total — will try first few in right panel`);
    // Filter to only buttons that are small (likely icon-only toggles)
  }

  let bookmarked = 0;
  for (let i = 0; i < Math.min(8, bookmarkBtns.length); i++) {
    try {
      const btn = bookmarkBtns[i];
      const box = await btn.boundingBox();
      // Only click buttons in the right half of the screen (recommendation panel)
      if (box && box.x > 700 && box.width < 60 && box.height < 60) {
        await btn.click();
        await page.waitForTimeout(400);
        bookmarked++;
        console.log(`  Bookmarked #${bookmarked} (x=${Math.round(box.x)}, y=${Math.round(box.y)})`);
        if (bookmarked >= 4) break;
      }
    } catch {
      // skip
    }
  }
  console.log(`  Total bookmarked: ${bookmarked}`);
  await snap(page, "workspace-bookmarked");

  // ═══════════════════════════════════════
  // PHASE 8: Generate Itinerary
  // ═══════════════════════════════════════
  log("PHASE 8: Generate Itinerary");

  // Scroll down to find the "Generate Itinerary" button (sticky at bottom of panel)
  const generateItinBtn = page.locator('button:has-text("Generate"), button:has-text("generate")').last();
  if (await generateItinBtn.isVisible().catch(() => false)) {
    const btnText = await generateItinBtn.textContent();
    console.log(`  Found button: "${btnText}"`);
    await generateItinBtn.click();
    console.log("  Clicked Generate Itinerary — waiting for AI...");

    await page.waitForTimeout(15000);
    await snap(page, "itinerary-generating");

    // Wait for full generation
    await page.waitForTimeout(40000);
    await snap(page, "itinerary-generated");
  } else {
    console.log("  Generate Itinerary button not found, checking for alternatives...");
    // Maybe we need to scroll to find it
    const allBtns = await page.locator('button').all();
    for (const btn of allBtns) {
      const text = await btn.textContent().catch(() => "");
      if (text.toLowerCase().includes("generat") || text.toLowerCase().includes("itinerary")) {
        console.log(`  Found candidate button: "${text}"`);
      }
    }
    await snap(page, "no-generate-btn");
  }

  await snap(page, "workspace-itinerary", true);

  // ═══════════════════════════════════════
  // PHASE 9: Chat — Request Modifications
  // ═══════════════════════════════════════
  log("PHASE 9: Chat — Modify Itinerary");

  const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: "" }).last();
  // More specific: find the chat input at the bottom of the left panel
  const chatTextarea = page.locator('textarea').first();
  if (await chatTextarea.isVisible().catch(() => false)) {
    await chatTextarea.fill("Add a visit to Pudacuo National Park and suggest some authentic Yunnan mushroom hotpot restaurants for our group of 8.");
    await page.waitForTimeout(500);
    await snap(page, "chat-message-typed");

    // Submit — press Enter or click send
    await chatTextarea.press("Enter");
    console.log("  Sent chat modification request...");

    await page.waitForTimeout(25000);
    await snap(page, "chat-response");
  } else {
    console.log("  Chat textarea not found");
    await snap(page, "no-chat-input");
  }

  // ═══════════════════════════════════════
  // PHASE 10: Explore Itinerary Panel
  // ═══════════════════════════════════════
  log("PHASE 10: Explore Itinerary Details");

  // Try to find and click on the Ideas bucket toggle
  const ideasToggle = page.locator('button:has(svg.lucide-bookmark)').first();
  if (await ideasToggle.isVisible().catch(() => false)) {
    await ideasToggle.click();
    await page.waitForTimeout(1000);
    await snap(page, "ideas-bucket");
  }

  // Scroll through the itinerary
  try {
    const rightPanel = page.locator('[class*="overflow-y"]').last();
    const scrollHeight = await rightPanel.evaluate((el) => el.scrollHeight);
    console.log(`  Itinerary panel scroll height: ${scrollHeight}px`);

    for (const pct of [25, 50, 75, 100]) {
      await rightPanel.evaluate((el, p) => el.scrollTo(0, (el.scrollHeight * p) / 100), pct);
      await page.waitForTimeout(500);
      await snap(page, `itinerary-scroll-${pct}pct`);
    }
  } catch {
    console.log("  Could not scroll itinerary panel");
  }

  // Final state
  await snap(page, "final-state");
  await snap(page, "final-full", true);

  // ═══════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════
  log("AUDIT COMPLETE");
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log("Final URL:", page.url());

  await page.waitForTimeout(2000);
  await browser.close();
})();
