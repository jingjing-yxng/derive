"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { ActivityItem } from "./ActivityItem";
import { Plus } from "lucide-react";
import type { DayPlan, Activity } from "@/types/trip";

interface DayCardProps {
  day: DayPlan;
  dayIndex: number;
  editable?: boolean;
  onUpdateActivity?: (dayIndex: number, activityIndex: number, activity: Activity) => void;
  onDeleteActivity?: (dayIndex: number, activityIndex: number) => void;
  onAddActivity?: (dayIndex: number) => void;
}

export function DayCard({
  day,
  dayIndex,
  editable,
  onUpdateActivity,
  onDeleteActivity,
  onAddActivity,
}: DayCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { type: "day", dayIndex },
  });

  const activityIds = day.activities.map((_, i) => `day-${dayIndex}-activity-${i}`);

  return (
    <Card className={`space-y-3 transition-all ${isOver ? "ring-2 ring-lavender-400/40" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
          {day.day}
        </div>
        <div>
          <h3 className="font-heading text-[22px] font-semibold text-n-900">{day.title}</h3>
          {day.date && <p className="text-sm text-n-500">{day.date}</p>}
        </div>
      </div>
      <div ref={setNodeRef} className="space-y-2">
        <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
          {day.activities.map((activity, i) => (
            <ActivityItem
              key={activityIds[i]}
              id={activityIds[i]}
              activity={activity}
              editable={editable}
              onUpdate={(updated) => onUpdateActivity?.(dayIndex, i, updated)}
              onDelete={() => onDeleteActivity?.(dayIndex, i)}
            />
          ))}
        </SortableContext>
        {day.activities.length === 0 && (
          <div className="rounded-[20px] border-2 border-dashed border-n-200 py-4 text-center text-sm text-n-400">
            Drop activities here
          </div>
        )}
      </div>
      {editable && (
        <button
          onClick={() => onAddActivity?.(dayIndex)}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-n-300 py-2.5 text-sm font-medium text-n-500 hover:border-lavender-400/40 hover:text-lavender-500 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add activity
        </button>
      )}
    </Card>
  );
}
