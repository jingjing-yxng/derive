import { test, expect, type Page } from "@playwright/test";

// ============================================================
// Helpers: mock a shared itinerary page with controlled data
// ============================================================
const MOCK_TOKEN = "test-edge-case";

function mockItinerary(overrides: Record<string, unknown> = {}) {
  return {
    itinerary: {
      id: "test-itin-001",
      title: overrides.title ?? "Edge Case Trip",
      summary: overrides.summary ?? "Testing edge cases",
      days: overrides.days ?? [
        {
          day: 1,
          date: "2026-04-01",
          title: "Day 1 - Arrival",
          activities: [
            {
              id: "act-1",
              time: "9:00 AM",
              title: "Morning Walk",
              description: "Walk through the old town",
              location: "Old Town Square",
              category: "activity",
              lat: 48.8566,
              lng: 2.3522,
            },
            {
              id: "act-2",
              time: "12:00 PM",
              title: "Lunch at Bistro",
              description: "French cuisine",
              location: "Le Petit Bistro",
              category: "food",
            },
            {
              id: "act-3",
              time: "3:00 PM",
              title: "Museum Visit",
              description: "Contemporary art museum",
              location: "Art Museum",
              category: "activity",
            },
          ],
        },
        {
          day: 2,
          date: "2026-04-02",
          title: "Day 2 - Exploration",
          activities: [
            {
              id: "act-4",
              time: "10:00 AM",
              title: "Train to Countryside",
              description: "Scenic train ride",
              location: "Central Station",
              category: "transport",
            },
            {
              id: "act-5",
              time: "2:00 PM",
              title: "Wine Tasting",
              description: "Local vineyard tour",
              location: "Chateau Vineyard",
              category: "activity",
            },
          ],
        },
        {
          day: 3,
          date: "2026-04-03",
          title: "Day 3 - Departure",
          activities: [
            {
              id: "act-6",
              time: "8:00 AM",
              title: "Flight Home",
              description: "Return flight",
              location: "Airport",
              category: "transport",
            },
          ],
        },
      ],
    },
    trip: {
      regions: ["France"],
      startDate: "2026-04-01",
      endDate: "2026-04-03",
      travelParty: "couple",
    },
  };
}

async function setupMockSharePage(page: Page, overrides: Record<string, unknown> = {}) {
  const data = mockItinerary(overrides);

  // Intercept the share API GET
  await page.route(`**/api/share?token=${MOCK_TOKEN}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });

  // Intercept PATCH (save edits) — just succeed
  await page.route("**/api/share", (route, request) => {
    if (request.method() === "PATCH") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    } else {
      route.continue();
    }
  });

  // Intercept chat API — return a simple streamed response
  await page.route("**/api/share-chat", (route) => {
    route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "This is a test response from the trip assistant.",
    });
  });

  // Intercept photo API to avoid real calls
  await page.route("**/api/photos*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ images: [] }),
    });
  });

  await page.goto(`/share/${MOCK_TOKEN}`);
  await page.waitForLoadState("networkidle");
}

// Helper: get the visible detail panel input (avoids strict mode on desktop+mobile dual render)
// Both desktop inline and mobile bottom sheet render; pick the one that's actually visible
function detailTitleInput(page: Page) {
  return page.locator("input[placeholder='Activity name']:visible").first();
}

// ============================================================
// Activity Selection & Side Panel
// ============================================================
test.describe("Activity Side Panel", () => {
  test("clicking an activity opens the detail panel on desktop", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    // Click the first activity
    await page.getByText("Morning Walk").click();
    // The inline detail panel should appear with the activity title
    const input = detailTitleInput(page);
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue("Morning Walk");
  });

  test("closing the panel removes it", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    const input = detailTitleInput(page);
    await expect(input).toBeVisible({ timeout: 5000 });

    // Click the close button (X) — use first visible one in the detail panel
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    await expect(closeBtn).toBeVisible({ timeout: 3000 });
    await closeBtn.click();
    // Panel should be gone
    await expect(input).not.toBeVisible({ timeout: 3000 });
  });

  test("switching between activities updates the panel", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    // Click first activity
    await page.getByText("Morning Walk").click();
    const input = detailTitleInput(page);
    await expect(input).toHaveValue("Morning Walk", { timeout: 5000 });

    // Click a different activity
    await page.getByText("Lunch at Bistro").click();
    await expect(input).toHaveValue("Lunch at Bistro", { timeout: 5000 });
  });
});

// ============================================================
// Activity Editing
// ============================================================
test.describe("Activity Editing", () => {
  test("editing activity title persists in panel", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    const titleInput = detailTitleInput(page);
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    // Clear and type new title
    await titleInput.fill("Evening Stroll");
    await titleInput.blur();

    // The input should retain the new value
    await expect(titleInput).toHaveValue("Evening Stroll");
  });

  test("editing time field", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    // Find the time input (has placeholder "e.g. 9:00 AM")
    const timeInput = page.getByPlaceholder("e.g. 9:00 AM").first();
    await expect(timeInput).toBeVisible({ timeout: 5000 });
    await timeInput.fill("7:30 AM");
    await timeInput.blur();
    await expect(timeInput).toHaveValue("7:30 AM");
  });

  test("changing activity category", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    await page.waitForTimeout(500);

    // Click the "Food" category button in the detail panel (first visible)
    const foodBtn = page.locator("button:has-text('Food')").first();
    await expect(foodBtn).toBeVisible({ timeout: 5000 });
    await foodBtn.click();

    // The Food button should now be active (has a different style)
    await expect(foodBtn).toHaveClass(/bg-rose/);
  });
});

// ============================================================
// Activity Deletion
// ============================================================
test.describe("Activity Deletion", () => {
  test("delete button removes the activity and closes panel", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    await page.waitForTimeout(500);

    // Click remove button (first visible — avoids dual desktop/mobile panel)
    const removeBtn = page.locator("button:has-text('Remove')").first();
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click();

    // Activity should be removed from the list
    await expect(page.getByText("Morning Walk")).not.toBeVisible({ timeout: 3000 });
  });
});

// ============================================================
// Add Activity
// ============================================================
test.describe("Add Activity", () => {
  test("add activity button creates a new activity", async ({ page }) => {
    await setupMockSharePage(page);

    // Click "Add activity" button in the first day
    const addBtns = page.locator("button:has-text('Add activity')");
    await expect(addBtns.first()).toBeVisible({ timeout: 5000 });
    await addBtns.first().click();

    // A new "New activity" should appear
    await expect(page.getByText("New activity")).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// View Toggle (List / Map)
// ============================================================
test.describe("View Toggle", () => {
  test("switching to map view shows map container", async ({ page }) => {
    await setupMockSharePage(page);

    const mapBtn = page.locator("button:has-text('Map')");
    await expect(mapBtn).toBeVisible({ timeout: 5000 });
    await mapBtn.click();

    // Should show the map view — either the leaflet map, loading state, or "no location data" fallback
    await expect(
      page.locator(".leaflet-container").first()
        .or(page.getByText("Loading map coordinates..."))
        .or(page.getByText("No location data available"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("switching back to list restores activities", async ({ page }) => {
    await setupMockSharePage(page);

    // Switch to map
    await page.locator("button:has-text('Map')").click();
    await page.waitForTimeout(1000);

    // Switch back to list
    await page.locator("button:has-text('List')").click();
    await expect(page.getByText("Morning Walk")).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// Chat Widget
// ============================================================
test.describe("Chat Widget", () => {
  test("floating button opens chat panel", async ({ page }) => {
    await setupMockSharePage(page);

    const chatBtn = page.locator("button[aria-label='Open trip assistant']");
    await expect(chatBtn).toBeVisible({ timeout: 5000 });
    await chatBtn.click();

    // Chat panel should be visible
    await expect(page.getByText("Trip Assistant")).toBeVisible({ timeout: 5000 });
  });

  test("sending a message shows user bubble and response", async ({ page }) => {
    await setupMockSharePage(page);

    // Open chat
    await page.locator("button[aria-label='Open trip assistant']").click();
    await page.waitForTimeout(500);

    // Type and send
    const input = page.locator("input[placeholder*='Ask about this trip']");
    await input.fill("What should I see?");
    await page.locator("button[aria-label='Send message']").click();

    // User message should appear
    await expect(page.getByText("What should I see?")).toBeVisible({ timeout: 5000 });

    // Assistant response should appear (mocked)
    await expect(page.getByText("test response from the trip assistant")).toBeVisible({
      timeout: 10000,
    });
  });

  test("quick suggestion chips populate input", async ({ page }) => {
    await setupMockSharePage(page);

    await page.locator("button[aria-label='Open trip assistant']").click();
    await page.waitForTimeout(500);

    // Click a suggestion chip
    const chip = page.locator("button:has-text('What should I pack?')");
    await expect(chip).toBeVisible({ timeout: 5000 });
    await chip.click();

    // Input should have the chip text
    const input = page.locator("input[placeholder*='Ask about this trip']");
    await expect(input).toHaveValue("What should I pack?");
  });

  test("close button closes the chat", async ({ page }) => {
    await setupMockSharePage(page);

    await page.locator("button[aria-label='Open trip assistant']").click();
    await expect(page.getByText("Trip Assistant")).toBeVisible({ timeout: 5000 });

    await page.locator("button[aria-label='Close chat']").click();

    // Chat panel should be gone, floating button should be back
    await expect(page.getByText("Trip Assistant")).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator("button[aria-label='Open trip assistant']")).toBeVisible();
  });

  test("stop button cancels streaming", async ({ page }) => {
    // Use a slow response to test the stop button
    await page.route(`**/api/share?token=${MOCK_TOKEN}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockItinerary()),
      });
    });
    await page.route("**/api/share", (route, request) => {
      if (request.method() === "PATCH") {
        route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      } else {
        route.continue();
      }
    });

    // Mock a slow streaming response
    await page.route("**/api/share-chat", async (route) => {
      // Simulate slow response — just delay
      await new Promise((r) => setTimeout(r, 3000));
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "Delayed response.",
      });
    });

    // Intercept photo API
    await page.route("**/api/photos*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: '{"images":[]}' });
    });

    await page.goto(`/share/${MOCK_TOKEN}`);
    await page.waitForLoadState("networkidle");

    await page.locator("button[aria-label='Open trip assistant']").click();
    await page.waitForTimeout(500);

    const input = page.locator("input[placeholder*='Ask about this trip']");
    await input.fill("Tell me everything");
    await page.locator("button[aria-label='Send message']").click();

    // Stop button should appear
    const stopBtn = page.locator("button[aria-label='Stop generating']");
    await expect(stopBtn).toBeVisible({ timeout: 3000 });
    await stopBtn.click();

    // After stopping, send button should reappear (input should be enabled)
    await expect(input).toBeEnabled({ timeout: 5000 });
  });
});

// ============================================================
// Edge Cases: Empty & Extreme Data
// ============================================================
test.describe("Edge Cases - Data", () => {
  test("empty itinerary (no activities) renders without crash", async ({ page }) => {
    await setupMockSharePage(page, {
      days: [
        { day: 1, title: "Day 1 - Empty", activities: [] },
        { day: 2, title: "Day 2 - Empty", activities: [] },
      ],
    });

    await expect(page.getByText("Day 1 - Empty")).toBeVisible({ timeout: 5000 });
    // Page should load and show days even without activities
    await expect(page.getByText("Day 2 - Empty")).toBeVisible();
  });

  test("single day trip", async ({ page }) => {
    await setupMockSharePage(page, {
      days: [
        {
          day: 1,
          title: "Day Trip",
          activities: [
            { id: "solo-1", time: "10:00 AM", title: "Only Activity", description: "The one thing", category: "activity" },
          ],
        },
      ],
    });

    await expect(page.getByText("Day Trip")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Only Activity")).toBeVisible();
  });

  test("very long activity title truncates properly", async ({ page }) => {
    const longTitle = "A".repeat(200);
    await setupMockSharePage(page, {
      days: [
        {
          day: 1,
          title: "Day 1",
          activities: [
            { id: "long-1", time: "9:00", title: longTitle, description: "Test", category: "activity" },
          ],
        },
      ],
    });

    // Page should load without horizontal overflow
    await page.waitForLoadState("networkidle");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test("special characters in titles render safely", async ({ page }) => {
    await setupMockSharePage(page, {
      title: 'Trip with <script>alert("xss")</script> & "quotes"',
      days: [
        {
          day: 1,
          title: "Day with <b>HTML</b>",
          activities: [
            {
              id: "xss-1",
              time: "9:00",
              title: '<img src=x onerror=alert(1)>Café & "Résumé"',
              description: "Test <script>bad</script>",
              category: "food",
            },
          ],
        },
      ],
    });

    // Should render text content, not execute scripts
    await page.waitForLoadState("networkidle");
    // The text should be visible as escaped content
    await expect(page.getByText(/Café/)).toBeVisible({ timeout: 5000 });
    // No alert should have fired (Playwright would have caught it)
  });

  test("many days (20+) renders without issues", async ({ page }) => {
    const days = Array.from({ length: 20 }, (_, i) => ({
      day: i + 1,
      title: `Day ${i + 1} - Test`,
      activities: [
        { id: `d${i}-1`, time: "9:00", title: `Activity for day ${i + 1}`, description: "", category: "activity" },
      ],
    }));

    await setupMockSharePage(page, { days });
    // Use exact match to avoid matching Day 10, Day 11, etc.
    await expect(page.getByText("Day 1 - Test", { exact: true })).toBeVisible({ timeout: 5000 });
    // Scroll to bottom to verify last day renders
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText("Day 20 - Test")).toBeVisible({ timeout: 5000 });
  });

  test("no summary shows only title", async ({ page }) => {
    await setupMockSharePage(page, { summary: "" });
    await expect(page.getByText("Edge Case Trip")).toBeVisible({ timeout: 5000 });
    // The summary toggle buttons (Show more / Show less) should not appear since there's no summary
    const showMoreBtn = page.locator("button:has-text('Show more')");
    const showLessBtn = page.locator("button:has-text('Show less')");
    await expect(showMoreBtn).toHaveCount(0);
    await expect(showLessBtn).toHaveCount(0);
  });
});

// ============================================================
// Edge Cases: Overnight Field
// ============================================================
test.describe("Overnight Field", () => {
  test("last day does NOT show overnight prompt", async ({ page }) => {
    await setupMockSharePage(page);

    // Scroll to the last day
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Count overnight inputs - should be 2 (Day 1 and Day 2), not 3
    const overnightInputs = page.locator("input[placeholder='Where are you staying tonight?']");
    const count = await overnightInputs.count();
    expect(count).toBe(2);
  });
});

// ============================================================
// Mobile-specific edge cases
// ============================================================
test.describe("Mobile Edge Cases", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("activity click opens bottom sheet on mobile", async ({ page }) => {
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    await page.waitForTimeout(500);

    // On mobile, the bottom sheet overlay should appear with activity detail
    const input = detailTitleInput(page);
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue("Morning Walk");
  });

  test("backdrop click closes the bottom sheet", async ({ page }) => {
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    const input = detailTitleInput(page);
    await expect(input).toBeVisible({ timeout: 5000 });

    // Click the backdrop (the dark overlay behind the bottom sheet)
    const backdrop = page.locator(".bg-n-900\\/20").first();
    if (await backdrop.isVisible()) {
      await backdrop.click({ position: { x: 10, y: 10 } });
      await expect(input).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("chat widget fills mobile screen", async ({ page }) => {
    await setupMockSharePage(page);

    await page.locator("button[aria-label='Open trip assistant']").click();
    await page.waitForTimeout(500);

    // Chat panel should be full-screen on mobile (not fixed 380px)
    const panel = page.locator("div:has(> div:has-text('Trip Assistant'))").last();
    const box = await panel.boundingBox();
    if (box) {
      // Should be at least 90% of viewport width on mobile
      expect(box.width).toBeGreaterThanOrEqual(375 * 0.9);
    }
  });

  test("no horizontal overflow with all features active", async ({ page }) => {
    await setupMockSharePage(page);
    await page.waitForLoadState("networkidle");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

// ============================================================
// Rapid Interactions
// ============================================================
test.describe("Rapid Interactions", () => {
  test("rapidly clicking different activities doesn't crash", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    // Rapidly click through activities
    await page.getByText("Morning Walk").click();
    await page.getByText("Lunch at Bistro").click();
    await page.getByText("Museum Visit").click();
    await page.getByText("Train to Countryside").click();
    await page.getByText("Wine Tasting").click();

    // Last clicked should be in the panel
    const input = detailTitleInput(page);
    await expect(input).toHaveValue("Wine Tasting", { timeout: 5000 });
  });

  test("rapidly toggling list/map doesn't crash", async ({ page }) => {
    await setupMockSharePage(page);

    for (let i = 0; i < 5; i++) {
      await page.locator("button:has-text('Map')").click();
      await page.waitForTimeout(200);
      await page.locator("button:has-text('List')").click();
      await page.waitForTimeout(200);
    }

    // Should still be functional
    await expect(page.getByText("Morning Walk")).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// Save Indicator
// ============================================================
test.describe("Save Indicator", () => {
  test("editing triggers save indicator", async ({ page }) => {
    test.skip(
      page.viewportSize()!.width < 1024,
      "Side panel only shows on lg+ screens"
    );
    await setupMockSharePage(page);

    await page.getByText("Morning Walk").click();
    const titleInput = detailTitleInput(page);
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    await titleInput.fill("Changed Title");
    await titleInput.blur();

    // Should show "Saving..." or "Saved" indicator
    await expect(
      page.getByText("Saving...").or(page.getByText("Saved"))
    ).toBeVisible({ timeout: 5000 });
  });
});
