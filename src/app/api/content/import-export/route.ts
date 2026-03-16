import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parseInstagramExport } from "@/lib/content/data-export/instagram-export";
import { parseTikTokExport } from "@/lib/content/data-export/tiktok-export";

const MAX_ITEMS = 30;
const BATCH_SIZE = 5;

/**
 * Parse a text file with RedNote links (one per line).
 * Also extracts URLs from RedNote's share text format which includes
 * a short description followed by a link like https://www.xiaohongshu.com/... or http://xhslink.com/...
 */
function parseRedNoteLinks(buffer: Buffer): { url: string }[] {
  const text = buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: { url: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Extract URLs from the line (RedNote share text often includes extra text around the URL)
    const urlMatches = line.match(/https?:\/\/[^\s,，]+/g);
    if (!urlMatches) continue;

    for (const rawUrl of urlMatches) {
      // Only keep RedNote URLs
      if (
        rawUrl.includes("xiaohongshu.com") ||
        rawUrl.includes("xhslink.com")
      ) {
        const clean = rawUrl.replace(/[）)}\]]+$/, ""); // strip trailing brackets
        if (!seen.has(clean)) {
          seen.add(clean);
          items.push({ url: clean });
        }
      }
    }
  }

  return items;
}

async function extractUrl(
  url: string,
  sessionId: string,
  baseUrl: string
): Promise<{ id: string; imageUrls: string[]; text: string } | null> {
  try {
    const res = await fetch(`${baseUrl}/api/content/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, sessionId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string | null;
    const platform = formData.get("platform") as string | null;

    if (!file || !sessionId || !platform) {
      return NextResponse.json(
        { error: "Missing file, sessionId, or platform" },
        { status: 400 }
      );
    }

    if (!["instagram", "tiktok", "rednote"].includes(platform)) {
      return NextResponse.json(
        { error: "Unsupported platform." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    await supabase.from("sessions").upsert({ id: sessionId }, { onConflict: "id" });

    // Get existing source URLs to deduplicate
    const { data: existingSources } = await supabase
      .from("content_sources")
      .select("source_url")
      .eq("session_id", sessionId);

    const existingUrls = new Set(
      (existingSources || []).map((s) => s.source_url).filter(Boolean)
    );

    // Parse the export file
    const buffer = Buffer.from(await file.arrayBuffer());
    let parsedItems: { url: string }[];

    if (platform === "instagram") {
      parsedItems = await parseInstagramExport(buffer);
    } else if (platform === "rednote") {
      parsedItems = parseRedNoteLinks(buffer);
    } else {
      parsedItems = await parseTikTokExport(buffer);
    }

    const platformLabel = platform === "instagram" ? "Instagram" : platform === "rednote" ? "RedNote" : "TikTok";

    if (parsedItems.length === 0) {
      return NextResponse.json(
        {
          error: `No links found in the uploaded file. ${platform === "rednote" ? "Paste one RedNote link per line in a text file." : `Make sure you downloaded your ${platformLabel} data in JSON format.`}`,
        },
        { status: 422 }
      );
    }

    // Deduplicate and cap
    const newItems = parsedItems
      .filter((item) => !existingUrls.has(item.url))
      .slice(0, MAX_ITEMS);

    if (newItems.length === 0) {
      return NextResponse.json({
        imported: 0,
        message: "All items from this export have already been imported.",
      });
    }

    // Process in batches through the existing extraction pipeline
    const baseUrl = req.nextUrl.origin;
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const batch = newItems.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((item) => extractUrl(item.url, sessionId, baseUrl))
      );
      for (const result of results) {
        if (result) imported++;
        else failed++;
      }
    }

    return NextResponse.json({
      imported,
      failed,
      total: parsedItems.length,
      message: `Successfully imported ${imported} item${imported !== 1 ? "s" : ""} from your ${platformLabel} data.`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process export file" },
      { status: 500 }
    );
  }
}
