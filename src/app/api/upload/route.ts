import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!file || !sessionId) {
      return NextResponse.json({ error: "Missing file or sessionId" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Ensure session exists
    await supabase.from("sessions").upsert({ id: sessionId }, { onConflict: "id" });

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "png";
    const storagePath = `${sessionId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("content-images")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("content-images")
      .getPublicUrl(storagePath);

    // Save content source record
    const { data: source } = await supabase
      .from("content_sources")
      .insert({
        session_id: sessionId,
        source_type: "uploaded_image",
        storage_path: storagePath,
        extracted_image_urls: [publicUrl],
        status: "done",
      })
      .select()
      .single();

    return NextResponse.json({ id: source?.id, publicUrl, storagePath });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
