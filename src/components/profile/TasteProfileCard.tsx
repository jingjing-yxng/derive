"use client";

import { ProfileDimension } from "./ProfileDimension";
import { VibeTags } from "./VibeTags";
import { PROFILE_DIMENSIONS } from "@/types/profile";
import type { TasteProfile, DimensionKey } from "@/types/profile";
import { Loader2, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

const DIMENSION_COLORS: Record<string, string> = {
  adventure: "#7B82C7",
  nature: "#E0949D",
  activity: "#5DB888",
  luxury: "#E4B840",
  cultural: "#5C9AC5",
  social: "#A8A4D8",
};

interface TasteProfileCardProps {
  profile: TasteProfile;
  onDimensionChange: (key: DimensionKey, value: number) => void;
  onTagsChange: (field: keyof TasteProfile, tags: string[]) => void;
  onBudgetChange: (tier: TasteProfile["budget_tier"]) => void;
  saving?: boolean;
  saved?: boolean;
}

export function TasteProfileCard({
  profile,
  onDimensionChange,
  onTagsChange,
  onBudgetChange,
  saving,
  saved,
}: TasteProfileCardProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold uppercase tracking-[0.5px] text-n-500">
          {t("tasteProfile.tasteDimensions")}
        </h3>
        {saving && (
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-amber-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("common.saving")}
          </span>
        )}
        {saved && !saving && (
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-mint-400 animate-saved">
            <Check className="h-3.5 w-3.5" /> {t("common.saved")}
          </span>
        )}
      </div>

      <div className="space-y-5">
        {PROFILE_DIMENSIONS.map((dim) => (
          <ProfileDimension
            key={dim.key}
            label={dim.label}
            description={dim.description}
            value={profile[dim.key]}
            color={DIMENSION_COLORS[dim.key]}
            onChange={(v) => onDimensionChange(dim.key, v)}
          />
        ))}
      </div>

      <div className="space-y-6 border-t border-n-100 pt-5">
        <VibeTags
          label={t("tasteProfile.aestheticStyles")}
          tags={profile.aesthetic_styles}
          onRemove={(tag) =>
            onTagsChange("aesthetic_styles", profile.aesthetic_styles.filter((t) => t !== tag))
          }
          onAdd={(tag) => onTagsChange("aesthetic_styles", [...profile.aesthetic_styles, tag])}
        />
        <VibeTags
          label={t("tasteProfile.cuisineInterests")}
          tags={profile.cuisine_interests}
          onRemove={(tag) =>
            onTagsChange("cuisine_interests", profile.cuisine_interests.filter((t) => t !== tag))
          }
          onAdd={(tag) => onTagsChange("cuisine_interests", [...profile.cuisine_interests, tag])}
        />
        <VibeTags
          label={t("tasteProfile.vibeKeywords")}
          tags={profile.vibe_keywords}
          onRemove={(tag) =>
            onTagsChange("vibe_keywords", profile.vibe_keywords.filter((t) => t !== tag))
          }
          onAdd={(tag) => onTagsChange("vibe_keywords", [...profile.vibe_keywords, tag])}
        />
        <VibeTags
          label={t("tasteProfile.travelThemes")}
          tags={profile.travel_themes}
          onRemove={(tag) =>
            onTagsChange("travel_themes", profile.travel_themes.filter((t) => t !== tag))
          }
          onAdd={(tag) => onTagsChange("travel_themes", [...profile.travel_themes, tag])}
        />
      </div>

      <div className="border-t border-n-100 pt-5">
        <p className="mb-3.5 text-[12px] font-semibold uppercase tracking-[1px] text-n-500">{t("tasteProfile.budgetTier")}</p>
        <div className="flex flex-wrap gap-2">
          {(["budget", "moderate", "luxury", "ultra-luxury"] as const).map((tier) => {
            const isSelected = profile.budget_tier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => onBudgetChange(tier)}
                className={`rounded-full px-3.5 py-[6px] text-[13px] font-medium capitalize transition-colors ${
                  isSelected
                    ? "bg-amber-400 text-white shadow-sm"
                    : "bg-n-100 text-n-600 hover:bg-amber-50 hover:text-amber-600"
                }`}
              >
                {tier}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
