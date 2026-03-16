import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { itineraryCreateSchema, itineraryUpdateSchema } from "@/lib/validation";

/** Try an insert/update and retry without `ideas` if the column doesn't exist yet. */
async function withIdeasFallback(
  primary: () => PromiseLike<{ data: any; error: any }>,
  fallback: () => PromiseLike<{ data: any; error: any }>
): Promise<{ data: any; error: any }> {
  const result = await primary();
  if (result.error) {
    const msg = result.error.message || "";
    const code = result.error.code || "";
    // PostgREST PGRST204 or Postgres 42703 — column doesn't exist
    if (code === "42703" || code === "PGRST204" || msg.includes("ideas") && msg.includes("column")) {
      return fallback();
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = itineraryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { tripId, sessionId, title, summary, days, ideas } = parsed.data;

  const supabase = createServerClient();
  const { data, error } = await withIdeasFallback(
    () =>
      supabase
        .from("itineraries")
        .insert({ trip_id: tripId, session_id: sessionId, title, summary, days, ideas: ideas || [] })
        .select()
        .single(),
    () =>
      supabase
        .from("itineraries")
        .insert({ trip_id: tripId, session_id: sessionId, title, summary, days })
        .select()
        .single()
  );

  if (error) {
    console.error("Itinerary POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const id = req.nextUrl.searchParams.get("id");

  const supabase = createServerClient();

  if (id) {
    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  if (sessionId) {
    const { data, error } = await supabase
      .from("itineraries")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json(data || []);
  }

  return NextResponse.json({ error: "Missing sessionId or id" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const parsed = itineraryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { id, title, summary, days, ideas } = parsed.data;

  const supabase = createServerClient();

  const baseUpdates: Record<string, unknown> = { days, updated_at: new Date().toISOString() };
  if (title !== undefined) baseUpdates.title = title;
  if (summary !== undefined) baseUpdates.summary = summary;

  const { data, error } = await withIdeasFallback(
    () => {
      const updates = { ...baseUpdates };
      if (ideas !== undefined) updates.ideas = ideas;
      return supabase.from("itineraries").update(updates).eq("id", id).select().single();
    },
    () =>
      supabase.from("itineraries").update(baseUpdates).eq("id", id).select().single()
  );

  if (error) {
    console.error("Itinerary PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
