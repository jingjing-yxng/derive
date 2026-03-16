"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = "Select date" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center gap-2.5 rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 text-base text-n-900 transition-colors hover:border-lavender-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400/40"
      >
        <Calendar className="h-4 w-4 text-n-400" />
        {selected ? (
          <span>{format(selected, "MMM d, yyyy")}</span>
        ) : (
          <span className="text-n-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 rounded-[24px] border border-n-200 bg-n-0 p-3 shadow-lg">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, "yyyy-MM-dd"));
              }
              setOpen(false);
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                ),
            }}
            classNames={{
              root: "text-sm",
              months: "flex flex-col",
              month_caption: "flex items-center justify-center py-1",
              caption_label: "text-sm font-semibold text-n-900",
              nav: "flex items-center justify-between absolute inset-x-3 top-3",
              button_previous: "h-7 w-7 flex items-center justify-center rounded-full text-n-500 hover:bg-lavender-50 hover:text-n-900 transition-colors",
              button_next: "h-7 w-7 flex items-center justify-center rounded-full text-n-500 hover:bg-lavender-50 hover:text-n-900 transition-colors",
              weekdays: "flex",
              weekday: "w-9 text-center text-xs font-medium text-n-400 py-1.5",
              week: "flex",
              day: "p-0",
              day_button: "h-9 w-9 flex items-center justify-center rounded-full text-sm transition-colors hover:bg-lavender-50 text-n-900",
              selected: "[&_.rdp-day_button]:bg-lavender-400 [&_.rdp-day_button]:text-white [&_.rdp-day_button]:hover:bg-lavender-500 [&_.rdp-day_button]:font-semibold",
              today: "[&_.rdp-day_button]:font-bold [&_.rdp-day_button]:text-lavender-400",
              outside: "[&_.rdp-day_button]:text-n-300",
              disabled: "[&_.rdp-day_button]:text-n-200 [&_.rdp-day_button]:pointer-events-none",
            }}
          />
        </div>
      )}
    </div>
  );
}
