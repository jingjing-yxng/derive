"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MapPin, Calendar, Users, FileText, X, Plus } from "lucide-react";
import { DateRangeCalendar } from "@/components/ui/date-range-calendar";
import { formatDateRange } from "@/lib/dates";
import type { Trip } from "@/types/trip";
import { stripMarkdown } from "@/lib/strip-markdown";

interface TripBriefProps {
  trip: Trip;
  compact?: boolean;
  onUpdate?: (fields: Partial<Pick<Trip, "start_date" | "end_date" | "regions" | "travel_party">>) => void;
}

export function EditableRegions({
  regions,
  onUpdate,
}: {
  regions: string[];
  onUpdate: (regions: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
        setInput("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing]);

  const addRegion = () => {
    const v = input.trim();
    if (v && !regions.includes(v)) {
      onUpdate([...regions, v]);
    }
    setInput("");
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-full border border-transparent px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors hover:border-n-300"
      >
        <MapPin className="h-3.5 w-3.5 text-n-400" />
        <span>{regions.join(" & ")}</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5 text-n-400" />
      {regions.map((r) => (
        <span
          key={r}
          className="inline-flex items-center gap-1 rounded-full bg-lavender-50 px-2.5 py-0.5 text-[13px] font-medium text-lavender-600"
        >
          {r}
          <button
            onClick={() => onUpdate(regions.filter((v) => v !== r))}
            className="rounded-full p-0.5 hover:bg-lavender-100"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addRegion(); }
            if (e.key === "Escape") { setEditing(false); setInput(""); }
          }}
          placeholder="Add..."
          className="w-20 bg-transparent text-[13px] outline-none placeholder:text-n-400"
        />
        {input.trim() && (
          <button
            onClick={addRegion}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-lavender-400 text-white"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function EditableDates({
  startDate,
  endDate,
  onUpdate,
}: {
  startDate: string;
  endDate: string;
  onUpdate: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-transparent px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors hover:border-n-300"
      >
        <Calendar className="h-3.5 w-3.5 text-n-400" />
        <span>{formatDateRange(startDate, endDate)}</span>
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-50"
          style={{ top: pos.top, left: pos.left }}
        >
          <DateRangeCalendar
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              onUpdate(start, end);
              if (start && end) setOpen(false);
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}

export function EditableParty({
  party,
  onUpdate,
}: {
  party: string;
  onUpdate: (party: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(party);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(party);
      inputRef.current?.focus();
    }
  }, [editing, party]);

  const commit = () => {
    const v = value.trim();
    if (v && v !== party) onUpdate(v);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-full border border-transparent px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors hover:border-n-300"
      >
        <Users className="h-3.5 w-3.5 text-n-400" />
        <span>{party || "Add party..."}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Users className="h-3.5 w-3.5 text-n-400" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        placeholder="e.g., Couple, Solo, Family..."
        className="w-40 bg-transparent text-[13px] outline-none placeholder:text-n-400"
      />
    </div>
  );
}

export function TripBrief({ trip, compact, onUpdate }: TripBriefProps) {
  const editable = !!onUpdate;

  if (compact) {
    if (editable) {
      return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[16px] bg-n-100 px-4 py-2.5 text-[13px] text-n-600">
          <EditableRegions
            regions={trip.regions}
            onUpdate={(regions) => onUpdate({ regions })}
          />
          <EditableDates
            startDate={trip.start_date}
            endDate={trip.end_date}
            onUpdate={(start_date, end_date) => onUpdate({ start_date, end_date })}
          />
          {(trip.travel_party || editable) && (
            <EditableParty
              party={trip.travel_party || ""}
              onUpdate={(travel_party) => onUpdate({ travel_party })}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-[16px] bg-n-100 px-4 py-2.5 text-[13px] text-n-600">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-n-400" />
          {trip.regions.join(" & ")}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-n-400" />
          {formatDateRange(trip.start_date, trip.end_date)}
        </span>
        {trip.travel_party && (
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-n-400" />
            {trip.travel_party}
          </span>
        )}
      </div>
    );
  }

  if (editable) {
    return (
      <div className="rounded-[24px] border border-n-200 bg-n-0 p-5 shadow-sm">
        <div className="space-y-3 text-sm text-n-700">
          <EditableRegions
            regions={trip.regions}
            onUpdate={(regions) => onUpdate({ regions })}
          />
          <EditableDates
            startDate={trip.start_date}
            endDate={trip.end_date}
            onUpdate={(start_date, end_date) => onUpdate({ start_date, end_date })}
          />
          {(trip.travel_party || editable) && (
            <EditableParty
              party={trip.travel_party || ""}
              onUpdate={(travel_party) => onUpdate({ travel_party })}
            />
          )}
          {trip.trip_description && (
            <div className="flex items-start gap-2 text-sm text-n-600">
              <FileText className="mt-0.5 h-4 w-4 text-lavender-400" />
              <span className="line-clamp-2">{stripMarkdown(trip.trip_description)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-n-200 bg-n-0 p-5 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-n-700">
          <MapPin className="h-4 w-4 text-lavender-400" />
          <span className="font-medium">{trip.regions.join(" & ")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-n-700">
          <Calendar className="h-4 w-4 text-lavender-400" />
          <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
        </div>
        {trip.travel_party && (
          <div className="flex items-center gap-2 text-sm text-n-700">
            <Users className="h-4 w-4 text-lavender-400" />
            <span>{trip.travel_party}</span>
          </div>
        )}
        {trip.trip_description && (
          <div className="flex items-start gap-2 text-sm text-n-600">
            <FileText className="mt-0.5 h-4 w-4 text-lavender-400" />
            <span className="line-clamp-2">{stripMarkdown(trip.trip_description)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
