"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Clock, Search, Sparkles, Trash2, DollarSign, Pencil, Loader2 } from "lucide-react";
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

interface ActivityDetailPanelProps {
  activity: Activity;
  dayIndex: number;
  actIndex: number;
  onUpdate: (activity: Activity) => void;
  onDelete: () => void;
  onClose: () => void;
  onAskAI?: (message: string) => void;
}

function PhotoGallery({ query }: { query: string }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/photos?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setImages(data.images || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-n-300" />
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {images.map((url, i) => (
        <div key={url} className="group relative overflow-hidden rounded-[12px] border border-n-100">
          <img
            src={url}
            alt=""
            className="h-[120px] w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          <button
            onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ActivityDetailPanel({
  activity,
  dayIndex,
  actIndex,
  onUpdate,
  onDelete,
  onClose,
  onAskAI,
}: ActivityDetailPanelProps) {
  const [title, setTitle] = useState(activity.title);
  const [time, setTime] = useState(activity.time);
  const [description, setDescription] = useState(activity.description);
  const [location, setLocation] = useState(activity.location || "");
  const [tips, setTips] = useState(activity.tips || "");
  const [tickets, setTickets] = useState(activity.tickets || "");
  const [transport, setTransport] = useState(activity.transport || "");
  const [notes, setNotes] = useState(activity.notes || "");
  const [estimatedBudget, setEstimatedBudget] = useState(activity.estimated_budget || "");
  const [category, setCategory] = useState(activity.category);

  // Sync when activity changes from outside
  useEffect(() => {
    setTitle(activity.title);
    setTime(activity.time);
    setDescription(activity.description);
    setLocation(activity.location || "");
    setTips(activity.tips || "");
    setTickets(activity.tickets || "");
    setTransport(activity.transport || "");
    setNotes(activity.notes || "");
    setEstimatedBudget(activity.estimated_budget || "");
    setCategory(activity.category);
  }, [activity]);

  const save = useCallback(() => {
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
      estimated_budget: estimatedBudget || undefined,
      category,
    });
  }, [activity, onUpdate, title, time, description, location, tips, tickets, transport, notes, estimatedBudget, category]);

  const handleBlur = () => save();

  const colorBar = CATEGORY_COLORS[category]?.split(" ")[0] || "bg-n-100";

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const inputClasses = "w-full rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 py-3 text-[14px] text-n-900 outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-400/40 transition-all placeholder:text-n-400 resize-none overflow-hidden";

  // Show photos for activity and food categories
  const showPhotos = category === "activity" || category === "food";
  const photoQuery = showPhotos ? `${title}${location ? ` ${location}` : ""}` : "";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-n-900/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative flex w-full max-w-md flex-col animate-slide-in-right border-l border-n-200 bg-n-0 shadow-2xl overflow-hidden h-full sm:mr-4 sm:mt-4 sm:mb-4 sm:h-[calc(100vh-32px)] sm:rounded-[32px] sm:border">
        {/* Color bar */}
        <div className={`h-1.5 w-full ${colorBar}`} />

        {/* Header */}
        <div className="flex items-start gap-3 border-b border-n-200 px-5 py-4">
          <div className="group/title flex-1">
            <div className="relative">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleBlur}
                className="w-full rounded-[8px] border border-transparent bg-transparent px-1 py-0.5 font-heading text-[18px] font-semibold text-n-900 outline-none transition-all placeholder:text-n-400 hover:border-n-200 hover:bg-n-50/50 focus:border-lavender-400 focus:bg-white focus:ring-2 focus:ring-lavender-400/40"
                placeholder="Activity name"
              />
              <Pencil className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-n-300 opacity-0 transition-opacity group-hover/title:opacity-100" />
            </div>
            <p className="mt-0.5 px-1 text-[12px] text-n-500">
              {dayIndex >= 0 ? `Day ${dayIndex + 1}, activity ${actIndex + 1}` : `Saved idea #${actIndex + 1}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-n-400 hover:bg-n-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 scrollbar-thin">
          {/* Photos */}
          {showPhotos && photoQuery && (
            <PhotoGallery query={photoQuery} />
          )}

          {/* Time */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-n-500">
              <Clock className="h-3.5 w-3.5" /> Time
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
            <label className="mb-1.5 block text-[12px] font-semibold text-n-500">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      onUpdate({ ...activity, title, time, description, location: location || undefined, tips: tips || undefined, tickets: tickets || undefined, transport: transport || undefined, notes: notes || undefined, estimated_budget: estimatedBudget || undefined, category: cat });
                    }}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all ${
                      isActive
                        ? CATEGORY_COLORS[cat]
                        : "border-n-200 text-n-500 hover:border-n-300"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimated Budget */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-n-500">
              <DollarSign className="h-3.5 w-3.5" /> Estimated Budget
            </label>
            <input
              value={estimatedBudget}
              onChange={(e) => setEstimatedBudget(e.target.value)}
              onBlur={handleBlur}
              className={inputClasses}
              placeholder="e.g. $10-20, ¥50-100, Free"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-n-500">Description</label>
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
            <label className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-n-500">
              <MapPin className="h-3.5 w-3.5" /> Location
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
                className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-sky-500 hover:underline"
              >
                <MapPin className="h-3 w-3" /> View on Google Maps
              </a>
            )}
          </div>

          {/* Tips */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-n-500">Tips</label>
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
            <label className="mb-1.5 block text-[12px] font-semibold text-n-500">Tickets / Booking</label>
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
            <label className="mb-1.5 block text-[12px] font-semibold text-n-500">How to get here</label>
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
            <label className="mb-1.5 block text-[12px] font-semibold text-n-500">Your notes</label>
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

        {/* Sticky action bar */}
        <div className="flex items-center gap-2 border-t border-n-200 px-5 py-3">
          {onAskAI && (
            <>
              <button
                onClick={() => {
                  onAskAI(`Find alternatives to "${title}" on Day ${dayIndex + 1}. I want something similar but different.`);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-full bg-lavender-50 px-3 py-1.5 text-[13px] font-medium text-lavender-600 transition-colors hover:bg-lavender-100"
              >
                <Search className="h-3.5 w-3.5" /> Alternatives
              </button>
              <button
                onClick={() => {
                  onAskAI(`Tell me more about "${title}"${location ? ` at ${location}` : ""}. Opening hours, best time to visit, what to expect, and any insider tips.`);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-full bg-lavender-50 px-3 py-1.5 text-[13px] font-medium text-lavender-600 transition-colors hover:bg-lavender-100"
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask AI
              </button>
            </>
          )}
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-rose-400 transition-colors hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
