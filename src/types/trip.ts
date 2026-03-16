export interface Trip {
  id?: string;
  session_id: string;
  title?: string;
  start_date: string;
  end_date: string;
  regions: string[];
  trip_description?: string;
  travel_party?: string;
  ai_provider?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Recommendation {
  name: string;
  description: string;
  vibe_match: number;
  highlights: string[];
  best_for: string;
  estimated_budget: string;
  image_keyword?: string;
}

export interface DayPlan {
  day: number;
  date?: string;
  title: string;
  overnight?: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location?: string;
  lat?: number;
  lng?: number;
  tips?: string;
  tickets?: string;
  transport?: string;
  notes?: string;
  estimated_budget?: string;
  category: "food" | "activity" | "transport" | "accommodation" | "free-time";
}

export interface Itinerary {
  id?: string;
  trip_id: string;
  session_id: string;
  title: string;
  summary?: string;
  days: DayPlan[];
  ideas: Activity[];
  share_token?: string;
}

export interface ChatMessage {
  id?: string;
  trip_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  recommendations?: Recommendation[];
  itinerary?: Itinerary;
}

// Itinerary action types for AI-driven modifications
export type ItineraryAction =
  | { type: "add"; day: number; activity: Omit<Activity, "id">; position?: number }
  | { type: "remove"; day: number; activityId: string }
  | { type: "swap"; day: number; activityId: string; newActivity: Omit<Activity, "id"> }
  | { type: "move"; fromDay: number; activityId: string; toDay: number; position?: number };

/** Deduplicate activities by title+time within a day */
function dedupeActivities(activities: Activity[]): Activity[] {
  const seen = new Set<string>();
  return activities.filter((a) => {
    const key = `${a.title}::${a.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Ensure every activity has a unique id, dedupe, and ideas defaults to [] */
export function normalizeItinerary(itinerary: Itinerary): Itinerary {
  return {
    ...itinerary,
    ideas: (itinerary.ideas || []).map((a) => ({
      ...a,
      id: a.id || crypto.randomUUID(),
    })),
    days: itinerary.days.map((day) => ({
      ...day,
      activities: dedupeActivities(
        day.activities
          .filter((a) => a.title || a.description || a.time)
          .map((a) => ({
            ...a,
            id: a.id || crypto.randomUUID(),
            title: a.title || a.description || "Untitled activity",
          }))
      ),
    })),
  };
}
