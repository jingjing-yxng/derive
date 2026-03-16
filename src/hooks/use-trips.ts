"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trip } from "@/types/trip";

export interface TripWithStatus extends Trip {
  itineraries: { id: string }[];
  chat_messages: { id: string; recommendations: unknown }[];
}

export type TripStatus = "brainstorming" | "planning" | "finalized";

export function deriveTripStatus(trip: TripWithStatus): TripStatus {
  if (trip.status === "finalized") return "finalized";

  const hasRecommendations =
    trip.chat_messages &&
    trip.chat_messages.some((m) => m.recommendations != null);
  const hasItinerary = trip.itineraries && trip.itineraries.length > 0;

  if (hasItinerary || hasRecommendations) return "planning";
  return "brainstorming";
}

export function useTrips(sessionId: string) {
  const [trips, setTrips] = useState<TripWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("trips")
      .select("*, itineraries(id), chat_messages(id, recommendations, created_at)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (dbError) {
      setError(dbError.message);
    }
    if (data) setTrips(data);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const deleteTrips = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const supabase = createClient();
    await supabase.from("trips").delete().in("id", ids);
    await fetchTrips();
  }, [fetchTrips]);

  return { trips, loading, error, refetch: fetchTrips, deleteTrips };
}
