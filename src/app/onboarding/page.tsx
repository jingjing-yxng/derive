"use client";

import { useState, useCallback, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { useTranslation } from "@/lib/i18n/context";
import { UrlInput } from "@/components/onboarding/UrlInput";
import { ContentPreview } from "@/components/onboarding/ContentPreview";
import { DataExportUpload } from "@/components/onboarding/DataExportUpload";
import { Button } from "@/components/ui/button";
import { OnboardingLayout } from "@/components/ui/onboarding-layout";
import { ProgressBar, useProgressEstimate } from "@/components/ui/progress-bar";
import { createClient } from "@/lib/supabase/client";
import type { ContentSource } from "@/types/profile";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  Link,
  Upload,
  Download,
} from "lucide-react";

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}

type InputTab = "link" | "upload" | "import";

function OnboardingContent() {
  const { t } = useTranslation();
  const { sessionId, ready } = useSession();
  const { profile, loading: profileLoading } = useProfile(sessionId);
  const router = useRouter();
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<InputTab>("link");
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateProgress = useProgressEstimate(generating, 12000);
  const uploadProgress = useProgressEstimate(uploading, 3000);

  const forceOnboarding = searchParams.get("force") === "true";

  // Skip onboarding if profile already exists (unless ?force=true)
  useEffect(() => {
    if (ready && !profileLoading && profile && !forceOnboarding) {
      router.replace("/dashboard");
    }
  }, [ready, profileLoading, profile, forceOnboarding, router]);


  const fetchSources = useCallback(async () => {
    if (!sessionId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("content_sources")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (data) setSources(data);
  }, [sessionId]);

  useEffect(() => {
    if (ready) fetchSources();
  }, [ready, fetchSources]);

  const handleRemove = async (id: string) => {
    const supabase = createClient();
    await supabase.from("content_sources").delete().eq("id", id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sessionId);
        await fetch("/api/upload", { method: "POST", body: formData });
      }
      fetchSources();
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateProfile = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate profile");

      router.push("/onboarding/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  };

  const TABS: { key: InputTab; label: string; icon: React.ReactNode }[] = [
    { key: "link", label: t("onboarding.tabPasteLinks"), icon: <Link className="h-3.5 w-3.5" /> },
    { key: "upload", label: t("onboarding.tabUpload"), icon: <Upload className="h-3.5 w-3.5" /> },
    { key: "import", label: t("onboarding.tabImport"), icon: <Download className="h-3.5 w-3.5" /> },
  ];

  return (
    <OnboardingLayout
      totalLabel={t("onboarding.step1of2")}
      title={t("onboarding.showUsTitle")}
      subtitle={t("onboarding.showUsSubtitle")}
    >
      <div className="space-y-5">
        {/* Unified input card with tabs */}
        <Card className="space-y-0 p-0 overflow-hidden">
          {/* Tab row */}
          <div className="flex border-b border-n-100">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-lavender-400 text-lavender-500 bg-lavender-50/30"
                    : "text-n-400 hover:text-n-600 hover:bg-n-50/50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {activeTab === "link" && (
              <UrlInput sessionId={sessionId} onContentAdded={fetchSources} />
            )}

            {activeTab === "upload" && (
              <div className="space-y-2">
                <p className="text-[13px] text-n-500">
                  {t("onboarding.uploadDesc")}
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer items-center gap-3 rounded-[20px] border-2 border-dashed border-lavender-200 px-4 py-3.5 transition-all hover:border-lavender-400/50 hover:bg-lavender-50/30"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-n-100">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-lavender-400" />
                    ) : (
                      <Upload className="h-4 w-4 text-n-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-n-700">
                      {uploading ? t("onboarding.uploading") : t("onboarding.uploadDropText")}
                    </p>
                    {uploading ? (
                      <ProgressBar progress={uploadProgress} className="mt-1" />
                    ) : (
                      <p className="text-[12px] text-n-400">{t("onboarding.uploadFormats")}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "import" && (
              <div className="space-y-3">
                <p className="text-[13px] text-n-500">
                  {t("onboarding.importDesc")}
                </p>
                <DataExportUpload sessionId={sessionId} onContentAdded={fetchSources} />
              </div>
            )}
          </div>
        </Card>

        {/* Mood board -- the focus */}
        {sources.length > 0 && (
          <div>
            <ContentPreview sources={sources} onRemove={handleRemove} />
          </div>
        )}

        {sources.length === 0 && ready && (
          <div className="flex flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-n-200 bg-n-0/50 py-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-brand-gradient-subtle">
              <ImageIcon className="h-5 w-5 text-lavender-400/50" />
            </div>
            <p className="text-[13px] text-n-400">
              {t("onboarding.moodBoardEmpty")}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-[20px] bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="space-y-2 pt-2">
          {generating && <ProgressBar progress={generateProgress} />}
          <div className="flex items-center justify-end gap-3">
            <Button
              size="lg"
              onClick={handleGenerateProfile}
              disabled={generating || sources.length === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("onboarding.analyzingStyle")}
                </>
              ) : (
                <>
                  {t("onboarding.generateProfile")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
