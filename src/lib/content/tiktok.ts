export interface ExtractedContent {
  imageUrls: string[];
  text: string;
}

/**
 * Extract TikTok video thumbnail via the public oembed API.
 * This works reliably because oembed doesn't require JS rendering.
 */
export async function extractTikTokContent(url: string): Promise<ExtractedContent> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

  const res = await fetch(oembedUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`TikTok oembed failed: ${res.status}`);
  }

  const data = await res.json();
  const imageUrls: string[] = [];
  const texts: string[] = [];

  if (data.thumbnail_url) {
    imageUrls.push(data.thumbnail_url);
  }

  if (data.title) texts.push(data.title);
  if (data.author_name) texts.push(`@${data.author_name}`);

  return { imageUrls, text: texts.join("\n") };
}
