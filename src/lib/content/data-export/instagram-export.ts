import JSZip from "jszip";

interface ParsedExportItem {
  url: string;
  timestamp?: number;
}

/**
 * Parse an Instagram data export ZIP file to extract saved post URLs.
 *
 * Instagram export structure (JSON format):
 * - your_instagram_activity/saved/saved_posts.json
 * - OR saved_saved_media (older format)
 *
 * Each saved item has: { string_list_data: [{ href: "...", timestamp: ... }] }
 */
export async function parseInstagramExport(file: Buffer): Promise<ParsedExportItem[]> {
  const zip = await JSZip.loadAsync(file);
  const items: ParsedExportItem[] = [];

  // Try multiple known paths for saved posts in Instagram exports
  const possiblePaths = [
    "your_instagram_activity/saved/saved_posts.json",
    "saved/saved_posts.json",
    "saved_saved_media.json",
    "your_instagram_activity/saved/saved_media.json",
  ];

  let parsed: Record<string, unknown> | null = null;

  for (const path of possiblePaths) {
    const entry = zip.file(path);
    if (entry) {
      const text = await entry.async("text");
      parsed = JSON.parse(text);
      break;
    }
  }

  // If exact path not found, search for any JSON file containing "saved" in the name
  if (!parsed) {
    const allFiles = Object.keys(zip.files);
    const savedFile = allFiles.find(
      (f) => f.toLowerCase().includes("saved") && f.endsWith(".json")
    );
    if (savedFile) {
      const entry = zip.file(savedFile);
      if (entry) {
        const text = await entry.async("text");
        parsed = JSON.parse(text);
      }
    }
  }

  if (!parsed) {
    return items;
  }

  // Handle different export structures
  const mediaArrays = [
    (parsed as Record<string, unknown>).saved_saved_media,
    (parsed as Record<string, unknown>).saved_posts,
    parsed, // might be the array itself
  ];

  for (const mediaArray of mediaArrays) {
    if (!Array.isArray(mediaArray)) continue;

    for (const item of mediaArray) {
      const stringListData = item?.string_list_data;
      if (Array.isArray(stringListData)) {
        for (const entry of stringListData) {
          if (entry?.href && typeof entry.href === "string") {
            const url = entry.href;
            // Only include Instagram post URLs
            if (url.includes("instagram.com")) {
              items.push({
                url,
                timestamp: entry.timestamp,
              });
            }
          }
        }
      }
    }
  }

  // Sort by timestamp (most recent first) and cap at 50
  items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return items.slice(0, 50);
}
