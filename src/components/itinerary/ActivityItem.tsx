"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapPin, Utensils, Bus, Hotel, Clock, Coffee, GripVertical, X, Check } from "lucide-react";
import type { Activity } from "@/types/trip";
import { stripMarkdown } from "@/lib/strip-markdown";

const CATEGORY_ICONS = {
  food: Utensils,
  activity: MapPin,
  transport: Bus,
  accommodation: Hotel,
  "free-time": Coffee,
};

const CATEGORY_COLORS = {
  food: "bg-rose-50 text-rose-700 border-rose-200",
  activity: "bg-mint-50 text-mint-700 border-mint-200",
  transport: "bg-sky-50 text-sky-700 border-sky-200",
  accommodation: "bg-amber-50 text-amber-700 border-amber-200",
  "free-time": "bg-n-100 text-n-600 border-n-200",
};

interface ActivityItemProps {
  activity: Activity;
  id: string;
  editable?: boolean;
  onUpdate?: (activity: Activity) => void;
  onDelete?: () => void;
}

export function ActivityItem({ activity, id, editable, onUpdate, onDelete }: ActivityItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(activity.title);
  const [editTime, setEditTime] = useState(activity.time);
  const [editDescription, setEditDescription] = useState(activity.description);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = CATEGORY_ICONS[activity.category] || MapPin;
  const colorClass = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.activity;

  const handleSave = () => {
    onUpdate?.({
      ...activity,
      title: editTitle,
      time: editTime,
      description: editDescription,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(activity.title);
    setEditTime(activity.time);
    setEditDescription(activity.description);
    setEditing(false);
  };

  if (editing && editable) {
    return (
      <div className={`rounded-[16px] border p-4 ${colorClass}`}>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-20 rounded-[12px] border border-current/20 bg-white/50 px-2.5 py-1.5 font-mono text-[12px]"
              placeholder="Time"
            />
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 rounded-[12px] border border-current/20 bg-white/50 px-2.5 py-1.5 text-[15px] font-medium"
              placeholder="Activity name"
            />
          </div>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full rounded-[12px] border border-current/20 bg-white/50 px-2.5 py-1.5 text-sm"
            rows={2}
            placeholder="Description"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium hover:bg-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 rounded-full bg-white/40 px-3.5 py-1.5 text-[13px] font-medium hover:bg-white/60 transition-colors"
            >
              <Check className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`group rounded-[16px] border p-4 ${colorClass}`}>
      <div className="flex items-start gap-3">
        {editable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab opacity-0 group-hover:opacity-60 transition-opacity touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="mt-0.5">
          <Icon className="h-4 w-4" />
        </div>
        <div
          className="flex-1 space-y-1 cursor-pointer"
          onClick={() => editable && setEditing(true)}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-[16px] font-semibold">{stripMarkdown(activity.title)}</h4>
            <span className="flex items-center gap-1 font-mono text-[12px] opacity-75">
              <Clock className="h-3.5 w-3.5" />
              {activity.time}
            </span>
          </div>
          <p className="text-sm opacity-80">{stripMarkdown(activity.description)}</p>
          {activity.location && (
            <p className="flex items-center gap-1 text-sm opacity-60">
              <MapPin className="h-3.5 w-3.5" />
              {stripMarkdown(activity.location)}
            </p>
          )}
          {activity.tips && (
            <p className="text-sm italic opacity-60">Tip: {stripMarkdown(activity.tips)}</p>
          )}
        </div>
        {editable && onDelete && (
          <button
            onClick={onDelete}
            className="mt-0.5 rounded-full p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-white/30 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
