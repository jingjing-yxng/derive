import type { Recommendation, Activity, ItineraryAction } from "@/types/trip";

export interface ParsedAIResponse {
  text: string;
  recommendations: Recommendation[];
  actions: ItineraryAction[];
  suggestions: Omit<Activity, "id">[];
  hasItinerary: boolean;
  itineraryData: { title: string; summary?: string; days: any[] } | null;
  browseMode: boolean;
  itineraryMode: boolean;
}

export function extractJsonBlocks(content: string): { text: string; recommendations: Recommendation[] } {
  const result = parseAIResponse(content);
  return { text: result.text, recommendations: result.recommendations };
}

export function parseAIResponse(content: string): ParsedAIResponse {
  const jsonRegex = /```json\s*([\s\S]*?)```/g;
  let text = content;
  let recommendations: Recommendation[] = [];
  let actions: ItineraryAction[] = [];
  let suggestions: Omit<Activity, "id">[] = [];
  let hasItinerary = false;
  let itineraryData: { title: string; summary?: string; days: any[] } | null = null;
  let browseMode = false;
  let itineraryMode = false;

  let match;
  while ((match = jsonRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);

      if (parsed.recommendations) {
        recommendations = [...recommendations, ...parsed.recommendations];
      }
      if (parsed.itinerary) {
        hasItinerary = true;
        if (parsed.itinerary.days && Array.isArray(parsed.itinerary.days)) {
          itineraryData = parsed.itinerary;
        }
      }
      if (parsed.actions && Array.isArray(parsed.actions)) {
        actions = parsed.actions;
      }
      if (parsed.mode === "browse") {
        browseMode = true;
      }
      if (parsed.mode === "itinerary") {
        itineraryMode = true;
      }
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions.map((s: any) => ({
          time: s.time || "TBD",
          title: s.title || s.name || "Untitled",
          description: s.description || "",
          location: s.location,
          tips: s.tips,
          category: s.category || "activity",
        }));
      }

      text = text.replace(match[0], "");
    } catch {
      // Not valid JSON, keep as text
    }
  }

  // If no recs from complete blocks, try partial extraction from streaming
  if (recommendations.length === 0) {
    const incompleteMatch = content.match(/```json\s*([\s\S]*)$/);
    if (incompleteMatch) {
      recommendations = extractPartialRecommendations(incompleteMatch[1]);
    }
  }

  // Strip trailing unclosed ```json block (visible during streaming)
  text = text.replace(/```json[\s\S]*$/, "").trim();

  return { text: text.trim(), recommendations, actions, suggestions, hasItinerary, itineraryData, browseMode, itineraryMode };
}

function extractPartialRecommendations(partialContent: string): Recommendation[] {
  const recs: Recommendation[] = [];
  const arrayStart = partialContent.indexOf('"recommendations"');
  if (arrayStart === -1) return recs;
  const bracketStart = partialContent.indexOf('[', arrayStart);
  if (bracketStart === -1) return recs;

  const content = partialContent.slice(bracketStart + 1);
  let depth = 0, objStart = -1;

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') { if (depth === 0) objStart = i; depth++; }
    else if (content[i] === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try {
          const obj = JSON.parse(content.slice(objStart, i + 1));
          if (obj.name && obj.description) recs.push(obj);
        } catch { /* incomplete object, skip */ }
        objStart = -1;
      }
    }
  }
  return recs;
}
