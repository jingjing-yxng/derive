export type Platform =
  | "pinterest"
  | "rednote"
  | "instagram"
  | "tiktok"
  | "douyin"
  | "youtube"
  | "unknown";

const PLATFORM_LABELS: Record<Platform, string> = {
  pinterest: "Pinterest",
  rednote: "RedNote",
  instagram: "Instagram",
  tiktok: "TikTok",
  douyin: "Douyin",
  youtube: "YouTube",
  unknown: "Link",
};

/**
 * Detect the actual platform from a URL string.
 * More reliable than source_type since the DB constraint limits allowed values.
 */
export function detectPlatform(url: string | undefined | null): Platform {
  if (!url) return "unknown";
  if (url.includes("pinterest.com") || url.includes("pin.it")) return "pinterest";
  if (url.includes("xiaohongshu.com") || url.includes("xhslink.com")) return "rednote";
  if (url.includes("instagram.com") || url.includes("instagr.am")) return "instagram";
  if (url.includes("tiktok.com") || url.includes("vm.tiktok.com")) return "tiktok";
  if (url.includes("douyin.com")) return "douyin";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return "unknown";
}

export function getPlatformLabel(url: string | undefined | null): string {
  return PLATFORM_LABELS[detectPlatform(url)];
}

/**
 * Check if an Instagram URL points to a profile (not a single post/reel).
 */
/**
 * Check if a Pinterest URL points to a board (not a single pin).
 * Board URLs: /username/boardname/ — Pin URLs: /pin/123/
 */
export function isPinterestBoard(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    // Board URLs have ≥2 segments and the first is NOT "pin"
    return segments.length >= 2 && segments[0] !== "pin";
  } catch {
    return false;
  }
}

export function isInstagramProfile(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    // Profile URLs: /username/ (1 segment, not p/reel/stories/explore)
    if (segments.length <= 1 && !["p", "reel", "stories", "explore", "accounts"].includes(segments[0])) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
