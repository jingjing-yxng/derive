"use client";

import { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { DayRow } from "./DayRow";
import { IdeasBucket } from "./IdeasBucket";
import { ActivityDetailPanel } from "./ActivityDetailPanel";
import { Plus, Save, Check, Bookmark, ChevronUp, List, Map as MapIcon, Loader2 } from "lucide-react";
import { useTripWorkspace } from "@/contexts/TripWorkspaceContext";
import type { Itinerary, Activity, DayPlan } from "@/types/trip";
import { CATEGORY_ICONS } from "./ActivityTag";
import { Clock, MapPin } from "lucide-react";
import { stripMarkdown } from "@/lib/strip-markdown";

const ItineraryMapView = dynamic(() => import("./ItineraryMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-lavender-400" />
    </div>
  ),
});

interface ItineraryViewProps {
  itinerary: Itinerary;
  editable?: boolean;
  onUpdate?: (days: DayPlan[]) => void;
  onUpdateIdeas?: (ideas: Activity[]) => void;
  onUpdateMeta?: (meta: { title?: string; summary?: string }) => void;
  saving?: boolean;
  saved?: boolean;
  hideAI?: boolean;
  /** Shared page context: disables sticky header, adjusts map height */
  shareMode?: boolean;
}

export function ItineraryView({ itinerary, editable, onUpdate, onUpdateIdeas, onUpdateMeta, saving, saved, hideAI, shareMode }: ItineraryViewProps) {
  const { selectedActivity, setSelectedActivity, sendChatMessage } = useTripWorkspace();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const ideasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10, delay: 200, tolerance: 5 },
    })
  );

  // Find an activity by its id across days and ideas
  const findActivity = useCallback(
    (id: string): { source: "day" | "ideas"; dayIndex?: number; actIndex: number; activity: Activity } | null => {
      for (let di = 0; di < itinerary.days.length; di++) {
        const ai = itinerary.days[di].activities.findIndex((a) => a.id === id);
        if (ai !== -1) return { source: "day", dayIndex: di, actIndex: ai, activity: itinerary.days[di].activities[ai] };
      }
      const ideas = itinerary.ideas || [];
      const ii = ideas.findIndex((a) => a.id === id);
      if (ii !== -1) return { source: "ideas", actIndex: ii, activity: ideas[ii] };
      return null;
    },
    [itinerary]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      if (!editable || !onUpdate) return;

      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const from = findActivity(activeId);
      if (!from) return;

      const days = itinerary.days.map((d) => ({
        ...d,
        activities: [...d.activities],
      }));
      const ideas = [...(itinerary.ideas || [])];

      // Remove from source
      let moved: Activity;
      if (from.source === "ideas") {
        [moved] = ideas.splice(from.actIndex, 1);
      } else {
        [moved] = days[from.dayIndex!].activities.splice(from.actIndex, 1);
      }

      // Determine target
      if (overId === "ideas-bucket") {
        ideas.push(moved);
      } else {
        const dayMatch = overId.match(/^day-(\d+)$/);
        const toActivity = findActivity(overId);

        if (toActivity && toActivity.source === "ideas") {
          // Dropping on an idea → insert into ideas at that position
          ideas.splice(toActivity.actIndex, 0, moved);
        } else if (toActivity && toActivity.source === "day") {
          // Dropping on another activity in a day
          days[toActivity.dayIndex!].activities.splice(toActivity.actIndex, 0, moved);
        } else if (dayMatch) {
          // Dropping on a day row
          const targetDay = parseInt(dayMatch[1]);
          days[targetDay].activities.push(moved);
        } else {
          // Can't determine target, restore
          if (from.source === "ideas") {
            ideas.splice(from.actIndex, 0, moved);
          } else {
            days[from.dayIndex!].activities.splice(from.actIndex, 0, moved);
          }
          return;
        }
      }

      onUpdate(days);
      onUpdateIdeas?.(ideas);
    },
    [editable, onUpdate, onUpdateIdeas, itinerary, findActivity]
  );

  const handleAddActivity = useCallback(
    (dayIndex: number) => {
      if (!onUpdate) return;
      const newActivity: Activity = {
        id: crypto.randomUUID(),
        time: "12:00",
        title: "New activity",
        description: "",
        category: "activity",
      };
      const days = itinerary.days.map((d, i) =>
        i === dayIndex
          ? { ...d, activities: [...d.activities, newActivity] }
          : d
      );
      onUpdate(days);
      // Open the detail panel for the new activity
      setSelectedActivity({
        dayIndex,
        actIndex: days[dayIndex].activities.length - 1,
        activity: newActivity,
      });
    },
    [onUpdate, itinerary.days, setSelectedActivity]
  );

  const handleActivityClick = useCallback(
    (dayIndex: number, actIndex: number, activity: Activity) => {
      setSelectedActivity({ dayIndex, actIndex, activity });
    },
    [setSelectedActivity]
  );

  const handleIdeasActivityClick = useCallback(
    (actIndex: number, activity: Activity) => {
      // Use -1 as dayIndex to signal it's from ideas
      setSelectedActivity({ dayIndex: -1, actIndex, activity });
    },
    [setSelectedActivity]
  );

  const handleUpdateActivity = useCallback(
    (updated: Activity) => {
      if (!selectedActivity || !onUpdate) return;
      if (selectedActivity.dayIndex === -1) {
        // Ideas activity
        const ideas = (itinerary.ideas || []).map((a, i) =>
          i === selectedActivity.actIndex ? updated : a
        );
        onUpdateIdeas?.(ideas);
      } else {
        const days = itinerary.days.map((d, i) =>
          i === selectedActivity.dayIndex
            ? { ...d, activities: d.activities.map((a, j) => (j === selectedActivity.actIndex ? updated : a)) }
            : d
        );
        onUpdate(days);
      }
      setSelectedActivity({ ...selectedActivity, activity: updated });
    },
    [selectedActivity, onUpdate, onUpdateIdeas, itinerary, setSelectedActivity]
  );

  const handleDeleteActivity = useCallback(() => {
    if (!selectedActivity || !onUpdate) return;
    if (selectedActivity.dayIndex === -1) {
      const ideas = (itinerary.ideas || []).filter((_, i) => i !== selectedActivity.actIndex);
      onUpdateIdeas?.(ideas);
    } else {
      const days = itinerary.days.map((d, i) =>
        i === selectedActivity.dayIndex
          ? { ...d, activities: d.activities.filter((_, j) => j !== selectedActivity.actIndex) }
          : d
      );
      onUpdate(days);
    }
    setSelectedActivity(null);
  }, [selectedActivity, onUpdate, onUpdateIdeas, itinerary, setSelectedActivity]);

  const handleOvernightChange = useCallback(
    (dayIndex: number, value: string) => {
      if (!onUpdate) return;
      const days = itinerary.days.map((d, i) =>
        i === dayIndex ? { ...d, overnight: value || undefined } : d
      );
      onUpdate(days);
    },
    [onUpdate, itinerary.days]
  );

  const handleTransportLookup = useCallback(
    async (dayIndex: number, transportNumber: string, type: "flight" | "train", actIndex: number) => {
      if (!onUpdate) return;
      try {
        const date = itinerary.days[dayIndex]?.date;
        const res = await fetch("/api/transport-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: transportNumber, type, date }),
        });
        const data = await res.json();
        if (data.found) {
          const days = itinerary.days.map((d, di) => {
            if (di !== dayIndex) return d;
            return {
              ...d,
              activities: d.activities.map((a, ai) => {
                if (ai !== actIndex) return a;
                const depTime = data.departure?.time || a.time;
                const arrTime = data.arrival?.time || "";
                const depAirport = data.departure?.airport || "";
                const arrAirport = data.arrival?.airport || "";
                const timeStr = depTime.includes("T")
                  ? new Date(depTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : depTime;
                const arrTimeStr = arrTime.includes("T")
                  ? new Date(arrTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : arrTime;
                return {
                  ...a,
                  time: timeStr,
                  description: `${data.airline ? data.airline + " " : ""}${data.number}${depAirport ? ` — ${depAirport}` : ""}${arrAirport ? ` → ${arrAirport}` : ""}${arrTimeStr ? ` (arrives ${arrTimeStr})` : ""}`,
                  notes: a.notes ? `${a.notes}\n${type === "flight" ? "Flight" : "Train"}: ${data.number}` : `${type === "flight" ? "Flight" : "Train"}: ${data.number}`,
                };
              }),
            };
          });
          onUpdate(days);
        }
      } catch (e) {
        console.error("Transport lookup failed:", e);
      }
    },
    [onUpdate, itinerary.days]
  );

  const handleAddDay = useCallback(() => {
    if (!onUpdate) return;
    const newDay: DayPlan = {
      day: itinerary.days.length + 1,
      title: `Day ${itinerary.days.length + 1}`,
      activities: [],
    };
    onUpdate([...itinerary.days, newDay]);
  }, [onUpdate, itinerary.days]);

  // Find the dragged activity for the overlay
  const draggedActivity = activeDragId ? findActivity(activeDragId)?.activity : null;

  return (
    <div className="space-y-4">
      <div className={`${shareMode ? "mb-2 pb-4 border-b border-n-100" : "sticky top-0 z-[5] -mx-4 -mt-5 lg:mt-0 mb-2 bg-white px-4 pb-4 pt-5 shadow-[0_4px_6px_-4px_rgba(0,0,0,0.05)]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-y-2">
          <div className="min-w-0 w-full">
            {editable && onUpdateMeta ? (
              <input
                className="w-full bg-transparent font-heading text-[22px] font-semibold text-n-900 outline-none hover:bg-n-100/60 focus:bg-n-100/60 focus:ring-1 focus:ring-lavender-300 rounded px-1 -ml-1 lg:text-[26px]"
                defaultValue={itinerary.title}
                key={itinerary.title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== itinerary.title) onUpdateMeta({ title: v });
                }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              />
            ) : (
              <h2 className="font-heading text-[22px] font-semibold text-n-900 lg:text-[26px]">
                {itinerary.title}
              </h2>
            )}
            {itinerary.summary && (
              <div
                className={`overflow-hidden transition-all duration-300 ${summaryOpen ? "mt-1 max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <p className="text-sm text-n-500">{itinerary.summary}</p>
              </div>
            )}
            {itinerary.summary && (
              <button
                onClick={() => setSummaryOpen((v) => !v)}
                className={`mt-1 flex items-center gap-1 text-[12px] text-n-400 transition-colors hover:text-n-600 ${summaryOpen ? "" : "mt-0.5"}`}
              >
                <ChevronUp className={`h-3 w-3 transition-transform duration-200 ${summaryOpen ? "" : "rotate-180"}`} />
                {summaryOpen ? "Less" : "More"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* List / Map toggle */}
            <div className="flex rounded-full bg-n-100 p-[2px]">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-n-900 shadow-sm"
                    : "text-n-500 hover:text-n-700"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  viewMode === "map"
                    ? "bg-white text-n-900 shadow-sm"
                    : "text-n-500 hover:text-n-700"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                Map
              </button>
            </div>
            {/* Bookmarks button */}
            {(itinerary.ideas || []).length > 0 && viewMode === "list" && (
              <button
                onClick={() => {
                  setIdeasOpen(true);
                  ideasRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                className="flex items-center gap-1.5 rounded-full border border-n-200 bg-n-0 px-3 py-1.5 text-[13px] font-medium text-n-600 transition-colors hover:bg-lavender-50 hover:text-lavender-500 hover:border-lavender-300"
              >
                <Bookmark className="h-3.5 w-3.5" />
                {(itinerary.ideas || []).length}
              </button>
            )}
            {editable && (
              <div className="flex items-center gap-1.5 text-[13px] text-n-500">
                {saving ? (
                  <>
                    <Save className="h-4 w-4 animate-pulse" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4 text-mint-500" />
                  Saved
                </>
              ) : null}
            </div>
          )}
        </div>
        </div>
      </div>

      {viewMode === "map" ? (
        <ItineraryMapView
          itinerary={itinerary}
          onActivityClick={handleActivityClick}
          shareMode={shareMode}
        />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Ideas bucket (bookmarks) */}
            <div ref={ideasRef}>
              <IdeasBucket
                ideas={itinerary.ideas || []}
                editable={editable}
                onActivityClick={handleIdeasActivityClick}
                forceExpanded={ideasOpen}
                onToggle={(open) => setIdeasOpen(open)}
              />
            </div>

            {/* Day rows */}
            <div className="space-y-3 mt-2">
              {itinerary.days.map((day, i) => (
                <DayRow
                  key={`day-${day.day}-${i}`}
                  day={day}
                  dayIndex={i}
                  editable={editable}
                  isLastDay={i === itinerary.days.length - 1}
                  onAddActivity={handleAddActivity}
                  onActivityClick={handleActivityClick}
                  onOvernightChange={handleOvernightChange}
                  onTransportLookup={handleTransportLookup}
                />
              ))}
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {draggedActivity && (
                <DragOverlayTag activity={draggedActivity} />
              )}
            </DragOverlay>
          </DndContext>

          {editable && (
            <button
              onClick={handleAddDay}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-n-300 py-3 text-[14px] font-medium text-n-500 hover:border-lavender-400/40 hover:text-lavender-500 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add day
            </button>
          )}
        </>
      )}

      {/* Activity detail panel — skip in shareMode (rendered externally as side panel) */}
      {selectedActivity && !shareMode && (
        <ActivityDetailPanel
          activity={selectedActivity.activity}
          dayIndex={selectedActivity.dayIndex}
          actIndex={selectedActivity.actIndex}
          onUpdate={handleUpdateActivity}
          onDelete={handleDeleteActivity}
          onClose={() => setSelectedActivity(null)}
          onAskAI={hideAI ? undefined : sendChatMessage}
        />
      )}
    </div>
  );
}

const OVERLAY_ICON_BG: Record<string, string> = {
  food: "bg-rose-50 text-rose-500",
  activity: "bg-mint-50 text-mint-500",
  transport: "bg-sky-50 text-sky-500",
  accommodation: "bg-lavender-50 text-lavender-500",
  "free-time": "bg-amber-50 text-amber-500",
};

const OVERLAY_ACCENT: Record<string, string> = {
  food: "bg-rose-300",
  activity: "bg-mint-300",
  transport: "bg-sky-300",
  accommodation: "bg-lavender-300",
  "free-time": "bg-amber-300",
};

function DragOverlayTag({ activity }: { activity: Activity }) {
  const Icon = CATEGORY_ICONS[activity.category] || CATEGORY_ICONS.activity;
  const iconClass = OVERLAY_ICON_BG[activity.category] || OVERLAY_ICON_BG.activity;
  const accentClass = OVERLAY_ACCENT[activity.category] || OVERLAY_ACCENT.activity;
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-n-200 bg-white px-4 py-3 shadow-xl">
      <div className={`w-[3px] self-stretch rounded-full ${accentClass}`} />
      <span className="flex w-[82px] shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-mono text-n-400">
        <Clock className="h-3 w-3 shrink-0" />
        {activity.time || "\u2014"}
      </span>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="max-w-[200px] truncate text-[13px] font-semibold text-n-900" title={stripMarkdown(activity.title)}>{stripMarkdown(activity.title)}</span>
      {activity.location && (
        <span className="hidden items-center gap-1 rounded-full bg-n-50 px-2 py-0.5 text-[11px] text-n-400 sm:inline-flex">
          <MapPin className="h-3 w-3" />
          <span className="max-w-[120px] truncate" title={activity.location}>{activity.location}</span>
        </span>
      )}
    </div>
  );
}
