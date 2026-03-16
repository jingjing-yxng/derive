export function buildItineraryFromBookmarks(
  tripDetails: {
    destination: string;
    startDate: string;
    endDate: string;
    travelParty?: string;
  },
  bookmarkedNames: string[]
): string {
  const bookmarkList = bookmarkedNames.length > 0
    ? ` I've bookmarked: ${bookmarkedNames.join(", ")} — weave these into the schedule.`
    : "";

  return `Build my day-by-day itinerary for ${tripDetails.destination}, ${tripDetails.startDate} to ${tripDetails.endDate}.${tripDetails.travelParty ? ` Traveling as: ${tripDetails.travelParty}.` : ""}${bookmarkList}`;
}

export function buildItineraryPrompt(
  destination: string,
  startDate: string,
  endDate: string,
  travelParty?: string
): string {
  return `Build my day-by-day itinerary for ${destination}, ${startDate} to ${endDate}.${travelParty ? ` Traveling as: ${travelParty}.` : ""}`;
}
