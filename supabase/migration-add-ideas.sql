-- Migration: Add ideas column to itineraries table
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS ideas JSONB DEFAULT '[]';
