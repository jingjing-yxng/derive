"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin, Utensils, Bus, Hotel, Coffee, Clock } from "lucide-react";
import type { Activity } from "@/types/trip";
import { stripMarkdown } from "@/lib/strip-markdown";

export const CATEGORY_ICONS = {
  food: Utensils,
  activity: MapPin,
  transport: Bus,
  accommodation: Hotel,
  "free-time": Coffee,
};

export const CATEGORY_COLORS = {
  food: "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100",
  activity: "bg-mint-50 text-mint-600 border-mint-200 hover:bg-mint-100",
  transport: "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100",
  accommodation: "bg-lavender-50 text-lavender-600 border-lavender-200 hover:bg-lavender-100",
  "free-time": "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100",
};

export const CATEGORY_TINTS = {
  food: "bg-rose-50",
  activity: "bg-mint-50",
  transport: "bg-sky-50",
  accommodation: "bg-lavender-50",
  "free-time": "bg-amber-50",
};

interface ActivityTagProps {
  activity: Activity;
  id: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function ActivityTag({ activity, id, disabled, onClick }: ActivityTagProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const Icon = CATEGORY_ICONS[activity.category] || MapPin;
  const colorClass = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.activity;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-[13px] py-[5px] text-[13px] font-medium transition-all select-none ${colorClass} ${isDragging ? "shadow-lg scale-105 z-50 touch-none" : "shadow-sm"}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate" title={stripMarkdown(activity.title || "Untitled activity")}>{stripMarkdown(activity.title || "Untitled activity")}</span>
      {activity.time && (
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] opacity-60 font-mono">
          <Clock className="h-2.5 w-2.5" />
          {activity.time}
        </span>
      )}
    </button>
  );
}
