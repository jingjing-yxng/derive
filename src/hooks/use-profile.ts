"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TasteProfile } from "@/types/profile";

export function useProfile(sessionId: string) {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("taste_profiles")
      .select("*")
      .eq("session_id", sessionId)
      .single();
    if (dbError && dbError.code !== "PGRST116") {
      setError(dbError.message);
    }
    setProfile(data);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<TasteProfile>) => {
    if (!sessionId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("taste_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .select()
      .single();
    if (data) setProfile(data);
    return data;
  };

  return { profile, loading, error, fetchProfile, updateProfile };
}
