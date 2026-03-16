#!/usr/bin/env node

/**
 * Local CLI helper for Instagram profile extraction.
 *
 * Instagram blocks cloud provider IPs (Vercel, AWS, etc.) but allows
 * residential IPs. Run this locally to extract and persist Instagram
 * profile images to Supabase storage.
 *
 * Usage:
 *   node scripts/extract-instagram.mjs <username> [sessionId]
 *
 * If sessionId is omitted, uses the default dev session.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xmpyqzjvqjbnsccdztzb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_SESSION = "4452805a-7f13-46be-b85c-d0540b5e334a";

if (!SUPABASE_KEY) {
  // Try reading from .env.local
  const fs = await import("fs");
  const envFile = fs.readFileSync(".env.local", "utf8");
  const match = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (!match) {
    console.error("Set SUPABASE_SERVICE_ROLE_KEY or add it to .env.local");
    process.exit(1);
  }
  process.env.SUPABASE_SERVICE_ROLE_KEY = match[1].trim();
}

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const username = process.argv[2];
const sessionId = process.argv[3] || DEFAULT_SESSION;

if (!username) {
  console.log("Usage: node scripts/extract-instagram.mjs <username> [sessionId]");
  process.exit(1);
}

console.log(`Extracting @${username} for session ${sessionId.substring(0, 8)}...`);

// 1. Fetch from Instagram API
const res = await fetch(
  `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
  {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "X-IG-App-ID": "936619743392459",
      "X-Requested-With": "XMLHttpRequest",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
    },
  }
);

if (!res.ok) {
  console.error(`Instagram API returned ${res.status}`);
  process.exit(1);
}

const json = await res.json();
const user = json?.data?.user;
if (!user) {
  console.error("User not found");
  process.exit(1);
}

const edges = user.edge_owner_to_timeline_media?.edges || [];
console.log(`Found ${edges.length} posts, ${user.full_name} (${user.edge_followed_by?.count?.toLocaleString()} followers)`);

// 2. Find or create the content source record
let { data: source } = await supabase
  .from("content_sources")
  .select("id")
  .eq("session_id", sessionId)
  .eq("source_url", `https://www.instagram.com/${username}/`)
  .single();

if (!source) {
  const { data: newSource } = await supabase
    .from("content_sources")
    .insert({
      session_id: sessionId,
      source_type: "instagram_url",
      source_url: `https://www.instagram.com/${username}/`,
      status: "processing",
    })
    .select()
    .single();
  source = newSource;
}

console.log(`Source ID: ${source.id}`);

// 3. Download and persist images
const imageCount = Math.min(edges.length, 9);
const persistedUrls = [];

for (let i = 0; i < imageCount; i++) {
  const imgUrl = edges[i].node.display_url;
  process.stdout.write(`  Image ${i + 1}/${imageCount}...`);

  const imgRes = await fetch(imgUrl);
  if (!imgRes.ok) {
    console.log(` FAILED (${imgRes.status})`);
    continue;
  }

  const buffer = new Uint8Array(await imgRes.arrayBuffer());
  if (buffer.length < 1000) {
    console.log(" too small, skipping");
    continue;
  }

  const path = `sources/${source.id}/${i}.jpg`;
  const { error } = await supabase.storage
    .from("content-images")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (error) {
    console.log(` upload error: ${error.message}`);
    continue;
  }

  const { data } = supabase.storage.from("content-images").getPublicUrl(path);
  persistedUrls.push(data.publicUrl);
  console.log(` ${(buffer.length / 1024).toFixed(0)}KB`);
}

// 4. Build rich profile description for taste profiling
const lines = [];
lines.push(`[Instagram Profile: @${user.full_name || username}]`);
if (user.biography) lines.push(`Bio: ${user.biography}`);

const followers = user.edge_followed_by?.count;
if (followers && followers > 0) {
  const scale = followers > 1_000_000
    ? `${(followers / 1_000_000).toFixed(1)}M`
    : followers > 1_000
      ? `${(followers / 1_000).toFixed(0)}K`
      : String(followers);
  lines.push(`Followers: ${scale}`);
}

if (user.category_name) lines.push(`Category: ${user.category_name}`);
if (user.is_business_account) lines.push("Account type: Business/Creator");

// Collect captions for context
const captions = [];
for (const edge of edges.slice(0, 6)) {
  const caption = edge.node?.edge_media_to_caption?.edges?.[0]?.node?.text;
  if (caption) captions.push(caption.substring(0, 200));
}
if (captions.length > 0) {
  lines.push("Recent post captions:");
  for (const caption of captions) {
    lines.push(`- ${caption}`);
  }
}

const richText = lines.join("\n");
console.log(`\nProfile description:\n${richText}\n`);

// 5. Update the record
await supabase
  .from("content_sources")
  .update({
    extracted_image_urls: persistedUrls,
    extracted_text: richText,
    status: "done",
  })
  .eq("id", source.id);

console.log(`\nDone! Persisted ${persistedUrls.length} images for @${username}`);
