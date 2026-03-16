"use client";

import { useState, useEffect } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface DateRangeCalendarProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
}

export function DateRangeCalendar({
  startDate,
  endDate,
  onRangeChange,
}: DateRangeCalendarProps) {
  const from = startDate ? new Date(startDate + "T00:00:00") : undefined;
  const to = endDate ? new Date(endDate + "T00:00:00") : undefined;
  const selected: DateRange | undefined = from ? { from, to } : undefined;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isSingleDay =
    from && to && from.getTime() === to.getTime();

  const handleSelect = (range: DateRange | undefined) => {
    onRangeChange(
      range?.from ? format(range.from, "yyyy-MM-dd") : "",
      range?.to ? format(range.to, "yyyy-MM-dd") : ""
    );
  };

  const nights =
    from && to ? differenceInDays(to, from) : null;

  return (
    <div className="sticky top-28 rounded-[32px] border border-n-200 bg-n-0 p-5 shadow-sm">
      <p className="mb-4 font-heading text-sm font-semibold text-n-900">
        Select your travel dates
      </p>

      <DayPicker
        mode="range"
        selected={selected}
        onSelect={handleSelect}
        numberOfMonths={isMobile ? 1 : 2}
        showOutsideDays
        disabled={{ before: new Date() }}
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
          months: "flex gap-6",
          month: "flex-1",
          month_caption: "flex items-center justify-center py-1 mb-2",
          caption_label: "text-sm font-semibold text-n-900",
          nav: "flex items-center justify-between absolute inset-x-3 top-3",
          button_previous:
            "h-7 w-7 flex items-center justify-center rounded-full text-n-500 hover:bg-lavender-50 hover:text-n-900 transition-colors",
          button_next:
            "h-7 w-7 flex items-center justify-center rounded-full text-n-500 hover:bg-lavender-50 hover:text-n-900 transition-colors",
          weekdays: "flex",
          weekday:
            "w-10 text-center text-xs font-medium text-n-400 py-1.5",
          week: "flex",
          day: "p-0 py-0.5",
          day_button:
            "cal-btn h-10 w-10 flex items-center justify-center text-sm transition-colors text-n-900 hover:bg-lavender-50 rounded-full",
          range_start: isSingleDay
            ? "[&_.cal-btn]:bg-lavender-400 [&_.cal-btn]:text-white [&_.cal-btn]:font-semibold [&_.cal-btn]:hover:bg-lavender-400 [&_.cal-btn]:rounded-full"
            : "bg-lavender-50 rounded-l-full [&_.cal-btn]:bg-lavender-400 [&_.cal-btn]:text-white [&_.cal-btn]:font-semibold [&_.cal-btn]:hover:bg-lavender-400",
          range_end: isSingleDay
            ? "[&_.cal-btn]:bg-lavender-400 [&_.cal-btn]:text-white [&_.cal-btn]:font-semibold [&_.cal-btn]:hover:bg-lavender-400 [&_.cal-btn]:rounded-full"
            : "bg-lavender-50 rounded-r-full [&_.cal-btn]:bg-lavender-400 [&_.cal-btn]:text-white [&_.cal-btn]:font-semibold [&_.cal-btn]:hover:bg-lavender-400",
          range_middle:
            "!rounded-none bg-lavender-50 [&_.cal-btn]:rounded-none [&_.cal-btn]:text-lavender-600 [&_.cal-btn]:hover:bg-lavender-100",
          today:
            "[&_.cal-btn]:font-bold [&_.cal-btn]:ring-1 [&_.cal-btn]:ring-lavender-400/30",
          outside: "[&_.cal-btn]:text-n-300",
          disabled: "[&_.cal-btn]:text-n-200 [&_.cal-btn]:pointer-events-none",
          selected: "",
        }}
      />

      {/* Summary bar */}
      <div className="mt-4 flex items-center gap-2.5 border-t border-n-200 pt-4 text-sm">
        {from ? (
          <>
            <span className="rounded-full bg-lavender-50 px-2.5 py-1 font-medium text-lavender-600">
              {format(from, "MMM d, yyyy")}
            </span>
            <span className="text-n-400">&rarr;</span>
            {to ? (
              <>
                <span className="rounded-full bg-lavender-50 px-2.5 py-1 font-medium text-lavender-600">
                  {format(to, "MMM d, yyyy")}
                </span>
                <span className="ml-auto text-[13px] text-n-500">
                  {nights} {nights === 1 ? "night" : "nights"}
                </span>
              </>
            ) : (
              <span className="text-n-400">Select end date</span>
            )}
          </>
        ) : (
          <span className="text-n-400">
            Click a date to start selecting your range
          </span>
        )}
      </div>
    </div>
  );
}
