import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const messageSchema = z.object({
  tripId: z.string().regex(uuidRegex, "Invalid UUID format"),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) {
    return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
  }

  if (!uuidRegex.test(tripId)) {
    return NextResponse.json({ error: "Invalid tripId format" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at");

  if (error) {
    console.error("Chat messages load error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { tripId, role, content } = parsed.data;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("chat_messages")
    .insert({ trip_id: tripId, role, content });

  if (error) {
    console.error("Chat message insert error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
