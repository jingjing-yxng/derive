import { NextRequest, NextResponse } from "next/server";
import { buildPinterestAuthUrl } from "@/lib/auth/pinterest";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const authUrl = buildPinterestAuthUrl(sessionId);

  if (!authUrl) {
    return NextResponse.json(
      { error: "Pinterest integration is not configured" },
      { status: 503 }
    );
  }

  return NextResponse.redirect(authUrl);
}
