"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useTranslation } from "@/lib/i18n/context";
import { useProfile } from "@/hooks/use-profile";
import { useTrips } from "@/hooks/use-trips";
import { AppLayout } from "@/components/ui/app-layout";
import { TripParamsForm } from "@/components/planning/TripParamsForm";
import { DateRangeCalendar } from "@/components/ui/date-range-calendar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Trip } from "@/types/trip";

export default function NewTripPage() {
  const { sessionId, ready } = useSession();
  const { profile } = useProfile(sessionId);
  const { trips } = useTrips(sessionId);
  const router = useRouter();
  const { t } = useTranslation();

  const existingRegions = trips.flatMap((t) => t.regions);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateMode, setDateMode] = useState<"specific" | "flexible">("specific");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleRangeChange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleSubmit = useCallback(
    async (params: {
      startDate: string;
      endDate: string;
      regions: string[];
      travelParty: string;
      description: string;
    }) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);

      const newTrip: Trip = {
        session_id: sessionId,
        start_date: params.startDate,
        end_date: params.endDate,
        regions: params.regions,
        travel_party: params.travelParty,
        trip_description: params.description,
      };

      const supabase = createClient();
      const { data } = await supabase.from("trips").insert(newTrip).select().single();

      if (data) {
        router.push(`/trip/${data.id}`);
      } else {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [sessionId, router]
  );

  if (!ready) {
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
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> {t("tripNew.backToDashboard")}
          </Button>
        </div>

        <div>
          <h1 className="font-heading text-[26px] font-bold tracking-tight text-n-900 lg:text-[32px]">
            {t("tripNew.title")}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-n-500">
            {t("tripNew.subtitle")}
          </p>
        </div>

        <div className="flex items-start gap-8">
          {/* Left: form */}
          <div className="w-full max-w-xl rounded-[32px] border border-n-200 bg-n-0 p-6 shadow-sm">
            <TripParamsForm
              onSubmit={handleSubmit}
              loading={submitting}
              startDate={startDate}
              endDate={endDate}
              dateMode={dateMode}
              onDateModeChange={setDateMode}
              profile={profile}
              existingRegions={existingRegions}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>

          {/* Right: range calendar (visible on large screens, specific dates mode) */}
          {dateMode === "specific" && (
            <div className="hidden shrink-0 lg:block">
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onRangeChange={handleRangeChange}
              />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
