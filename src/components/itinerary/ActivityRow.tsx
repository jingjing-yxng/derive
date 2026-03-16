"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin, Clock, GripVertical } from "lucide-react";
import type { Activity } from "@/types/trip";
import { CATEGORY_ICONS } from "./ActivityTag";
import { stripMarkdown } from "@/lib/strip-markdown";

const ICON_BG: Record<string, string> = {
  food: "bg-rose-50 text-rose-500",
  activity: "bg-mint-50 text-mint-500",
  transport: "bg-sky-50 text-sky-500",
  accommodation: "bg-lavender-50 text-lavender-500",
  "free-time": "bg-amber-50 text-amber-500",
};

const ROW_TINT: Record<string, string> = {
  food: "hover:bg-rose-50/40",
  activity: "hover:bg-mint-50/40",
  transport: "hover:bg-sky-50/40",
  accommodation: "hover:bg-lavender-50/40",
  "free-time": "hover:bg-amber-50/40",
};

const LEFT_ACCENT: Record<string, string> = {
  food: "bg-rose-300",
  activity: "bg-mint-300",
  transport: "bg-sky-300",
  accommodation: "bg-lavender-300",
  "free-time": "bg-amber-300",
};

interface ActivityRowProps {
  activity: Activity;
  id: string;
  disabled?: boolean;
  onClick?: () => void;
  isLast?: boolean;
}

export function ActivityRow({ activity, id, disabled, onClick, isLast }: ActivityRowProps) {
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
  const iconClass = ICON_BG[activity.category] || ICON_BG.activity;
  const tintClass = ROW_TINT[activity.category] || ROW_TINT.activity;
  const accentClass = LEFT_ACCENT[activity.category] || LEFT_ACCENT.activity;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group flex items-start gap-3 px-4 py-3 transition-all select-none cursor-pointer ${tintClass} ${
        !isLast ? "border-b border-n-100" : ""
      } ${isDragging ? "shadow-lg z-50 bg-white rounded-[12px] border border-n-200 touch-none" : ""}`}
    >
      {/* Left accent bar + drag handle column */}
      <div className="flex shrink-0 items-stretch gap-2 self-stretch">
        {!disabled && (
          <GripVertical className="mt-1.5 h-3.5 w-3.5 shrink-0 text-n-200 opacity-40 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
        )}
        <div className={`w-[3px] shrink-0 rounded-full ${accentClass}`} />
      </div>

      {/* Time */}
      <span className="mt-0.5 flex w-[82px] shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-mono text-n-400">
        <Clock className="h-3 w-3 shrink-0" />
        {activity.time || "\u2014"}
      </span>

      {/* Category icon */}
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug text-n-900">
          {stripMarkdown(activity.title || "Untitled activity")}
        </p>
        {activity.description && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-n-500">
            {stripMarkdown(activity.description)}
          </p>
        )}
      </div>

      {/* Location pill */}
      {activity.location && (
        <span className="mt-0.5 hidden shrink-0 items-center gap-1 rounded-full bg-n-50 px-2 py-0.5 text-[11px] text-n-400 sm:inline-flex max-w-[180px]">
          <MapPin className="h-3 w-3 shrink-0 text-n-300" />
          <span className="truncate" title={activity.location}>{activity.location}</span>
        </span>
      )}
    </div>
  );
}
