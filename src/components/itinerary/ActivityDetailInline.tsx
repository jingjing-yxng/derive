"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Clock, Trash2 } from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "./ActivityTag";
import type { Activity } from "@/types/trip";

const CATEGORIES: Activity["category"][] = ["food", "activity", "transport", "accommodation", "free-time"];

const CATEGORY_LABELS: Record<Activity["category"], string> = {
  food: "Food",
  activity: "Activity",
  transport: "Transport",
  accommodation: "Stay",
  "free-time": "Free Time",
};

interface ActivityDetailInlineProps {
  activity: Activity;
  dayIndex: number;
  actIndex: number;
  onUpdate: (activity: Activity) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ActivityDetailInline({
  activity,
  dayIndex,
  actIndex,
  onUpdate,
  onDelete,
  onClose,
}: ActivityDetailInlineProps) {
  const [title, setTitle] = useState(activity.title);
  const [time, setTime] = useState(activity.time);
  const [description, setDescription] = useState(activity.description);
  const [location, setLocation] = useState(activity.location || "");
  const [tips, setTips] = useState(activity.tips || "");
  const [tickets, setTickets] = useState(activity.tickets || "");
  const [transport, setTransport] = useState(activity.transport || "");
  const [notes, setNotes] = useState(activity.notes || "");
  const [category, setCategory] = useState(activity.category);

  useEffect(() => {
    setTitle(activity.title);
    setTime(activity.time);
    setDescription(activity.description);
    setLocation(activity.location || "");
    setTips(activity.tips || "");
    setTickets(activity.tickets || "");
    setTransport(activity.transport || "");
    setNotes(activity.notes || "");
    setCategory(activity.category);
  }, [activity]);

  const save = () => {
    onUpdate({
      ...activity,
      title,
      time,
      description,
      location: location || undefined,
      tips: tips || undefined,
      tickets: tickets || undefined,
      transport: transport || undefined,
      notes: notes || undefined,
      category,
    });
  };

  const handleBlur = () => save();

  const colorBar = CATEGORY_COLORS[category]?.split(" ")[0] || "bg-n-100";

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const inputClasses = "w-full rounded-[16px] border-[1.5px] border-n-200 bg-n-0 px-3.5 py-2.5 text-[13px] text-n-900 outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-400/40 transition-all placeholder:text-n-400 resize-none overflow-hidden";

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-n-200 bg-n-0 shadow-sm overflow-hidden animate-slide-in-right">
      {/* Color bar */}
      <div className={`h-1.5 w-full ${colorBar}`} />

      {/* Header */}
      <div className="flex items-start gap-3 border-b border-n-200 px-4 py-3">
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-transparent font-heading text-[16px] font-semibold text-n-900 outline-none placeholder:text-n-400"
            placeholder="Activity name"
          />
          <p className="mt-0.5 text-[11px] text-n-500">
            {dayIndex >= 0 ? `Day ${dayIndex + 1}` : "Saved idea"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-n-400 hover:bg-n-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {/* Time */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-n-500">
            <Clock className="h-3 w-3" /> Time
          </label>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onBlur={handleBlur}
            className={inputClasses}
            placeholder="e.g. 9:00 AM"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-n-500">Category</label>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const isActive = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    onUpdate({ ...activity, title, time, description, location: location || undefined, tips: tips || undefined, tickets: tickets || undefined, transport: transport || undefined, notes: notes || undefined, category: cat });
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all ${
                    isActive
                      ? CATEGORY_COLORS[cat]
                      : "border-n-200 text-n-500 hover:border-n-300"
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-n-500">Description</label>
          <textarea
            ref={autoResize}
            value={description}
            onChange={(e) => { setDescription(e.target.value); autoResize(e.target); }}
            onBlur={handleBlur}
            rows={2}
            className={inputClasses}
            placeholder="What happens here..."
          />
        </div>

        {/* Location */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-n-500">
            <MapPin className="h-3 w-3" /> Location
          </label>
          <textarea
            ref={autoResize}
            value={location}
            onChange={(e) => { setLocation(e.target.value); autoResize(e.target); }}
            onBlur={handleBlur}
            rows={1}
            className={inputClasses}
            placeholder="Address or place name"
          />
          {location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-500 hover:underline"
            >
              <MapPin className="h-2.5 w-2.5" /> View on Maps
            </a>
          )}
        </div>

        {/* Tips */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-n-500">Tips</label>
          <textarea
            ref={autoResize}
            value={tips}
            onChange={(e) => { setTips(e.target.value); autoResize(e.target); }}
            onBlur={handleBlur}
            rows={1}
            className={inputClasses}
            placeholder="Helpful tips..."
          />
        </div>

        {/* Tickets / Booking */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-n-500">Tickets / Booking</label>
          <textarea
            ref={autoResize}
            value={tickets}
            onChange={(e) => { setTickets(e.target.value); autoResize(e.target); }}
            onBlur={handleBlur}
            rows={1}
            className={inputClasses}
            placeholder="Booking info, ticket prices..."
          />
        </div>

        {/* Transport */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-n-500">How to get here</label>
          <textarea
            ref={autoResize}
            value={transport}
            onChange={(e) => { setTransport(e.target.value); autoResize(e.target); }}
            onBlur={handleBlur}
            rows={1}
            className={inputClasses}
            placeholder="Metro line 2, 10 min walk..."
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-n-500">Your notes</label>
          <textarea
            ref={autoResize}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); autoResize(e.target); }}
            onBlur={handleBlur}
            rows={2}
            className={inputClasses}
            placeholder="Personal notes..."
          />
        </div>
      </div>

      {/* Footer action bar */}
      <div className="flex items-center border-t border-n-200 px-4 py-2.5">
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-rose-400 transition-colors hover:bg-rose-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}
