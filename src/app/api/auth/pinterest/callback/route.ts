import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { exchangeCodeForToken, pinterestApiFetch } from "@/lib/auth/pinterest";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // sessionId
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    const redirectUrl = new URL("/onboarding", req.nextUrl.origin);
    redirectUrl.searchParams.set("pinterest", "error");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Exchange authorization code for tokens
    const tokenData = await exchangeCodeForToken(code);

    // Get Pinterest user info
    const userInfo = await pinterestApiFetch(
      tokenData.access_token,
      "/user_account"
    );

    // Store in database
    const supabase = createServerClient();

    await supabase.from("sessions").upsert({ id: state }, { onConflict: "id" });

    await supabase.from("connected_accounts").upsert(
      {
        session_id: state,
        platform: "pinterest",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
        platform_user_id: userInfo.username || userInfo.id,
        platform_username: userInfo.username,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "session_id,platform" }
    );

    // Redirect back with success
    const redirectUrl = new URL("/onboarding", req.nextUrl.origin);
    redirectUrl.searchParams.set("pinterest", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch {
    const redirectUrl = new URL("/onboarding", req.nextUrl.origin);
    redirectUrl.searchParams.set("pinterest", "error");
    return NextResponse.redirect(redirectUrl);
  }
}
