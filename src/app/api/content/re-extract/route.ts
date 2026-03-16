import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { extractInstagramContent } from "@/lib/content/instagram";
import { extractPinterestContent } from "@/lib/content/pinterest";
import { extractRedNoteContent } from "@/lib/content/rednote";
import { extractTikTokContent } from "@/lib/content/tiktok";
import { extractYouTubeContent } from "@/lib/content/youtube";
import { extractGenericContent } from "@/lib/content/generic";
import { detectPlatform } from "@/lib/content/detect-platform";

/**
 * Re-extract content for an existing source (retry failed extraction).
 */
export async function POST(req: NextRequest) {
  try {
    const { sourceId } = await req.json();
    if (!sourceId) {
      return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: source } = await supabase
      .from("content_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (!source || !source.source_url) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const url = source.source_url;
    const platform = detectPlatform(url);

    let extracted;
    if (platform === "instagram") {
      extracted = await extractInstagramContent(url);
    } else if (platform === "pinterest") {
      extracted = await extractPinterestContent(url);
    } else if (platform === "rednote") {
      extracted = await extractRedNoteContent(url);
    } else if (platform === "tiktok") {
      extracted = await extractTikTokContent(url);
    } else if (platform === "youtube") {
      extracted = await extractYouTubeContent(url);
    } else {
      extracted = await extractGenericContent(url);
    }

    if (extracted.imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Could not extract any images. The platform may be rate-limiting requests." },
        { status: 422 }
      );
    }

    // Persist images to Supabase storage (skip for Pinterest which has stable CDN URLs)
    const persistedUrls: string[] = [];
    for (let i = 0; i < extracted.imageUrls.length; i++) {
      if (platform === "pinterest") {
        persistedUrls.push(extracted.imageUrls[i]);
        continue;
      }
      try {
        const res = await fetch(extracted.imageUrls[i], {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) { persistedUrls.push(extracted.imageUrls[i]); continue; }
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const path = `sources/${sourceId}/${i}.${ext}`;
        const buffer = new Uint8Array(await res.arrayBuffer());
        if (buffer.length < 1000) { persistedUrls.push(extracted.imageUrls[i]); continue; }
        const { error } = await supabase.storage.from("content-images").upload(path, buffer, { contentType, upsert: true });
        if (error) { persistedUrls.push(extracted.imageUrls[i]); continue; }
        const { data } = supabase.storage.from("content-images").getPublicUrl(path);
        persistedUrls.push(data.publicUrl);
      } catch {
        persistedUrls.push(extracted.imageUrls[i]);
      }
    }

    await supabase
      .from("content_sources")
      .update({
        extracted_image_urls: persistedUrls,
        extracted_text: extracted.text || source.extracted_text,
        status: "done",
      })
      .eq("id", sourceId);

    return NextResponse.json({ imageUrls: persistedUrls });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
