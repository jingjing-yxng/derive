import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { extractPinterestContent } from "@/lib/content/pinterest";
import { extractRedNoteContent } from "@/lib/content/rednote";
import { extractInstagramContent } from "@/lib/content/instagram";
import { extractTikTokContent } from "@/lib/content/tiktok";
import { extractYouTubeContent } from "@/lib/content/youtube";
import { extractGenericContent } from "@/lib/content/generic";

function detectSourceType(url: string): string {
  if (url.includes("pinterest.com") || url.includes("pin.it")) return "pinterest_url";
  if (url.includes("xiaohongshu.com") || url.includes("xhslink.com")) return "rednote_url";
  if (url.includes("instagram.com") || url.includes("instagr.am")) return "instagram_url";
  if (url.includes("tiktok.com") || url.includes("vm.tiktok.com")) return "tiktok_url";
  if (url.includes("douyin.com")) return "douyin_url";
  return "url";
}

/**
 * Upgrade Pinterest thumbnail URLs to high resolution.
 * Pinterest CDN pattern: /200x150/ or /75x75_RS/ or /236x/ → /736x/
 */
function upgradePinterestUrls(urls: string[]): string[] {
  return urls.map((u) => {
    // custom_covers don't support 736x — leave them as-is
    if (u.includes("custom_covers/")) return u;
    return u.replace(/\/(?:200x150|75x75_RS|136x136|150x150|170x|236x|474x)\//, "/736x/");
  });
}

/**
 * Download an image from a URL and upload it to Supabase storage.
 * Returns the public Supabase URL, or null on failure.
 */
async function persistImage(
  supabase: ReturnType<typeof createServerClient>,
  imageUrl: string,
  sourceId: string,
  index: number
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !res.body) return null;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `sources/${sourceId}/${index}.${ext}`;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    if (buffer.length < 1000) return null; // skip empty/tiny responses

    const { error } = await supabase.storage
      .from("content-images")
      .upload(path, buffer, { contentType, upsert: true });

    if (error) return null;

    const { data } = supabase.storage.from("content-images").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

/**
 * Download extracted images and persist them to Supabase storage.
 * Falls back to original URLs for any that fail to download.
 */
async function persistImages(
  supabase: ReturnType<typeof createServerClient>,
  imageUrls: string[],
  sourceId: string,
  sourceType: string
): Promise<string[]> {
  // Skip persistence for platforms with stable CDN URLs (Pinterest uses permanent URLs)
  if (sourceType === "pinterest_url") return imageUrls;
  // Instagram profile fallback has no images
  if (imageUrls.length === 0) return imageUrls;

  const results = await Promise.all(
    imageUrls.map((url, i) => persistImage(supabase, url, sourceId, i))
  );

  return results.map((persisted, i) => persisted || imageUrls[i]);
}

export async function POST(req: NextRequest) {
  try {
    const { url, sessionId } = await req.json();
    if (!url || !sessionId) {
      return NextResponse.json({ error: "Missing url or sessionId" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Please enter a valid URL" }, { status: 400 });
    }

    const supabase = createServerClient();

    await supabase.from("sessions").upsert({ id: sessionId }, { onConflict: "id" });

    const sourceType = detectSourceType(url);

    const { data: source, error: insertError } = await supabase
      .from("content_sources")
      .insert({
        session_id: sessionId,
        source_type: sourceType,
        source_url: url,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to save content source" }, { status: 500 });
    }

    try {
      let extracted;
      if (sourceType === "pinterest_url") {
        extracted = await extractPinterestContent(url);
        extracted.imageUrls = upgradePinterestUrls(extracted.imageUrls);
      } else if (sourceType === "rednote_url") {
        extracted = await extractRedNoteContent(url);
      } else if (sourceType === "instagram_url") {
        extracted = await extractInstagramContent(url);
      } else if (sourceType === "tiktok_url") {
        extracted = await extractTikTokContent(url);
      } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
        extracted = await extractYouTubeContent(url);
      } else {
        extracted = await extractGenericContent(url);
      }

      // If extraction returned no images, delete the source (except IG profiles which have retry)
      if (extracted.imageUrls.length === 0 && sourceType !== "instagram_url") {
        await supabase.from("content_sources").delete().eq("id", source.id);
        return NextResponse.json(
          { error: "Could not extract any images from this link" },
          { status: 422 }
        );
      }

      // Persist images to Supabase storage (for platforms with expiring CDN URLs)
      const persistedUrls = await persistImages(
        supabase,
        extracted.imageUrls,
        source.id,
        sourceType
      );

      await supabase
        .from("content_sources")
        .update({
          extracted_image_urls: persistedUrls,
          extracted_text: extracted.text,
          status: "done",
        })
        .eq("id", source.id);

      return NextResponse.json({
        id: source.id,
        imageUrls: persistedUrls,
        text: extracted.text,
      });
    } catch (extractError) {
      await supabase.from("content_sources").delete().eq("id", source.id);
      const message = extractError instanceof Error ? extractError.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to extract content: ${message}` },
        { status: 422 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
