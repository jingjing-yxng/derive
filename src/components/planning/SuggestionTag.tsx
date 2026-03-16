"use client";

import { useState } from "react";
import { MapPin, Utensils, Bus, Hotel, Coffee, Bookmark, Check } from "lucide-react";
import type { Activity } from "@/types/trip";
import { stripMarkdown } from "@/lib/strip-markdown";

const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  food: Utensils,
  activity: MapPin,
  transport: Bus,
  accommodation: Hotel,
  "free-time": Coffee,
};

const CATEGORY_TAG_COLORS: Record<string, string> = {
  food: "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100",
  activity: "bg-mint-50 text-mint-600 border-mint-200 hover:bg-mint-100",
  transport: "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100",
  accommodation: "bg-lavender-50 text-lavender-600 border-lavender-200 hover:bg-lavender-100",
  "free-time": "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100",
};

interface SuggestionTagProps {
  suggestion: Omit<Activity, "id">;
  onAddToIdeas?: () => void;
}

export function SuggestionTag({ suggestion, onAddToIdeas }: SuggestionTagProps) {
  const [saved, setSaved] = useState(false);
  const Icon = CATEGORY_ICONS[suggestion.category] || MapPin;
  const colorClass = CATEGORY_TAG_COLORS[suggestion.category] || CATEGORY_TAG_COLORS.activity;

  const handleClick = () => {
    if (saved) return;
    onAddToIdeas?.();
    setSaved(true);
  };

  return (
    <button
      onClick={handleClick}
      title={saved ? "Saved to bookmarks" : "Bookmark this place"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-[13px] py-[5px] text-[13px] font-medium transition-all shadow-sm cursor-pointer ${saved ? "bg-lavender-50 text-lavender-500 border-lavender-200 opacity-70" : colorClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-[160px] truncate" title={stripMarkdown(suggestion.title)}>{stripMarkdown(suggestion.title)}</span>
      {saved ? (
        <Check className="h-3 w-3 text-lavender-500" />
      ) : (
        <Bookmark className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
