"use client";

import { useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { ActivityTag } from "./ActivityTag";
import { ChevronDown, Bookmark } from "lucide-react";
import type { Activity } from "@/types/trip";

interface IdeasBucketProps {
  ideas: Activity[];
  editable?: boolean;
  onActivityClick?: (actIndex: number, activity: Activity) => void;
  forceExpanded?: boolean;
  onToggle?: (open: boolean) => void;
}

export function IdeasBucket({ ideas, editable, onActivityClick, forceExpanded, onToggle }: IdeasBucketProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);
  const { setNodeRef, isOver } = useDroppable({
    id: "ideas-bucket",
    data: { type: "ideas" },
  });

  if (ideas.length === 0 && !isOver) return null;

  const ideaIds = ideas.map((a) => a.id);

  return (
    <div
      className={`rounded-[24px] border bg-n-0 px-4 py-3 transition-all ${
        isOver ? "ring-2 ring-lavender-400/40 border-lavender-300" : "border-n-200"
      }`}
    >
      <button
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          onToggle?.(next);
        }}
        className="flex w-full items-center gap-2 text-left"
      >
        <Bookmark className="h-4 w-4 text-lavender-400" />
        <span className="text-[13px] font-medium text-n-600">
          Bookmarks ({ideas.length})
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 text-n-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${expanded ? "mt-2 max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div ref={setNodeRef} className="flex min-h-[36px] flex-wrap items-center gap-2">
          <SortableContext items={ideaIds} strategy={horizontalListSortingStrategy}>
            {ideas.map((idea, i) => (
              <ActivityTag
                key={idea.id}
                id={idea.id}
                activity={idea}
                disabled={!editable}
                onClick={() => onActivityClick?.(i, idea)}
              />
            ))}
          </SortableContext>
          {ideas.length === 0 && (
            <span className="text-[13px] italic text-n-400">
              {isOver ? "Drop here to save" : "Drag activities here to save for later"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
