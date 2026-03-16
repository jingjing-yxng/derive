import * as cheerio from "cheerio";

export interface ExtractedContent {
  imageUrls: string[];
  text: string;
}

export async function extractRedNoteContent(url: string): Promise<ExtractedContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("RedNote URL timed out after 10s");
    }
    throw new Error(`Failed to reach RedNote: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new Error(`Failed to fetch RedNote URL: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const imageUrls: string[] = [];
  const texts: string[] = [];

  // OG images — RedNote uses name="og:image" instead of the standard property="og:image"
  $('meta[property="og:image"], meta[name="og:image"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content && !imageUrls.includes(content)) imageUrls.push(content);
  });

  // RedNote specific image patterns
  $("img[src*='xhscdn.com'], img[src*='xiaohongshu']").each((_, el) => {
    const src = $(el).attr("src");
    if (src && !imageUrls.includes(src)) imageUrls.push(src);
  });

  // Fallback selectors
  if (imageUrls.length === 0) {
    $('meta[name="twitter:image"], meta[property="twitter:image"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content) imageUrls.push(content);
    });
    $('link[rel="image_src"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) imageUrls.push(href);
    });
  }

  // Text content — also check both name= and property=
  const ogTitle =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="og:title"]').attr("content");
  const ogDesc =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="og:description"]').attr("content");
  const title = $("title").text();
  if (ogTitle) texts.push(ogTitle);
  if (ogDesc) texts.push(ogDesc);
  if (title && title !== ogTitle) texts.push(title);

  return {
    imageUrls: imageUrls.slice(0, 10).map((u) => u.replace(/^http:\/\//, "https://")),
    text: texts.join("\n"),
  };
}
