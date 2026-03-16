"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Calendar, Users, Plane, ArrowRight, Sparkles, Wallet } from "lucide-react";
import { formatDateRange } from "@/lib/dates";
import type { TasteProfile } from "@/types/profile";

interface TripParams {
  startDate: string;
  endDate: string;
  flexibleDates: string;
  regions: string[];
  travelParty: string;
  description: string;
}

interface TripParamsFormProps {
  onSubmit: (params: TripParams) => void;
  loading?: boolean;
  startDate: string;
  endDate: string;
  dateMode: "specific" | "flexible";
  onDateModeChange: (mode: "specific" | "flexible") => void;
  profile?: TasteProfile | null;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  existingRegions?: string[];
}

function generateRegionSuggestions(profile: TasteProfile): string[] {
  const suggestions: string[] = [];
  const { cultural, luxury, nature, adventure, social } = profile;

  if (cultural >= 7 && luxury >= 7) {
    suggestions.push("Kyoto, Japan", "Florence, Italy", "Istanbul, Turkey");
  } else if (nature >= 7 && adventure >= 7) {
    suggestions.push("Patagonia", "Iceland", "New Zealand");
  } else if (social >= 7 && luxury >= 5) {
    suggestions.push("Barcelona, Spain", "Bali, Indonesia", "Lisbon, Portugal");
  } else if (cultural >= 7 && nature >= 6) {
    suggestions.push("Peru", "Vietnam", "Morocco");
  } else if (luxury >= 8) {
    suggestions.push("Santorini, Greece", "Maldives", "Swiss Alps");
  } else if (adventure >= 6 && nature >= 6) {
    suggestions.push("Costa Rica", "Norway", "Colombia");
  } else {
    suggestions.push("Portugal", "Thailand", "Japan");
  }

  return suggestions.slice(0, 3);
}

export function TripParamsForm({
  onSubmit,
  loading,
  startDate,
  endDate,
  dateMode,
  onDateModeChange,
  profile,
  onStartDateChange,
  onEndDateChange,
  existingRegions = [],
}: TripParamsFormProps) {
  const { t } = useTranslation();

  const [flexibleDates, setFlexibleDates] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [travelParty, setTravelParty] = useState("");
  const [description, setDescription] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [showBrainstorm, setShowBrainstorm] = useState(false);
  const [budgetTier, setBudgetTier] = useState<string>(
    () => profile?.budget_tier || ""
  );

  const regionSuggestions = profile
    ? generateRegionSuggestions(profile).filter((suggestion) => {
        const s = suggestion.toLowerCase();
        return !existingRegions.some((existing) => {
          const e = existing.toLowerCase();
          return s.includes(e) || e.includes(s);
        });
      })
    : [];

  const addRegion = () => {
    if (regionInput.trim() && !regions.includes(regionInput.trim())) {
      setRegions((r) => [...r, regionInput.trim()]);
      setRegionInput("");
    }
  };

  const removeRegion = (region: string) => {
    setRegions((r) => r.filter((v) => v !== region));
  };

  const addSuggestedRegion = (region: string) => {
    if (!regions.includes(region)) {
      setRegions((r) => [...r, region]);
    }
  };

  const datesValid =
    dateMode === "flexible"
      ? flexibleDates.trim().length > 0
      : startDate && endDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (datesValid && regions.length > 0) {
      const budgetText = budgetTier ? `Budget preference: ${budgetTier}` : "";
      const fullDescription = [description, budgetText].filter(Boolean).join(". ");

      if (dateMode === "flexible") {
        onSubmit({
          startDate: flexibleDates,
          endDate: flexibleDates,
          flexibleDates,
          regions,
          travelParty,
          description: fullDescription,
        });
      } else {
        onSubmit({
          startDate,
          endDate,
          flexibleDates: "",
          regions,
          travelParty,
          description: fullDescription,
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-sm font-medium text-n-900">
            <Calendar className="h-4 w-4 text-lavender-400" /> {t("tripNew.when")}
          </label>
          <div className="flex rounded-full bg-n-100 p-[3px]">
            <button
              type="button"
              onClick={() => onDateModeChange("specific")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                dateMode === "specific"
                  ? "bg-n-0 text-n-900 shadow-sm"
                  : "text-n-500 hover:text-n-900"
              }`}
            >
              {t("tripNew.exactDates")}
            </button>
            <button
              type="button"
              onClick={() => onDateModeChange("flexible")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                dateMode === "flexible"
                  ? "bg-n-0 text-n-900 shadow-sm"
                  : "text-n-500 hover:text-n-900"
              }`}
            >
              {t("tripNew.flexible")}
            </button>
          </div>
        </div>

        {dateMode === "specific" ? (
          <>
            {/* Mobile: native date inputs */}
            <div className="grid grid-cols-2 gap-4 lg:hidden">
              <div className="space-y-1">
                <span className="text-sm text-n-400">{t("tripNew.start")}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange?.(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex h-11 w-full items-center rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 text-base text-n-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400/40 focus-visible:border-lavender-400"
                />
              </div>
              <div className="space-y-1">
                <span className="text-sm text-n-400">{t("tripNew.end")}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange?.(e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  className="flex h-11 w-full items-center rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 text-base text-n-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400/40 focus-visible:border-lavender-400"
                />
              </div>
            </div>
            {/* Desktop: display-only boxes (calendar selects dates) */}
            <div className="hidden grid-cols-2 gap-4 lg:grid">
              <div className="space-y-1">
                <span className="text-sm text-n-400">{t("tripNew.start")}</span>
                <div className="flex h-11 items-center gap-2.5 rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 text-base">
                  <Calendar className="h-4 w-4 text-n-400" />
                  {startDate ? (
                    <span className="text-n-900">{formatDateRange(startDate, startDate)}</span>
                  ) : (
                    <span className="text-n-400">{t("tripNew.selectOnCalendar")}</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-n-400">{t("tripNew.end")}</span>
                <div className="flex h-11 items-center gap-2.5 rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 text-base">
                  <Calendar className="h-4 w-4 text-n-400" />
                  {endDate ? (
                    <span className="text-n-900">{formatDateRange(endDate, endDate)}</span>
                  ) : (
                    <span className="text-n-400">{t("tripNew.selectOnCalendar")}</span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <Input
            value={flexibleDates}
            onChange={(e) => setFlexibleDates(e.target.value)}
            placeholder={t("tripNew.flexiblePlaceholder")}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-n-900">
          <MapPin className="h-4 w-4 text-rose-400" /> {t("tripNew.regions")}
        </label>
        <p className="text-sm text-n-400">
          {t("tripNew.regionsDesc")}
        </p>
        {regions.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {regions.map((region) => (
              <span
                key={region}
                className="inline-flex items-center gap-1.5 rounded-full bg-lavender-400 px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
              >
                {region}
                <button
                  onClick={() => removeRegion(region)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={regionInput}
            onChange={(e) => setRegionInput(e.target.value)}
            placeholder={t("tripNew.addRegionPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRegion();
              }
            }}
          />
          <Button type="button" onClick={addRegion}>
            {t("common.add")}
          </Button>
        </div>

        {/* Brainstorm for me */}
        {profile && regionSuggestions.length > 0 && (
          <div className="ml-3 space-y-2">
            <button
              type="button"
              onClick={() => setShowBrainstorm((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-lavender-400 hover:text-lavender-500 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("tripNew.brainstormForMe")}
            </button>
            {showBrainstorm && (
              <div className="flex flex-wrap gap-2">
                {regionSuggestions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => addSuggestedRegion(r)}
                    disabled={regions.includes(r)}
                    className="rounded-full border-[1.5px] border-lavender-400/30 bg-lavender-50 px-3.5 py-1.5 text-[13px] font-medium text-lavender-500 transition-colors hover:bg-lavender-100 disabled:opacity-40"
                  >
                    + {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-n-900">
          <Users className="h-4 w-4 text-mint-400" /> {t("tripNew.travelParty")}
        </label>
        <Input
          value={travelParty}
          onChange={(e) => setTravelParty(e.target.value)}
          placeholder={t("tripNew.travelPartyPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-n-900">
          <Wallet className="h-4 w-4 text-amber-400" /> {t("tripNew.budgetLabel")}
        </label>
        <p className="text-sm text-n-400">{t("tripNew.budgetDesc")}</p>
        <div className="flex flex-wrap gap-2">
          {(["budget", "moderate", "luxury", "ultra-luxury"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setBudgetTier((prev) => (prev === tier ? "" : tier))}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                budgetTier === tier
                  ? "bg-amber-400 text-white shadow-sm"
                  : "border-[1.5px] border-n-200 bg-n-0 text-n-500 hover:bg-amber-50 hover:text-amber-600"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-n-900">
          <Plane className="h-4 w-4 text-sky-400" /> {t("tripNew.anythingElse")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("tripNew.anythingElsePlaceholder")}
          rows={2}
          className="flex w-full rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 py-3 text-base text-n-900 placeholder:text-n-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400/40 focus-visible:border-lavender-400"
        />
      </div>

      <div className="border-t border-n-200 pt-5">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !datesValid || regions.length === 0}
        >
          {loading ? t("tripNew.planning") : t("tripNew.getRecommendations")}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
