"use client";

import { useState } from "react";
import { MapPin, Utensils, Bus, Hotel, Coffee, Plus, Lightbulb, Check, Loader2 } from "lucide-react";
import type { Activity, DayPlan } from "@/types/trip";
import { stripMarkdown } from "@/lib/strip-markdown";

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  food: Utensils,
  activity: MapPin,
  transport: Bus,
  accommodation: Hotel,
  "free-time": Coffee,
};

const CATEGORY_CARD_COLORS: Record<string, string> = {
  food: "border-l-rose-400",
  activity: "border-l-mint-400",
  transport: "border-l-sky-400",
  accommodation: "border-l-lavender-400",
  "free-time": "border-l-amber-400",
};

interface SuggestionCardProps {
  suggestion: Omit<Activity, "id">;
  days?: DayPlan[];
  onAddToItinerary?: () => void;
  onAddToIdeas?: () => void;
  isAdding?: boolean;
}

export function SuggestionCard({ suggestion, days, onAddToItinerary, onAddToIdeas, isAdding }: SuggestionCardProps) {
  const [added, setAdded] = useState(false);
  const Icon = CATEGORY_ICONS[suggestion.category] || MapPin;
  const borderColor = CATEGORY_CARD_COLORS[suggestion.category] || CATEGORY_CARD_COLORS.activity;

  const handleAdd = () => {
    if (added || isAdding) return;
    onAddToItinerary?.();
    setAdded(true);
  };

  return (
    <div className={`rounded-[24px] border border-l-4 ${borderColor} border-n-200 bg-n-0 p-4 shadow-sm`}>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">
          <Icon className="h-4 w-4 text-n-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-[14px] font-semibold text-n-900">{stripMarkdown(suggestion.title)}</p>
          {suggestion.description && (
            <p className="mt-0.5 text-[14px] text-n-600 line-clamp-2">{stripMarkdown(suggestion.description)}</p>
          )}
          {suggestion.location && (
            <p className="mt-1 flex items-center gap-1 text-[12px] text-n-500">
              <MapPin className="h-3 w-3" /> {suggestion.location}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {onAddToItinerary && days && days.length > 0 && (
          <button
            onClick={handleAdd}
            disabled={added || isAdding}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
              added
                ? "bg-mint-50 text-mint-600"
                : "bg-lavender-50 text-lavender-600 hover:bg-lavender-100"
            }`}
          >
            {added ? (
              <>
                <Check className="h-3 w-3" /> Added
              </>
            ) : isAdding ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Adding...
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Add to Itinerary
              </>
            )}
          </button>
        )}
        {onAddToIdeas && (
          <button
            onClick={onAddToIdeas}
            className="flex items-center gap-1 rounded-full border border-n-200 px-2.5 py-1 text-[12px] font-medium text-n-500 hover:bg-n-100 transition-colors"
          >
            <Lightbulb className="h-3 w-3" /> Save to Ideas
          </button>
        )}
      </div>
    </div>
  );
}
