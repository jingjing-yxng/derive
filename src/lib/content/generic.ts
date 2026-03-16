import * as cheerio from "cheerio";

export interface ExtractedContent {
  imageUrls: string[];
  text: string;
}

export async function extractGenericContent(url: string): Promise<ExtractedContent> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const imageUrls: string[] = [];
  const texts: string[] = [];

  // OG images (works across most platforms)
  $('meta[property="og:image"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content) imageUrls.push(content);
  });

  // Twitter card images
  $('meta[name="twitter:image"], meta[property="twitter:image"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content && !imageUrls.includes(content)) imageUrls.push(content);
  });

  // Text content from OG tags
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const metaDesc = $('meta[name="description"]').attr("content");
  const title = $("title").text();

  if (ogTitle) texts.push(ogTitle);
  if (ogDesc) texts.push(ogDesc);
  if (!ogDesc && metaDesc) texts.push(metaDesc);
  if (title && title !== ogTitle) texts.push(title);

  return {
    imageUrls: imageUrls.slice(0, 10),
    text: texts.join("\n"),
  };
}
