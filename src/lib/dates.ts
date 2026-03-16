import { format } from "date-fns";

/**
 * Formats a date range as "Jan 1 - 4, 2026" or "Feb 1 - Mar 9, 2026"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate) return "";
  const start = new Date(startDate + "T00:00:00");
  if (!endDate || startDate === endDate) {
    return format(start, "MMM d, yyyy");
  }
  const end = new Date(endDate + "T00:00:00");
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    // Jan 1 - 4, 2026
    return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
  }
  if (sameYear) {
    // Feb 1 - Mar 9, 2026
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }
  // Dec 28, 2025 - Jan 3, 2026
  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

export function formatSingleDate(date: string): string {
  if (!date) return "";
  return format(new Date(date + "T00:00:00"), "MMM d, yyyy");
}
