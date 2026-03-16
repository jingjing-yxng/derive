import { NextRequest, NextResponse } from "next/server";

// Edge runtime runs on a different IP pool than Vercel serverless — less likely
// to be blocked by Instagram's anti-scraping measures.
export const runtime = "edge";
export const maxDuration = 30;

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

/** Extract structured data from Instagram's user object (API strategies) */
function extractUserData(user: any, username: string) {
  const imageUrls: string[] = [];

  // Try newer media structure first, then legacy edge format
  const items = user.edge_owner_to_timeline_media?.edges || [];
  for (const edge of items) {
    const node = edge.node || edge;
    const imgUrl = node.display_url || node.thumbnail_src || node.image_versions2?.candidates?.[0]?.url;
    if (imgUrl) imageUrls.push(imgUrl);
  }

  if (imageUrls.length === 0 && user.profile_pic_url_hd) {
    imageUrls.push(user.profile_pic_url_hd);
  }
  if (imageUrls.length === 0 && user.profile_pic_url) {
    imageUrls.push(user.profile_pic_url);
  }

  const captions: string[] = [];
  for (const edge of items.slice(0, 6)) {
    const node = edge.node || edge;
    const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || node.caption?.text;
    if (caption) captions.push(caption.substring(0, 200));
  }

  const texts: string[] = [];
  if (user.full_name) texts.push(user.full_name);
  if (user.biography) texts.push(user.biography);
  const followers = user.edge_followed_by?.count || user.follower_count;
  if (followers) texts.push(`${followers.toLocaleString()} followers`);

  return {
    imageUrls: imageUrls.slice(0, 12),
    text: texts.join("\n"),
    captions,
    category: user.category_name || user.category || null,
    isBusiness: user.is_business_account || user.is_professional_account || false,
    fullName: user.full_name || username,
    biography: user.biography || "",
    followerCount: followers || 0,
  };
}

/** Parse the Instagram embed page HTML for profile pic, post images, and captions. */
function parseEmbedHtml(html: string, username: string) {
  const imageUrls: string[] = [];

  const displayMatches = [...html.matchAll(/display_url\\":\\"(https?:[^"]+?)\\"/g)];
  for (const m of displayMatches) {
    const url = m[1].replace(/\\/g, "");
    if (!imageUrls.includes(url)) imageUrls.push(url);
  }

  const profilePicUrls: string[] = [];
  const picMatches = [...html.matchAll(/profile_pic_url\\":\\"(https?:[^"]+?)\\"/g)];
  for (const m of picMatches) {
    const url = m[1].replace(/\\/g, "");
    if (!profilePicUrls.includes(url)) profilePicUrls.push(url);
  }

  if (imageUrls.length === 0 && profilePicUrls.length > 0) {
    imageUrls.push(profilePicUrls[0]);
  }

  const captions: string[] = [];
  const captionMatches = [...html.matchAll(/caption\\":\\"([^\\]{5,}?)\\"/g)];
  for (const m of captionMatches) {
    captions.push(m[1].substring(0, 200));
  }

  if (imageUrls.length === 0) return null;

  return {
    imageUrls: imageUrls.slice(0, 12),
    text: `@${username}`,
    captions: captions.slice(0, 6),
    category: null,
    isBusiness: false,
    fullName: username,
    biography: "",
    followerCount: 0,
  };
}

/** Parse og:image and og:description from HTML */
function parseOgTags(html: string, username: string) {
  const imageUrls: string[] = [];
  const texts: string[] = [];

  const ogMatch =
    html.match(/property="og:image"\s+content="([^"]+)"/) ||
    html.match(/content="([^"]+)"\s+property="og:image"/);
  if (ogMatch) {
    let picUrl = ogMatch[1].replace(/&amp;/g, "&");
    picUrl = picUrl.replace(/dst-jpg_s\d+x\d+/, "dst-jpg_s320x320");
    imageUrls.push(picUrl);
  }

  // Also try twitter:image
  if (imageUrls.length === 0) {
    const twMatch =
      html.match(/name="twitter:image"\s+content="([^"]+)"/) ||
      html.match(/content="([^"]+)"\s+name="twitter:image"/);
    if (twMatch) {
      imageUrls.push(twMatch[1].replace(/&amp;/g, "&"));
    }
  }

  const titleMatch =
    html.match(/property="og:title"\s+content="([^"]+)"/) ||
    html.match(/content="([^"]+)"\s+property="og:title"/);
  const descMatch =
    html.match(/property="og:description"\s+content="([^"]+)"/) ||
    html.match(/content="([^"]+)"\s+property="og:description"/);
  if (titleMatch) texts.push(titleMatch[1].replace(/&#\w+;/g, ""));
  if (descMatch) texts.push(descMatch[1].replace(/&#\w+;/g, ""));

  if (imageUrls.length === 0) return null;

  return {
    imageUrls,
    text: texts.join("\n"),
    captions: [] as string[],
    category: null,
    isBusiness: false,
    fullName: username,
    biography: texts[1] || "",
    followerCount: 0,
  };
}

// --- Strategies ---

type StrategyResult = ReturnType<typeof extractUserData> | null;

/** Strategy 1: web_profile_info API with full browser-like headers */
async function tryWebProfileInfo(username: string): Promise<StrategyResult> {
  const res = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        "X-IG-App-ID": "936619743392459",
        "X-ASBD-ID": "129477",
        "X-Requested-With": "XMLHttpRequest",
        "X-IG-WWW-Claim": "0",
        "Referer": `https://www.instagram.com/${username}/`,
        "Origin": "https://www.instagram.com",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const user = json?.data?.user;
  return user ? extractUserData(user, username) : null;
}

/** Strategy 2: Mobile API */
async function tryMobileApi(username: string): Promise<StrategyResult> {
  const res = await fetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    {
      headers: {
        "User-Agent":
          "Instagram 317.0.0.34.109 Android (33/13; 420dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 562739963)",
        "X-IG-App-ID": "936619743392459",
        "X-IG-App-Locale": "en_US",
        "Accept-Language": "en-US",
        "Accept": "*/*",
      },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const user = json?.data?.user;
  return user ? extractUserData(user, username) : null;
}

/** Strategy 3: JSON endpoint (?__a=1&__d=dis) */
async function tryJsonEndpoint(username: string): Promise<StrategyResult> {
  const res = await fetch(
    `https://www.instagram.com/${encodeURIComponent(username)}/?__a=1&__d=dis`,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        "X-IG-App-ID": "936619743392459",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "*/*",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const user = json?.graphql?.user || json?.data?.user;
  return user ? extractUserData(user, username) : null;
}

/** Strategy 4: Direct embed page fetch */
async function tryEmbedDirect(username: string): Promise<StrategyResult> {
  const res = await fetch(
    `https://www.instagram.com/${encodeURIComponent(username)}/embed/`,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) return null;
  const html = await res.text();
  // Instagram serves a small login page (~5KB) to blocked IPs vs full embed (~50KB+)
  if (html.length < 20000) return null;
  return parseEmbedHtml(html, username);
}

/** Strategy 5: Embed page via public proxies */
async function tryEmbedViaProxy(username: string): Promise<StrategyResult> {
  const embedUrl = `https://www.instagram.com/${encodeURIComponent(username)}/embed/`;

  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(embedUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(embedUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(embedUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length < 20000) continue;
      const result = parseEmbedHtml(html, username);
      if (result && result.imageUrls.length > 0) return result;
    } catch {
      // try next proxy
    }
  }
  return null;
}

/** Strategy 6: Googlebot UA scrape */
async function tryGooglebotScrape(username: string): Promise<StrategyResult> {
  const res = await fetch(
    `https://www.instagram.com/${encodeURIComponent(username)}/`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.53 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) return null;
  const html = await res.text();
  return parseOgTags(html, username);
}

/** Strategy 7: Profile page OG scrape via multiple proxies */
async function tryOgViaProxy(username: string): Promise<StrategyResult> {
  const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;

  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(profileUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(profileUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(profileUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const html = await res.text();
      const result = parseOgTags(html, username);
      if (result && result.imageUrls.length > 0) return result;
    } catch {
      continue;
    }
  }
  return null;
}

/** Strategy 8: Google Web Cache — Google caches Instagram profile pages with OG tags */
async function tryGoogleCache(username: string): Promise<StrategyResult> {
  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:www.instagram.com/${encodeURIComponent(username)}/&num=1&strip=0`;
  const res = await fetch(cacheUrl, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept": "text/html",
    },
    signal: AbortSignal.timeout(10000),
    redirect: "follow",
  });
  if (!res.ok) return null;
  const html = await res.text();
  return parseOgTags(html, username);
}

/** Strategy 9: ScraperAPI — residential proxy service (optional, needs SCRAPER_API_KEY) */
async function tryScraperApi(username: string): Promise<StrategyResult> {
  const apiKey = process.env.SCRAPER_API_KEY;
  if (!apiKey) return null;

  const targetUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  const res = await fetch(
    `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=true`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) return null;
  const html = await res.text();

  // Try parsing as full page with OG tags first
  const ogResult = parseOgTags(html, username);
  if (ogResult && ogResult.imageUrls.length > 0) return ogResult;

  // Try embed parsing as fallback
  return parseEmbedHtml(html, username);
}

/** Strategy 10: Threads.net — Meta's other platform, less aggressive blocking */
async function tryThreadsProfile(username: string): Promise<StrategyResult> {
  const res = await fetch(
    `https://www.threads.net/@${encodeURIComponent(username)}`,
    {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    }
  );
  if (!res.ok) return null;
  const html = await res.text();

  const ogResult = parseOgTags(html, username);
  if (ogResult && ogResult.imageUrls.length > 0) return ogResult;

  // Threads may have profile pic in JSON data
  const picMatch = html.match(/"profile_pic_url":"(https?:[^"]+)"/);
  if (picMatch) {
    const picUrl = picMatch[1].replace(/\\/g, "");
    return {
      imageUrls: [picUrl],
      text: `@${username}`,
      captions: [],
      category: null,
      isBusiness: false,
      fullName: username,
      biography: "",
      followerCount: 0,
    };
  }

  return null;
}

/** Strategy 11: RapidAPI Instagram scraper (optional, needs RAPIDAPI_KEY) */
async function tryRapidApi(username: string): Promise<StrategyResult> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`,
    {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const data = json?.data;
  if (!data) return null;

  const imageUrls: string[] = [];
  if (data.profile_pic_url_hd) imageUrls.push(data.profile_pic_url_hd);
  else if (data.profile_pic_url) imageUrls.push(data.profile_pic_url);

  return {
    imageUrls,
    text: [data.full_name, data.biography].filter(Boolean).join("\n"),
    captions: [],
    category: data.category_name || null,
    isBusiness: data.is_business || false,
    fullName: data.full_name || username,
    biography: data.biography || "",
    followerCount: data.follower_count || 0,
  };
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const ok = (r: StrategyResult) => r && r.imageUrls.length > 0;

  // Tier 1: Fast API strategies + RapidAPI (parallel)
  const [apiResult, mobileResult, jsonResult, rapidResult] = await Promise.all([
    tryWebProfileInfo(username).catch(() => null),
    tryMobileApi(username).catch(() => null),
    tryJsonEndpoint(username).catch(() => null),
    tryRapidApi(username).catch(() => null),
  ]);

  for (const result of [rapidResult, apiResult, mobileResult, jsonResult]) {
    if (ok(result)) return NextResponse.json(result);
  }

  // Tier 2: Embed + ScraperAPI + Threads (parallel)
  const [embedDirect, scraperResult, threadsResult] = await Promise.all([
    tryEmbedDirect(username).catch(() => null),
    tryScraperApi(username).catch(() => null),
    tryThreadsProfile(username).catch(() => null),
  ]);

  for (const result of [scraperResult, embedDirect, threadsResult]) {
    if (ok(result)) return NextResponse.json(result);
  }

  // Tier 3: Proxy-based strategies + Google cache + Googlebot (parallel)
  const [embedProxy, googlebot, ogProxy, googleCache] = await Promise.all([
    tryEmbedViaProxy(username).catch(() => null),
    tryGooglebotScrape(username).catch(() => null),
    tryOgViaProxy(username).catch(() => null),
    tryGoogleCache(username).catch(() => null),
  ]);

  for (const result of [googlebot, embedProxy, ogProxy, googleCache]) {
    if (ok(result)) return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "Could not fetch Instagram profile" },
    { status: 502 }
  );
}
