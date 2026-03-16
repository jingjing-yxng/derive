"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MapPin, Users, CalendarDays } from "lucide-react";
import { deriveTripStatus } from "@/hooks/use-trips";
import { formatDateRange } from "@/lib/dates";
import type { TripWithStatus, TripStatus } from "@/hooks/use-trips";

const STATUS_CONFIG: Record<TripStatus, { label: string; dotColor: string; textColor: string; bgColor: string }> = {
  brainstorming: {
    label: "Brainstorming",
    dotColor: "bg-amber-400",
    textColor: "text-amber-500",
    bgColor: "bg-amber-400/8",
  },
  planning: {
    label: "Planning",
    dotColor: "bg-lavender-400",
    textColor: "text-lavender-500",
    bgColor: "bg-lavender-400/8",
  },
  finalized: {
    label: "Finalized",
    dotColor: "bg-mint-400",
    textColor: "text-mint-500",
    bgColor: "bg-mint-400/8",
  },
};

const REGION_COLORS = [
  { bg: "bg-lavender-400/8", text: "text-lavender-600" },
  { bg: "bg-rose-400/8", text: "text-rose-600" },
  { bg: "bg-mint-400/8", text: "text-mint-600" },
  { bg: "bg-amber-400/8", text: "text-amber-600" },
  { bg: "bg-sky-400/8", text: "text-sky-600" },
];

function generateTripTitle(trip: TripWithStatus): string {
  const regionStr = trip.regions.join(" & ");
  const party = trip.travel_party?.toLowerCase() || "";

  if (party.includes("couple")) return `Couples trip to ${regionStr}`;
  if (party.includes("solo")) return `Solo trip to ${regionStr}`;
  if (party.includes("family")) return `Family trip to ${regionStr}`;
  if (party.includes("friend")) return `${regionStr} with friends`;
  if (party.includes("group")) return `${regionStr} with friends`;
  if (party) return `${regionStr} — ${trip.travel_party}`;
  return `Trip to ${regionStr}`;
}

interface TripCardProps {
  trip: TripWithStatus;
  isPast?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function TripCard({ trip, isPast, selected, onToggleSelect }: TripCardProps) {
  const status = deriveTripStatus(trip);
  const { label, dotColor, textColor, bgColor } = STATUS_CONFIG[status];
  const title = generateTripTitle(trip);

  return (
    <div className={`relative ${isPast ? "opacity-50 grayscale" : ""}`}>
      {onToggleSelect && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(trip.id!); }}
          className={`absolute top-5 right-5 z-10 flex h-5 w-5 items-center justify-center rounded-[8px] border-2 transition-colors ${
            selected
              ? "border-lavender-400 bg-lavender-400"
              : "border-n-300 bg-n-0 hover:border-lavender-300"
          }`}
        >
          {selected && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}
      <Link href={`/trip/${trip.id}`}>
        <Card className={`overflow-hidden p-0 transition-shadow hover:shadow-md ${selected ? "ring-2 ring-lavender-400/40" : ""}`}>
          {/* Gradient header */}
          <div className="relative h-[88px] bg-brand-gradient-subtle">
            <div className="absolute bottom-3 left-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full ${bgColor} px-3.5 py-[5px] text-[13px] font-semibold ${textColor}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                {label}
              </span>
            </div>
          </div>
          {/* Body */}
          <div className="space-y-2.5 p-5">
            <h3 className="font-heading text-lg font-semibold text-n-900 leading-snug pr-6">
              {title}
            </h3>

            <div className="flex items-center gap-1.5 text-sm text-n-500">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>

            {trip.travel_party && (
              <div className="flex items-center gap-1.5 text-sm text-n-500">
                <Users className="h-4 w-4" />
                <span>{trip.travel_party}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {trip.regions.map((region, i) => {
                const c = REGION_COLORS[i % REGION_COLORS.length];
                return (
                  <span
                    key={region}
                    className={`inline-flex items-center gap-1 rounded-full ${c.bg} px-3.5 py-[5px] text-[13px] font-medium ${c.text}`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {region}
                  </span>
                );
              })}
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}
