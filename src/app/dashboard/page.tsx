"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { useTrips } from "@/hooks/use-trips";
import { deriveTripStatus } from "@/hooks/use-trips";
import { useTranslation } from "@/lib/i18n/context";
import { AppLayout } from "@/components/ui/app-layout";
import { TripCard } from "@/components/dashboard/TripCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Loader2, Compass, ArrowUpDown, Trash2, X } from "lucide-react";
import type { TripStatus } from "@/hooks/use-trips";

type SortMode = "recent" | "trip-date";

export default function DashboardPage() {
  const { sessionId, ready } = useSession();
  const { profile, loading: profileLoading } = useProfile(sessionId);
  const { trips, loading: tripsLoading, deleteTrips } = useTrips(sessionId);
  const router = useRouter();
  const { t } = useTranslation();

  const STATUS_FILTERS: { value: TripStatus | "all"; label: string }[] = [
    { value: "all", label: t("dashboard.filterAll") },
    { value: "brainstorming", label: t("dashboard.filterBrainstorming") },
    { value: "planning", label: t("dashboard.filterPlanning") },
    { value: "finalized", label: t("dashboard.filterFinalized") },
  ];

  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    await deleteTrips(Array.from(selectedIds));
    setSelectedIds(new Set());
    setDeleting(false);
  };

  // Redirect to onboarding if no profile
  useEffect(() => {
    if (ready && !profileLoading && !profile) {
      router.replace("/onboarding");
    }
  }, [ready, profileLoading, profile, router]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { upcomingTrips, pastTrips } = useMemo(() => {
    let result = trips;

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((t) => deriveTripStatus(t) === statusFilter);
    }

    // Split into upcoming vs past
    const upcoming = result.filter((t) => !t.end_date || t.end_date >= today);
    const past = result.filter((t) => t.end_date && t.end_date < today);

    const sortFn = (a: typeof trips[0], b: typeof trips[0]) => {
      if (sortMode === "trip-date") {
        // Upcoming: soonest first; Past: most recent first
        return (a.start_date || "").localeCompare(b.start_date || "");
      }
      const aDate = a.updated_at || a.created_at || "";
      const bDate = b.updated_at || b.created_at || "";
      return bDate.localeCompare(aDate);
    };

    const pastSortFn = (a: typeof trips[0], b: typeof trips[0]) => {
      if (sortMode === "trip-date") {
        // Past: most recent trip first
        return (b.start_date || "").localeCompare(a.start_date || "");
      }
      const aDate = a.updated_at || a.created_at || "";
      const bDate = b.updated_at || b.created_at || "";
      return bDate.localeCompare(aDate);
    };

    return {
      upcomingTrips: [...upcoming].sort(sortFn),
      pastTrips: [...past].sort(pastSortFn),
    };
  }, [trips, statusFilter, sortMode, today]);

  if (!ready || profileLoading || !profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base text-n-500">{t("dashboard.welcomeBack")}</p>
            <h1 className="font-heading text-[26px] font-bold tracking-tight text-n-900 lg:text-[32px]">
              {t("dashboard.yourTrips")}
            </h1>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button size="lg" className="flex-1 sm:flex-initial" onClick={() => router.push("/trip/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("dashboard.planNewTrip")}
            </Button>
          </div>
        </div>

        {/* Filters & Sort */}
        {trips.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-full bg-n-100 p-[3px]">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    statusFilter === f.value
                      ? "bg-lavender-400 text-white shadow-sm"
                      : "text-n-500 hover:text-n-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSortMode((m) => (m === "recent" ? "trip-date" : "recent"))}
              className="flex items-center gap-1.5 rounded-full bg-n-100 px-5 py-2 text-sm font-medium text-n-500 transition-colors hover:text-n-900"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortMode === "recent" ? t("dashboard.sortRecent") : t("dashboard.sortSoonest")}
            </button>
          </div>
        )}

        {/* Selection action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-2.5">
            <span className="text-sm font-medium text-rose-700">
              {t("dashboard.tripsSelected", { count: selectedIds.size, s: selectedIds.size > 1 ? "s" : "" })}
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-rose-400 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-45"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              {t("common.delete")}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1 rounded-full border border-rose-200 px-4 py-1.5 text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
            >
              <X className="h-3 w-3" />
              {t("common.cancel")}
            </button>
          </div>
        )}

        {tripsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : trips.length > 0 ? (
          upcomingTrips.length > 0 || pastTrips.length > 0 ? (
            <div className="space-y-10">
              {upcomingTrips.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      selected={selectedIds.has(trip.id!)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}
              {pastTrips.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[1px] text-n-400">
                    {t("dashboard.pastTrips")}
                  </h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {pastTrips.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        isPast
                        selected={selectedIds.has(trip.id!)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-base text-n-500">{t("dashboard.noTripsMatch")}</p>
            </div>
          )
        ) : (
          <Card className="flex flex-col items-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-brand-gradient-subtle">
              <Compass className="h-8 w-8 text-lavender-400" />
            </div>
            <h3 className="mt-5 font-heading text-[24px] font-bold text-n-900">
              {t("dashboard.emptyTitle")}
            </h3>
            <p className="mt-2 max-w-[360px] text-base leading-relaxed text-n-500">
              {t("dashboard.emptyDesc")}
            </p>
            <Button size="lg" className="mt-6" onClick={() => router.push("/trip/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("dashboard.planNewTrip")}
            </Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
