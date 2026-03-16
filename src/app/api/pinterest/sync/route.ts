import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getValidToken,
  fetchPinterestBoards,
  fetchBoardPins,
  extractPinImageUrl,
} from "@/lib/auth/pinterest";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const accessToken = await getValidToken(sessionId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Pinterest not connected or token expired" },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Fetch boards
    const boards = await fetchPinterestBoards(accessToken);

    let totalPins = 0;

    for (const board of boards) {
      if (board.pin_count === 0) continue;

      // Fetch pins for each board
      const pins = await fetchBoardPins(accessToken, board.id, 20);

      // Extract image URLs and text from pins
      const imageUrls: string[] = [];
      const textParts: string[] = [`Board: ${board.name}`];

      for (const pin of pins) {
        const imgUrl = extractPinImageUrl(pin);
        if (imgUrl) imageUrls.push(imgUrl);
        if (pin.title) textParts.push(pin.title);
        if (pin.description) textParts.push(pin.description);
      }

      if (imageUrls.length === 0) continue;

      // Create a content_source for this board
      await supabase.from("content_sources").insert({
        session_id: sessionId,
        source_type: "pinterest_url",
        source_url: `https://www.pinterest.com/boards/${board.id}/`,
        extracted_image_urls: imageUrls.slice(0, 20),
        extracted_text: textParts.join("\n"),
        status: "done",
      });

      totalPins += imageUrls.length;
    }

    // Update last_synced_at
    await supabase
      .from("connected_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("platform", "pinterest");

    return NextResponse.json({
      boards: boards.length,
      pins: totalPins,
      message: `Imported ${totalPins} pins from ${boards.length} boards`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to sync Pinterest boards" },
      { status: 500 }
    );
  }
}
