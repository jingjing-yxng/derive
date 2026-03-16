-- Migration: Social Media Account Connection
-- Run this in the Supabase Dashboard SQL Editor

-- 1. Update source_type CHECK constraint to include 'data_export'
ALTER TABLE content_sources DROP CONSTRAINT IF EXISTS content_sources_source_type_check;
ALTER TABLE content_sources ADD CONSTRAINT content_sources_source_type_check
  CHECK (source_type IN ('pinterest_url', 'rednote_url', 'uploaded_image', 'instagram_url', 'tiktok_url', 'douyin_url', 'url', 'data_export'));

-- 2. Create connected_accounts table for Pinterest OAuth
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('pinterest')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_user_id TEXT,
  platform_username TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(session_id, platform)
);
