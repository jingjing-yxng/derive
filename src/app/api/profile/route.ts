import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("taste_profiles")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { sessionId, ...updates } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("taste_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
