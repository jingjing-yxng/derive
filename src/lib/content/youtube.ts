export interface ExtractedContent {
  imageUrls: string[];
  text: string;
}

/**
 * Extract video ID from various YouTube URL formats.
 * Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
 */
function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    // youtu.be/ID
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }

    // youtube.com/watch?v=ID
    const v = parsed.searchParams.get("v");
    if (v) return v;

    // youtube.com/shorts/ID or youtube.com/embed/ID
    const segments = parsed.pathname.split("/").filter(Boolean);
    if ((segments[0] === "shorts" || segments[0] === "embed") && segments[1]) {
      return segments[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract YouTube video thumbnail and metadata.
 * Uses direct thumbnail URL construction (no API key needed)
 * with oembed fallback for metadata.
 */
export async function extractYouTubeContent(url: string): Promise<ExtractedContent> {
  const videoId = extractVideoId(url);
  const imageUrls: string[] = [];
  const texts: string[] = [];

  if (videoId) {
    // YouTube thumbnail URLs are deterministic — try maxresdefault first
    imageUrls.push(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
  }

  // Get title/author via oembed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.title) texts.push(data.title);
      if (data.author_name) texts.push(data.author_name);
      // Use oembed thumbnail if we couldn't get videoId
      if (imageUrls.length === 0 && data.thumbnail_url) {
        imageUrls.push(data.thumbnail_url);
      }
    }
  } catch {
    // oembed failed, we still have the thumbnail URL
  }

  return { imageUrls, text: texts.join("\n") };
}
