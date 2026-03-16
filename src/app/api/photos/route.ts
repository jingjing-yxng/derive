import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return Response.json({ images: [] });
  }

  const images = await fetchImages([query, `${query} travel photography`]);
  return Response.json({ images });
}

async function fetchImages(queries: string[]): Promise<string[]> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    return fetchPexelsImages(queries, pexelsKey);
  }
  const images = await fetchCommonsImages(queries);
  return images;
}

async function fetchPexelsImages(queries: string[], apiKey: string): Promise<string[]> {
  const allImages: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (allImages.length >= 2) break;
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
      const res = await fetch(url, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const photo of data.photos || []) {
        if (allImages.length >= 2) break;
        const imgUrl = photo.src?.large || photo.src?.medium;
        if (imgUrl && !seen.has(imgUrl)) {
          seen.add(imgUrl);
          allImages.push(imgUrl);
        }
      }
    } catch {
      // continue
    }
  }
  return allImages;
}

const BLOCKED = /\.svg|icon|logo|map|flag|symbol|seal|coat|commons-logo|wiki|portrait|headshot|signature/i;
const IMAGE_EXT = /\.(jpg|jpeg|png|webp)/i;

async function fetchCommonsImages(queries: string[]): Promise<string[]> {
  const allImages: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    if (allImages.length >= 2) break;
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime&iiurlwidth=600&format=json&origin=*`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (!data.query?.pages) continue;

      for (const page of Object.values(data.query.pages) as any[]) {
        if (allImages.length >= 2) break;
        const info = page.imageinfo?.[0];
        if (!info?.thumburl) continue;
        const title = (page.title || "").toLowerCase();
        if (BLOCKED.test(title)) continue;
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
