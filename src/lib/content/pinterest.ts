import * as cheerio from "cheerio";

export interface ExtractedContent {
  imageUrls: string[];
  text: string;
}

export async function extractPinterestContent(url: string): Promise<ExtractedContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Pinterest URL timed out after 10s");
    }
    throw new Error(`Failed to reach Pinterest: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new Error(`Failed to fetch Pinterest URL: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const imageUrls: string[] = [];
  const texts: string[] = [];

  // Pin images from img tags (prefer these — they're actual pins, not covers/icons)
  $("img[src*='i.pinimg.com']").each((_, el) => {
    const src = $(el).attr("src");
    if (
      src &&
      !imageUrls.includes(src) &&
      !src.includes("75x75_RS") &&        // skip tiny profile-pic thumbnails
      !src.includes("custom_covers/") &&   // skip board covers (736x size doesn't exist)
      !src.includes("/webapp/")            // skip UI assets
    ) {
      imageUrls.push(src);
    }
  });

  // Fallback: OG image (board cover or pin image)
  if (imageUrls.length === 0) {
    $('meta[property="og:image"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content && !imageUrls.includes(content)) imageUrls.push(content);
    });
  }

  // Fallback selectors
  if (imageUrls.length === 0) {
    $('meta[name="twitter:image"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content) imageUrls.push(content);
    });
    $('link[rel="image_src"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) imageUrls.push(href);
    });
  }

  // Text content
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  if (ogTitle) texts.push(ogTitle);
  if (ogDesc) texts.push(ogDesc);

  if (imageUrls.length === 0) {
    throw new Error("No images found on this Pinterest page");
  }

  return {
    imageUrls: imageUrls.slice(0, 10),
    text: texts.join("\n"),
  };
}
