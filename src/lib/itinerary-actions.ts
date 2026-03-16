import type { Itinerary, ItineraryAction, Activity, DayPlan } from "@/types/trip";

/** Generate a short day title from the activities in that day */
function generateDayTitle(day: DayPlan, dayIndex: number, totalDays: number): string {
  const activities = day.activities;
  if (activities.length === 0) return `Day ${day.day}`;

  // Collect unique location-ish names from titles and locations
  const locations = new Set<string>();
  let hasTransport = false;
  let hasDeparture = false;
  let hasArrival = false;

  for (const a of activities) {
    if (a.category === "transport") {
      hasTransport = true;
      const titleLower = (a.title || "").toLowerCase();
      if (/\b(depart|leave|fly out|fly from|head home|return)\b/.test(titleLower)) hasDeparture = true;
      if (/\b(arriv|land|reach|get to)\b/.test(titleLower)) hasArrival = true;
    }
    // Extract location from activity's location field or title
    const loc = a.location?.split(",")[0]?.trim();
    if (loc && loc.length > 1 && loc.length < 40) locations.add(loc);
  }

  const locArr = [...locations];

  // First day
  if (dayIndex === 0 && hasArrival && locArr.length > 0) {
    return `Arrival in ${locArr[0]}`;
  }
  // Last day
  if (dayIndex === totalDays - 1 && hasDeparture && locArr.length > 0) {
    return `Departure from ${locArr[0]}`;
  }
  // Travel day between cities
  if (hasTransport && locArr.length >= 2) {
    return `${locArr[0]} to ${locArr[1]}`;
  }
  // Regular day — use main location
  if (locArr.length > 0) {
    const mainLoc = locArr[0];
    const themes: string[] = [];
    const catStrings = new Set(activities.map((a) => a.category as string));
    if (catStrings.has("food") || catStrings.has("restaurant")) themes.push("& Cuisine");
    if (catStrings.has("culture") || catStrings.has("temple") || catStrings.has("museum")) themes.push("& Culture");
    if (catStrings.has("nature") || catStrings.has("hiking") || catStrings.has("outdoor")) themes.push("& Nature");
    return themes.length > 0 ? `Exploring ${mainLoc} ${themes[0]}` : `Exploring ${mainLoc}`;
  }

  return day.title || `Day ${day.day}`;
}

export function applyActions(itinerary: Itinerary, actions: ItineraryAction[]): Itinerary {
  const result = {
    ...itinerary,
    days: itinerary.days.map((d) => ({
      ...d,
      activities: [...d.activities],
    })),
    ideas: [...(itinerary.ideas || [])],
  };

  for (const action of actions) {
    const dayIdx = action.type === "move" ? action.fromDay - 1 : action.day - 1;

    switch (action.type) {
      case "add": {
        const targetDay = result.days[action.day - 1];
        if (!targetDay) break;
        const newActivity: Activity = {
          ...action.activity,
          id: crypto.randomUUID(),
        };
        const pos = action.position != null ? action.position : targetDay.activities.length;
        targetDay.activities.splice(pos, 0, newActivity);
        break;
      }
      case "remove": {
        const targetDay = result.days[dayIdx];
        if (!targetDay) break;
        targetDay.activities = targetDay.activities.filter((a) => a.id !== action.activityId);
        break;
      }
      case "swap": {
        const targetDay = result.days[dayIdx];
        if (!targetDay) break;
        const idx = targetDay.activities.findIndex((a) => a.id === action.activityId);
        if (idx !== -1) {
          targetDay.activities[idx] = {
            ...action.newActivity,
            id: crypto.randomUUID(),
          };
        }
        break;
      }
      case "move": {
        const fromDay = result.days[action.fromDay - 1];
        const toDay = result.days[action.toDay - 1];
        if (!fromDay || !toDay) break;
        const idx = fromDay.activities.findIndex((a) => a.id === action.activityId);
        if (idx !== -1) {
          const [moved] = fromDay.activities.splice(idx, 1);
          const pos = action.position != null ? action.position : toDay.activities.length;
          toDay.activities.splice(pos, 0, moved);
        }
        break;
      }
    }
  }

  // Regenerate day titles based on updated activities
  for (let i = 0; i < result.days.length; i++) {
    result.days[i] = {
      ...result.days[i],
      title: generateDayTitle(result.days[i], i, result.days.length),
    };
  }

  return result;
}

export { generateDayTitle };
