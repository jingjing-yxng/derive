"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { useAutoSave } from "@/hooks/use-auto-save";
import { TasteProfileCard } from "@/components/profile/TasteProfileCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingLayout } from "@/components/ui/onboarding-layout";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { TasteProfile, DimensionKey } from "@/types/profile";

export default function OnboardingProfilePage() {
  const { sessionId, ready } = useSession();
  const { profile, loading, updateProfile } = useProfile(sessionId);
  const router = useRouter();
  const { t } = useTranslation();

  const {
    value: liveProfile,
    setValue: setLiveProfile,
    saving,
    saved,
  } = useAutoSave<TasteProfile | null>(
    profile,
    async (val) => {
      if (val) await updateProfile(val);
    },
    800
  );

  if (!ready || loading) {
    return (
      <OnboardingLayout title={t("onboardingProfile.loadingProfile")}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OnboardingLayout>
    );
  }

  if (!profile || !liveProfile) {
    return (
      <OnboardingLayout title={t("onboardingProfile.noProfileFound")}>
        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-n-200 bg-n-0/50 py-16 text-center">
          <p className="text-n-500">{t("onboardingProfile.generateFirst")}</p>
          <Button onClick={() => router.push("/onboarding")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("onboardingProfile.goToContent")}
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      totalLabel={t("onboarding.step2of2")}
      title={t("onboardingProfile.title")}
      subtitle={t("onboardingProfile.subtitle")}
    >
      <div className="max-w-2xl space-y-6">
        <Card>
          <TasteProfileCard
            profile={liveProfile}
            onDimensionChange={(key, value) =>
              setLiveProfile((prev) => (prev ? { ...prev, [key]: value } : prev))
            }
            onTagsChange={(field, tags) =>
              setLiveProfile((prev) => (prev ? { ...prev, [field]: tags } : prev))
            }
            onBudgetChange={(tier) =>
              setLiveProfile((prev) => (prev ? { ...prev, budget_tier: tier } : prev))
            }
            saving={saving}
            saved={saved}
          />
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={() => router.push("/onboarding")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> {t("common.back")}
          </Button>
          <Button size="lg" onClick={() => router.push("/dashboard")}>
            {t("onboardingProfile.goToDashboard")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
