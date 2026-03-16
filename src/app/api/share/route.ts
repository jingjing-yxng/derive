import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/**
 * POST /api/share — Generate (or fetch existing) share token for an itinerary.
 * Returns { shareToken, shareUrl }.
 */
export async function POST(req: NextRequest) {
  try {
    const { itineraryId } = await req.json();
    if (!itineraryId) {
      return NextResponse.json({ error: "Missing itineraryId" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if itinerary exists and already has a share token
    const { data: itinerary, error: fetchError } = await supabase
      .from("itineraries")
      .select("id, share_token, trip_id")
      .eq("id", itineraryId)
      .single();

    if (fetchError || !itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }

    // If already shared, return existing token
    if (itinerary.share_token) {
      const host = req.headers.get("host") || "derive-app.vercel.app";
      const protocol = host.includes("localhost") ? "http" : "https";
      return NextResponse.json({
        shareToken: itinerary.share_token,
        shareUrl: `${protocol}://${host}/share/${itinerary.share_token}`,
      });
    }

    // Generate a short, URL-friendly token
    const shareToken = randomBytes(8).toString("base64url");

    const { error: updateError } = await supabase
      .from("itineraries")
      .update({ share_token: shareToken })
      .eq("id", itineraryId);

    if (updateError) {
      console.error("Share token update error:", updateError);
      return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }

    const host = req.headers.get("host") || "derive-app.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";

    return NextResponse.json({
      shareToken,
      shareUrl: `${protocol}://${host}/share/${shareToken}`,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/share?token=xxx — Fetch shared itinerary data (public, no auth).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Try with page_blocks, fall back without if column doesn't exist yet
  let itinerary: any = null;
  let fetchError: any = null;

  const res1 = await supabase
    .from("itineraries")
    .select("id, title, summary, days, trip_id, page_blocks")
    .eq("share_token", token)
    .single();

  if (res1.error && (res1.error.code === "42703" || res1.error.code === "PGRST204" || (res1.error.message || "").includes("page_blocks"))) {
    const res2 = await supabase
      .from("itineraries")
      .select("id, title, summary, days, trip_id")
      .eq("share_token", token)
      .single();
    itinerary = res2.data;
    fetchError = res2.error;
  } else {
    itinerary = res1.data;
    fetchError = res1.error;
  }

  if (fetchError || !itinerary) {
    return NextResponse.json({ error: "Shared itinerary not found" }, { status: 404 });
  }

  // Fetch trip metadata (destination, dates, party)
  const { data: trip } = await supabase
    .from("trips")
    .select("regions, start_date, end_date, travel_party")
    .eq("id", itinerary.trip_id)
    .single();

  return NextResponse.json({
    itinerary: {
      id: itinerary.id,
      title: itinerary.title,
      summary: itinerary.summary,
      days: itinerary.days,
      pageBlocks: itinerary.page_blocks || [],
    },
    trip: trip
      ? {
          regions: trip.regions,
          startDate: trip.start_date,
          endDate: trip.end_date,
          travelParty: trip.travel_party,
        }
      : null,
  });
}

/**
 * PATCH /api/share — Save edits to a shared itinerary (identified by token).
 */
export async function PATCH(req: NextRequest) {
  try {
    const { token, days, title, summary, page_blocks } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = createServerClient();

    const update: Record<string, unknown> = {};
    if (days !== undefined) update.days = days;
    if (title !== undefined) update.title = title;
    if (summary !== undefined) update.summary = summary;
    if (page_blocks !== undefined) update.page_blocks = page_blocks;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    let updateError: any = null;
    const res = await supabase.from("itineraries").update(update).eq("share_token", token);
    if (res.error && update.page_blocks !== undefined) {
      const msg = res.error.message || "";
      const code = res.error.code || "";
      if (code === "42703" || code === "PGRST204" || msg.includes("page_blocks")) {
        // Column doesn't exist yet — retry without page_blocks
        const { page_blocks: _, ...rest } = update;
        if (Object.keys(rest).length > 0) {
          const res2 = await supabase.from("itineraries").update(rest).eq("share_token", token);
          updateError = res2.error;
        }
      } else {
        updateError = res.error;
      }
    } else {
      updateError = res.error;
    }

    if (updateError) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
