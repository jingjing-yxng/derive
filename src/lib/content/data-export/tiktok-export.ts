import JSZip from "jszip";

interface ParsedExportItem {
  url: string;
  date?: string;
}

/**
 * Parse a TikTok data export ZIP/JSON to extract favorited/liked video URLs.
 *
 * TikTok export structure (JSON format):
 * {
 *   "Activity": {
 *     "Favorite Videos": {
 *       "FavoriteVideoList": [
 *         { "Date": "2024-01-15", "Link": "https://www.tiktokv.com/..." }
 *       ]
 *     },
 *     "Like List": {
 *       "ItemFavoriteList": [
 *         { "Date": "2024-01-15", "Link": "https://www.tiktokv.com/..." }
 *       ]
 *     }
 *   }
 * }
 */
export async function parseTikTokExport(file: Buffer): Promise<ParsedExportItem[]> {
  const items: ParsedExportItem[] = [];

  // Try parsing as ZIP first, then as raw JSON
  let parsed: Record<string, unknown> | null = null;

  try {
    const zip = await JSZip.loadAsync(file);

    // Search for the main data file in the ZIP
    const possiblePaths = [
      "user_data.json",
      "Activity/Favorite Videos.json",
      "Activity/Like List.json",
    ];

    for (const path of possiblePaths) {
      const entry = zip.file(path);
      if (entry) {
        const text = await entry.async("text");
        parsed = JSON.parse(text);
        break;
      }
    }

    // Search for any JSON file with activity data
    if (!parsed) {
      const allFiles = Object.keys(zip.files);
      const activityFile = allFiles.find(
        (f) =>
          (f.toLowerCase().includes("favorite") || f.toLowerCase().includes("like") || f.toLowerCase().includes("activity")) &&
          f.endsWith(".json")
      );
      if (activityFile) {
        const entry = zip.file(activityFile);
        if (entry) {
          const text = await entry.async("text");
          parsed = JSON.parse(text);
        }
      }
    }
  } catch {
    // Not a ZIP - try parsing as raw JSON
    try {
      parsed = JSON.parse(file.toString("utf-8"));
    } catch {
      return items;
    }
  }

  if (!parsed) return items;

  // Extract from nested TikTok structure
  const activity = (parsed as Record<string, Record<string, unknown>>).Activity || parsed;

  // Favorite Videos
  const favorites =
    (activity as Record<string, Record<string, unknown[]>>)?.["Favorite Videos"]?.FavoriteVideoList ||
    (activity as Record<string, unknown[]>)?.FavoriteVideoList;

  if (Array.isArray(favorites)) {
    for (const item of favorites) {
      const link = (item as Record<string, string>)?.Link;
      if (link && typeof link === "string") {
        items.push({ url: link, date: (item as Record<string, string>)?.Date });
      }
    }
  }

  // Like List
  const likes =
    (activity as Record<string, Record<string, unknown[]>>)?.["Like List"]?.ItemFavoriteList ||
    (activity as Record<string, unknown[]>)?.ItemFavoriteList;

  if (Array.isArray(likes)) {
    for (const item of likes) {
      const link = (item as Record<string, string>)?.Link;
      if (link && typeof link === "string" && !items.some((i) => i.url === link)) {
        items.push({ url: link, date: (item as Record<string, string>)?.Date });
      }
    }
  }

  // Sort by date (most recent first) and cap at 50
  items.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return items.slice(0, 50);
}
