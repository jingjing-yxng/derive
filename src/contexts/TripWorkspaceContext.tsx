"use client";

import { createContext, useContext } from "react";
import type { Itinerary, Activity, DayPlan } from "@/types/trip";

export interface SelectedActivity {
  dayIndex: number;
  actIndex: number;
  activity: Activity;
}

export interface TripWorkspaceContextValue {
  sendChatMessage: (text: string) => void;
  itinerary: Itinerary | null;
  updateItinerary: (days: DayPlan[]) => void;
  updateIdeas: (ideas: Activity[]) => void;
  selectedActivity: SelectedActivity | null;
  setSelectedActivity: (sel: SelectedActivity | null) => void;
}

export const TripWorkspaceContext = createContext<TripWorkspaceContextValue>({
  sendChatMessage: () => {},
  itinerary: null,
  updateItinerary: () => {},
  updateIdeas: () => {},
  selectedActivity: null,
  setSelectedActivity: () => {},
});

export function useTripWorkspace() {
  return useContext(TripWorkspaceContext);
}
