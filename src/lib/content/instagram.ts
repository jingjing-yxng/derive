export interface ExtractedContent {
  imageUrls: string[];
  text: string;
}

/**
 * Extract the username from an Instagram URL.
 * Handles: /username/, /username, /p/CODE/, /reel/CODE/
 */
function parseInstagramUrl(url: string): { username?: string; isProfile: boolean } {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return { isProfile: false };

    // Individual post or reel
    if (["p", "reel", "stories", "explore", "accounts"].includes(segments[0])) {
      return { isProfile: false };
    }

    // Profile URL: /username/
    return { username: segments[0], isProfile: true };
  } catch {
    return { isProfile: false };
  }
}

/**
 * Fetch Instagram profile data via our own edge-runtime proxy.
 * The edge function runs on Cloudflare's network (different IPs from Vercel serverless),
 * avoiding Instagram's rate limiting of Vercel's shared IPs.
 */
async function fetchProfileViaApi(username: string): Promise<ExtractedContent> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT || 3000}`;

  const res = await fetch(
    `${baseUrl}/api/instagram-profile?username=${encodeURIComponent(username)}`,
    { signal: AbortSignal.timeout(28000) }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Edge proxy returned ${res.status}`);
  }

  const data = await res.json();
  return {
    imageUrls: data.imageUrls || [],
    text: buildProfileDescription(data),
  };
}

/**
 * Build a rich text description of an Instagram profile for taste profiling.
 * Includes account name, bio, follower scale, category, and recent post captions
 * so the AI can infer what following this account signals about the user's taste.
 */
function buildProfileDescription(data: {
  fullName?: string;
  biography?: string;
  followerCount?: number;
  category?: string | null;
  isBusiness?: boolean;
  captions?: string[];
  text?: string;
}): string {
  const lines: string[] = [];

  lines.push(`[Instagram Profile: @${data.fullName || "unknown"}]`);

  if (data.biography) {
    lines.push(`Bio: ${data.biography}`);
  }

  if (data.followerCount && data.followerCount > 0) {
    const scale = data.followerCount > 1_000_000
      ? `${(data.followerCount / 1_000_000).toFixed(1)}M`
      : data.followerCount > 1_000
        ? `${(data.followerCount / 1_000).toFixed(0)}K`
        : String(data.followerCount);
    lines.push(`Followers: ${scale}`);
  }

  if (data.category) {
    lines.push(`Category: ${data.category}`);
  }

  if (data.isBusiness) {
    lines.push("Account type: Business/Creator");
  }

  if (data.captions && data.captions.length > 0) {
    lines.push("Recent post captions:");
    for (const caption of data.captions.slice(0, 5)) {
      lines.push(`- ${caption}`);
    }
  }

  return lines.join("\n");
}

/**
 * Fallback: fetch OG image from Instagram page HTML.
 * Tries browser UA first, then Googlebot UA (which Instagram whitelists for SEO).
 */
async function fetchViaHtml(url: string): Promise<ExtractedContent> {
  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  ];

  for (const ua of userAgents) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": ua },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;

      const html = await res.text();
      const imageUrls: string[] = [];
      const texts: string[] = [];

      // Extract og:image — handle both attribute orders and HTML entities
      const ogMatch =
        html.match(/property="og:image"\s+content="([^"]+)"/) ||
        html.match(/content="([^"]+)"\s+property="og:image"/);
      if (ogMatch) {
        let imgUrl = ogMatch[1].replace(/&amp;/g, "&");
        // Upgrade small profile pics to larger size
        imgUrl = imgUrl.replace(/dst-jpg_s\d+x\d+/, "dst-jpg_s320x320");
        imageUrls.push(imgUrl);
      }

      // Twitter image fallback
      const twMatch = html.match(/name="twitter:image"\s+content="([^"]+)"/);
      if (twMatch && !imageUrls.includes(twMatch[1])) {
        imageUrls.push(twMatch[1].replace(/&amp;/g, "&"));
      }

      // Text
      const titleMatch = html.match(/property="og:title"\s+content="([^"]+)"/);
      const descMatch = html.match(/property="og:description"\s+content="([^"]+)"/);
      if (titleMatch) texts.push(titleMatch[1].replace(/&#\w+;/g, ""));
      if (descMatch) texts.push(descMatch[1].replace(/&#\w+;/g, ""));

      if (imageUrls.length > 0) {
        return { imageUrls, text: texts.join("\n") };
      }
    } catch {
      // try next UA
    }
  }

  return { imageUrls: [], text: "" };
}

export async function extractInstagramContent(url: string): Promise<ExtractedContent> {
  const { username, isProfile } = parseInstagramUrl(url);

  // For profiles, try the API to get recent post thumbnails
  if (isProfile && username) {
    try {
      const result = await fetchProfileViaApi(username);
      if (result.imageUrls.length > 0) return result;
    } catch {
      // API blocked (429) — fall through
    }
  }

  // Fallback to HTML scraping (tries browser UA then Googlebot UA)
  // Googlebot UA reliably returns og:image (profile pic) from Instagram
  const htmlResult = await fetchViaHtml(url);
  if (htmlResult.imageUrls.length > 0) return htmlResult;

  // If everything failed, return empty — extract route handles this
  if (isProfile && username) {
    return {
      imageUrls: [],
      text: `@${username}\nInstagram Profile`,
    };
  }

  throw new Error("Could not extract content from this Instagram URL");
}
