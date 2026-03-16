import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { claudeVision } from "@/lib/ai/providers";
import { generateText } from "ai";
import { PROFILE_SYSTEM_PROMPT, buildProfileUserPrompt } from "@/lib/ai/prompts/profile";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get all content sources for this session
    const { data: sources } = await supabase
      .from("content_sources")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "done");

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: "No content sources found" }, { status: 400 });
    }

    // Collect all image URLs and texts
    const imageUrls: string[] = [];
    const texts: string[] = [];

    for (const source of sources) {
      if (source.extracted_image_urls) {
        imageUrls.push(...source.extracted_image_urls);
      }
      if (source.extracted_text) {
        texts.push(source.extracted_text);
      }
    }

    // Build message content with images
    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: URL }
    > = [];

    // Add images (up to 10 to stay within limits)
    for (const url of imageUrls.slice(0, 10)) {
      try {
        userContent.push({ type: "image", image: new URL(url) });
      } catch {
        // Skip invalid URLs
      }
    }

    // Add text prompt
    userContent.push({ type: "text", text: buildProfileUserPrompt(texts) });

    const { text } = await generateText({
      model: claudeVision,
      system: PROFILE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: text },
        { status: 500 }
      );
    }

    let profile;
    try {
      profile = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Save to database
    const { error: dbError } = await supabase.from("taste_profiles").upsert(
      {
        session_id: sessionId,
        adventure: profile.adventure,
        nature: profile.nature,
        activity: profile.activity,
        luxury: profile.luxury,
        cultural: profile.cultural,
        social: profile.social,
        aesthetic_styles: profile.aesthetic_styles || [],
        cuisine_interests: profile.cuisine_interests || [],
        vibe_keywords: profile.vibe_keywords || [],
        travel_themes: profile.travel_themes || [],
        budget_tier: profile.budget_tier || "moderate",
        raw_analysis: profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (dbError) {
      return NextResponse.json(
        { error: "Failed to save profile", details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Profile generation error:", message);
    return NextResponse.json({ error: "Failed to generate profile" }, { status: 500 });
  }
}
