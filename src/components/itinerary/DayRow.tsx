"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ActivityRow } from "./ActivityRow";
import { Plus, Moon, Plane, Train, Search, Loader2 } from "lucide-react";
import type { DayPlan, Activity } from "@/types/trip";

function getTransportType(activity: Activity): "flight" | "train" | null {
  if (activity.category !== "transport") return null;
  const text = `${activity.title} ${activity.description} ${activity.location || ""}`.toLowerCase();
  // Exclude transfers TO airports/stations (e.g. "Transfer to Lijiang Airport")
  if (/\btransfer\b/.test(text)) return null;
  if (/\b(flight|fly|plane|airline|aviation)\b/.test(text)) return "flight";
  if (/\b(train|railway|rail|高铁|火车|bullet)\b/.test(text)) return "train";
  return null;
}

interface DayRowProps {
  day: DayPlan;
  dayIndex: number;
  editable?: boolean;
  isLastDay?: boolean;
  onAddActivity?: (dayIndex: number) => void;
  onActivityClick?: (dayIndex: number, actIndex: number, activity: Activity) => void;
  onOvernightChange?: (dayIndex: number, value: string) => void;
  onTransportLookup?: (dayIndex: number, number: string, type: "flight" | "train", actIndex: number) => void;
}

export function DayRow({
  day,
  dayIndex,
  editable,
  isLastDay,
  onAddActivity,
  onActivityClick,
  onOvernightChange,
  onTransportLookup,
}: DayRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { type: "day", dayIndex },
  });

  const activityIds = day.activities.map((a) => a.id);

  return (
    <div
      className={`overflow-hidden rounded-[20px] border bg-n-0 shadow-sm transition-all ${
        isOver ? "ring-2 ring-lavender-400/40 border-lavender-300" : "border-n-200"
      }`}
    >
      {/* Day header */}
      <div className="flex items-center gap-2.5 border-b border-n-200 bg-n-50/60 px-4 py-3">
        <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-gradient-light px-2 text-[12px] font-bold text-white shadow-sm">
          {day.day}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-[14px] font-semibold leading-snug text-n-900">{day.title}</h3>
          {day.date && <p className="text-[11px] text-n-400">{day.date}</p>}
        </div>
        <span className="rounded-full bg-n-100 px-2 py-0.5 text-[10px] font-medium text-n-400">
          {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"}
        </span>
      </div>

      {/* Activity rows */}
      <div ref={setNodeRef} className="min-h-[40px]">
        <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
          {day.activities.map((activity, i) => (
            <ActivityRow
              key={activity.id}
              id={activity.id}
              activity={activity}
              disabled={!editable}
              isLast={i === day.activities.length - 1 && !editable && !day.overnight}
              onClick={() => onActivityClick?.(dayIndex, i, activity)}
            />
          ))}
        </SortableContext>
        {day.activities.length === 0 && (
          <p className="px-4 py-4 text-[13px] italic text-n-400">
            {isOver ? "Drop here" : "No activities yet"}
          </p>
        )}
      </div>

      {/* Transport number input (flight/train) */}
      {editable && <TransportNumberRows day={day} dayIndex={dayIndex} onTransportLookup={onTransportLookup} />}

      {/* Overnight location — hidden on last day */}
      {!isLastDay && (day.overnight || editable) && (
        <div className="flex items-center gap-2.5 border-t border-n-100 bg-lavender-50/30 px-4 py-2.5">
          <Moon className="h-3.5 w-3.5 shrink-0 text-lavender-400" />
          {editable ? (
            <input
              value={day.overnight || ""}
              onChange={(e) => onOvernightChange?.(dayIndex, e.target.value)}
              className="flex-1 bg-transparent text-[12px] text-n-600 outline-none placeholder:text-n-400"
              placeholder="Where are you staying tonight?"
            />
          ) : (
            <span className="text-[12px] text-n-600">{day.overnight}</span>
          )}
        </div>
      )}

      {/* Add button */}
      {editable && (
        <div className="border-t border-n-100 bg-n-50/30 px-4 py-2">
          <button
            onClick={() => onAddActivity?.(dayIndex)}
            className="flex w-full items-center justify-center gap-1.5 rounded-[12px] py-1.5 text-[12px] font-medium text-n-400 transition-colors hover:bg-lavender-50 hover:text-lavender-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add activity
          </button>
        </div>
      )}
    </div>
  );
}

function TransportNumberRows({
  day,
  dayIndex,
  onTransportLookup,
}: {
  day: DayPlan;
  dayIndex: number;
  onTransportLookup?: (dayIndex: number, number: string, type: "flight" | "train", actIndex: number) => void;
}) {
  const transports = day.activities
    .map((a, i) => ({ activity: a, actIndex: i, type: getTransportType(a) }))
    .filter((t) => t.type !== null) as { activity: Activity; actIndex: number; type: "flight" | "train" }[];

  if (transports.length === 0) return null;

  return (
    <>
      {transports.map((t) => (
        <TransportNumberInput
          key={t.activity.id}
          activity={t.activity}
          actIndex={t.actIndex}
          dayIndex={dayIndex}
          type={t.type}
          onLookup={onTransportLookup}
        />
      ))}
    </>
  );
}

function TransportNumberInput({
  activity,
  actIndex,
  dayIndex,
  type,
  onLookup,
}: {
  activity: Activity;
  actIndex: number;
  dayIndex: number;
  type: "flight" | "train";
  onLookup?: (dayIndex: number, number: string, type: "flight" | "train", actIndex: number) => void;
}) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const Icon = type === "flight" ? Plane : Train;
  const placeholder = type === "flight" ? "Flight number (e.g. MU2345)" : "Train number (e.g. G1234)";

  const handleLookup = () => {
    if (!value.trim() || loading) return;
    setLoading(true);
    onLookup?.(dayIndex, value.trim(), type, actIndex);
    // Reset loading after a timeout (parent will update the activity)
    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <div className="flex items-center gap-2.5 border-t border-n-100 bg-sky-50/30 px-4 py-2.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        className="flex-1 bg-transparent text-[12px] text-n-600 outline-none placeholder:text-n-400"
        placeholder={placeholder}
      />
      {value.trim() && (
        <button
          onClick={handleLookup}
          disabled={loading}
          className="flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-600 transition-colors hover:bg-sky-200 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          Look up
        </button>
      )}
    </div>
  );
}
