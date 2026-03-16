import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const AMAP_KEY = process.env.AMAP_API_KEY;

/**
 * Batch geocode location strings.
 * Uses AMap for China (if AMAP_API_KEY set), Photon (Komoot) as primary free geocoder,
 * Nominatim as fallback.
 */
export async function POST(req: NextRequest) {
  const { locations, region } = await req.json();
  if (!Array.isArray(locations) || locations.length === 0) {
    return NextResponse.json({ error: "Missing locations array" }, { status: 400 });
  }

  const chinaKeywords = /china|中国|yunnan|云南|beijing|shanghai|guangzhou|shenzhen|chengdu|hangzhou|xian|guilin|lijiang|dali|kunming|lhasa|tibet|sichuan|guizhou|fujian|zhejiang|jiangsu|anhui|hubei|hunan|guangxi|hainan|nanjing|suzhou|xiamen|wuhan|重庆|成都|杭州|西安|桂林|丽江|大理|昆明/i;
  const isChina = chinaKeywords.test(region || "") || chinaKeywords.test(locations.join(" "));

  const capped = locations.slice(0, 30);
  const results: Array<{ lat: number; lng: number } | null> = [];

  for (let i = 0; i < capped.length; i++) {
    const loc = capped[i];
    if (!loc || typeof loc !== "string") {
      results.push(null);
      continue;
    }

    const simplified = simplifyForGeocode(loc);
    let found = false;

    // Strategy 1: AMap for China (if key configured)
    if (isChina && AMAP_KEY && !found) {
      try {
        const res = await fetch(
          `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(simplified)}&key=${AMAP_KEY}&output=json`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === "1" && data.geocodes?.[0]?.location) {
            const [lng, lat] = data.geocodes[0].location.split(",").map(Number);
            results.push(gcj02ToWgs84(lat, lng));
            found = true;
          }
        }
      } catch { /* fall through */ }
      if (found) { await delay(50); continue; }
    }

    // Strategy 2: Photon (Komoot) — free, no rate limit issues from servers
    const photonQueries = [
      region ? `${simplified} ${extractRegionKeywords(region)}` : simplified,
      simplified,
      loc,
    ];

    for (const query of photonQueries) {
      if (found) break;
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const data = await res.json();
          const feat = data.features?.[0];
          if (feat?.geometry?.coordinates) {
            const [lng, lat] = feat.geometry.coordinates;
            results.push({ lat, lng });
            found = true;
          }
        }
      } catch { /* try next */ }
      await delay(150);
    }

    // Strategy 3: Nominatim fallback
    if (!found) {
      try {
        const query = region ? `${simplified}, ${extractRegionKeywords(region)}` : simplified;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          {
            headers: { "User-Agent": "Derive-TravelPlanner/1.0 (travel-planning-app)" },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data[0]) {
            results.push({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            found = true;
          }
        }
      } catch { /* skip */ }
      await delay(400);
    }

    if (!found) results.push(null);
    if (i < capped.length - 1) await delay(100);
  }

  return NextResponse.json({ results });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Strip verbs/descriptions from activity titles to extract the place name */
function simplifyForGeocode(text: string): string {
  return text
    .replace(/^(arrive\s+(in|at)|drive\s+to|transfer\s+to|walk\s+to|visit|explore|check[\s-]?in\s*(at|&\s*rest\s+at)?|dinner\s+at|lunch\s+at|breakfast\s+at|morning\s+at|evening\s+at|cycling|hiking|hike\s+(at|to)|free\s+time\s*(at|or)?|local|traditional)\s*/i, "")
    .replace(/\s+(wander|exploration|experience|visit|adventure|evening|morning|cooking\s+class)\s*$/i, "")
    .trim();
}

/** Extract useful geographic keywords from itinerary title like "Yunnan Cultural & Mountain Odyssey" */
function extractRegionKeywords(title: string): string {
  // Remove generic travel words, keep place names
  return title
    .replace(/\b(cultural|mountain|odyssey|adventure|exploration|journey|experience|serenity|vistas|terraces|workshops|hiking|gorge|rice|epic|historic|blending|for\s+a\s+.*$)/gi, "")
    .replace(/[&,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- GCJ-02 → WGS-84 inverse conversion ---

const PI = Math.PI;
const A_AXIS = 6378245.0;
const EE = 0.00669342162296594323;

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let r = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  r += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  r += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return r;
}

function transformLng(x: number, y: number): number {
  let r = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  r += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  r += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return r;
}

function gcj02ToWgs84(lat: number, lng: number): { lat: number; lng: number } {
  if (outOfChina(lat, lng)) return { lat, lng };
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A_AXIS * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (A_AXIS / sqrtMagic * Math.cos(radLat) * PI);
  return { lat: lat - dLat, lng: lng - dLng };
}
