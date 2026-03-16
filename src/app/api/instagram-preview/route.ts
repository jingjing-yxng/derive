import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

/**
 * Lightweight endpoint that returns a single preview image URL for an Instagram profile.
 * Tries the simplest/fastest strategies first — embed page, OG tags, proxies.
 */
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  // Strategy 1: Embed page — even small responses may contain image URLs
  try {
    const res = await fetch(
      `https://www.instagram.com/${encodeURIComponent(username)}/embed/`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const html = await res.text();
      // Look for display_url (post images) — these are the grid photos
      const displayMatch = html.match(/display_url\\":\\"(https?:[^"]+?)\\"/);
      if (displayMatch) {
        const imageUrl = displayMatch[1].replace(/\\/g, "");
        return NextResponse.json({ imageUrl });
      }
      // Fallback: profile picture
      const picMatch = html.match(/profile_pic_url\\":\\"(https?:[^"]+?)\\"/);
      if (picMatch) {
        const imageUrl = picMatch[1].replace(/\\/g, "");
        return NextResponse.json({ imageUrl });
      }
      // Try og:image from embed page
      const ogMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
      if (ogMatch) {
        return NextResponse.json({ imageUrl: ogMatch[1].replace(/&amp;/g, "&") });
      }
    }
  } catch {}

  // Strategy 2: Googlebot UA — Instagram whitelists for SEO
  try {
    const res = await fetch(
      `https://www.instagram.com/${encodeURIComponent(username)}/`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.53 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.ok) {
      const html = await res.text();
      const ogMatch =
        html.match(/property="og:image"\s+content="([^"]+)"/) ||
        html.match(/content="([^"]+)"\s+property="og:image"/);
      if (ogMatch) {
        let picUrl = ogMatch[1].replace(/&amp;/g, "&");
        picUrl = picUrl.replace(/dst-jpg_s\d+x\d+/, "dst-jpg_s640x640");
        return NextResponse.json({ imageUrl: picUrl });
      }
    }
  } catch {}

  // Strategy 3: CORS proxy for embed page
  const proxyUrls = [
    `https://corsproxy.io/?${encodeURIComponent(`https://www.instagram.com/${username}/embed/`)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.instagram.com/${username}/embed/`)}`,
  ];
  for (const proxyUrl of proxyUrls) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const html = await res.text();
      const displayMatch = html.match(/display_url\\":\\"(https?:[^"]+?)\\"/);
      if (displayMatch) {
        return NextResponse.json({ imageUrl: displayMatch[1].replace(/\\/g, "") });
      }
      const picMatch = html.match(/profile_pic_url\\":\\"(https?:[^"]+?)\\"/);
      if (picMatch) {
        return NextResponse.json({ imageUrl: picMatch[1].replace(/\\/g, "") });
      }
    } catch {}
  }

  return NextResponse.json({ error: "Could not fetch preview" }, { status: 502 });
}
