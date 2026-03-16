import { NextRequest } from "next/server";
import { generateText } from "ai";
import { routeProvider } from "@/lib/ai/router";
import { createServerClient } from "@/lib/supabase/server";
import type { TasteProfile } from "@/types/profile";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  const destination = req.nextUrl.searchParams.get("destination");
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const regionsParam = req.nextUrl.searchParams.get("regions");

  if (!name || !destination) {
    return Response.json({ error: "Missing name or destination" }, { status: 400 });
  }

  try {
    // Route to DeepSeek for Greater China, Claude otherwise
    const regions = regionsParam ? regionsParam.split(",").map((r) => r.trim()) : [destination];
    const { model } = routeProvider(regions);

    let profileContext = "";
    if (sessionId) {
      const supabase = createServerClient();
      const { data: profile } = await supabase
        .from("taste_profiles")
        .select("*")
        .eq("session_id", sessionId)
        .single();
      if (profile) {
        const p = profile as TasteProfile;
        profileContext = `
The traveler's taste profile:
- Adventure: ${p.adventure}/10, Nature: ${p.nature}/10, Cultural: ${p.cultural}/10, Luxury: ${p.luxury}/10
- Aesthetic styles: ${p.aesthetic_styles.join(", ")}
- Cuisine interests: ${p.cuisine_interests.join(", ")}
- Vibe keywords: ${p.vibe_keywords.join(", ")}
- Travel themes: ${p.travel_themes.join(", ")}
- Budget: ${p.budget_tier}

For the "why" field, explain specifically which aspects of THIS traveler's profile align with this attraction.`;
      }
    }

    const aiResult = await generateText({
      model,
      system: "You are a concise travel expert with deep local knowledge. Respond ONLY with valid JSON, no markdown.",
      prompt: `For the attraction "${name}" in/near ${destination}, return JSON:
{
  "summary": "2-3 sentences on what makes this place special and worth visiting.",
  "why": "1-2 sentences on why this specifically matches the traveler's preferences.",
  "image_queries": ["aesthetic photo query 1", "aesthetic photo query 2", "aesthetic photo query 3"],
  "sources": [
    {"title": "source name", "url": "real URL to a travel article or official site about this place"}
  ]
}
${profileContext}
IMPORTANT for image_queries: Return 3 short, specific search queries that would find BEAUTIFUL, aesthetic travel photography of this place. Think Pinterest-style queries — focus on the most photogenic, iconic views. Examples: "Kashgar old city golden hour", "Karakul lake mountain reflection", "silk road architecture Xinjiang". Use proper nouns.
Return exactly 2-3 sources from well-known travel sites. Keep summary under 60 words.`,
    });

    let parsed;
    try {
      const cleaned = aiResult.text.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { summary: "", why: "", sources: [], image_queries: [] };
    }

    const queries: string[] = parsed.image_queries || [];
    queries.push(`${name} ${destination}`, destination);

    const images = await fetchImages(queries);

    return Response.json({
      name,
      destination,
      summary: parsed.summary || "",
      why: parsed.why || "",
      sources: (parsed.sources || []).slice(0, 3),
      images,
    });
  } catch (err) {
    console.error("Attraction API error:", err);
    return Response.json({ error: "Failed to fetch attraction info" }, { status: 500 });
  }
}

async function fetchImages(queries: string[]): Promise<string[]> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    return fetchPexelsImages(queries, pexelsKey);
  }
  // Try Unsplash (free, no key needed for source URLs), fallback to Wikimedia
  const images = await fetchUnsplashImages(queries);
  if (images.length > 0) return images;
  return fetchCommonsMulti(queries);
}

// ── Pexels (aesthetic, curated travel photos) ──

async function fetchPexelsImages(queries: string[], apiKey: string): Promise<string[]> {
  const allImages: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (allImages.length >= 3) break;
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
      const res = await fetch(url, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const photo of data.photos || []) {
        if (allImages.length >= 3) break;
        const imgUrl = photo.src?.large || photo.src?.medium;
        if (imgUrl && !seen.has(imgUrl)) {
          seen.add(imgUrl);
          allImages.push(imgUrl);
        }
      }
    } catch {
      // continue to next query
    }
  }

  return allImages;
}

// ── Unsplash Source (free, no API key) ──

async function fetchUnsplashImages(queries: string[]): Promise<string[]> {
  const allImages: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (allImages.length >= 3) break;
    try {
      // Unsplash Source API returns a redirect to an actual image
      const url = `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const finalUrl = res.url;
      // Unsplash returns a placeholder if no results — skip duplicates
      if (finalUrl && !seen.has(finalUrl) && !finalUrl.includes("source-404")) {
        seen.add(finalUrl);
        allImages.push(finalUrl);
      }
    } catch {
      // continue to next query
    }
  }

  return allImages;
}

// ── Wikimedia Commons fallback ──

const BLOCKED = /\.svg|icon|logo|map|flag|symbol|seal|coat|commons-logo|wiki|portrait|headshot|actor|actress|celebrity|person|mugshot|award|premiere|signature/i;
const IMAGE_EXT = /\.(jpg|jpeg|png|webp)/i;

async function fetchCommonsMulti(queries: string[]): Promise<string[]> {
  const allImages: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (allImages.length >= 3) break;
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json&origin=*`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (!data.query?.pages) continue;

      for (const page of Object.values(data.query.pages) as any[]) {
        if (allImages.length >= 3) break;
        const info = page.imageinfo?.[0];
        if (!info?.thumburl) continue;
        const title = (page.title || "").toLowerCase();
        if (BLOCKED.test(title)) continue;
        // Only accept actual image files
        const mime = info.mime || "";
        if (!mime.startsWith("image/") || mime.includes("svg")) continue;
        if (!IMAGE_EXT.test(info.thumburl)) continue;
        if (!seen.has(info.thumburl)) {
          seen.add(info.thumburl);
          allImages.push(info.thumburl);
        }
      }
    } catch {
      // continue
    }
  }

  return allImages;
}
