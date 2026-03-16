"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { useAutoSave } from "@/hooks/use-auto-save";
import { AppLayout } from "@/components/ui/app-layout";
import { TasteProfileCard } from "@/components/profile/TasteProfileCard";
import { ContentPreview } from "@/components/onboarding/ContentPreview";
import { DataExportUpload } from "@/components/onboarding/DataExportUpload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { ContentSource, TasteProfile, DimensionKey } from "@/types/profile";
import { Loader2, RefreshCw, Link, Upload, ImageIcon, Sparkles, ChevronDown, ChevronUp, RotateCcw, Info } from "lucide-react";
import { ProgressBar, useProgressEstimate } from "@/components/ui/progress-bar";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/context";
import { detectPlatform, getPlatformLabel } from "@/lib/content/detect-platform";

function renderBoldMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.*)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold text-n-900">{bold[1]}</strong>;
    return <span key={i}>{part}</span>;
  });
}

function buildSourceSummary(sources: ContentSource[]): string {
  const platforms = new Set<string>();
  for (const s of sources) {
    if (s.source_type === "uploaded_image") {
      platforms.add("your uploads");
    } else {
      const p = detectPlatform(s.source_url);
      if (p === "unknown") platforms.add("your saved links");
      else platforms.add(getPlatformLabel(s.source_url));
    }
  }

  const names = [...platforms];
  if (names.length === 0) return "";
  if (names.length === 1) return `Based on ${names[0]}`;
  const last = names.pop();
  return `Based on ${names.join(", ")} and ${last}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sessionId, ready } = useSession();
  const { profile, loading, fetchProfile, updateProfile } = useProfile(sessionId);
  const [sources, setSources] = useState<ContentSource[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const regenProgress = useProgressEstimate(regenerating, 12000);

  // Compact URL input state
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const extractProgress = useProgressEstimate(extracting, 6000);
  const [urlError, setUrlError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport] = useState(false);

  // Auto-save for profile
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

  const handleExtractUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setExtracting(true);
    setUrlError("");
    try {
      const res = await fetch("/api/content/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), sessionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extract");
      }
      setUrl("");
      fetchSources();
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);
      await fetch("/api/upload", { method: "POST", body: formData });
    }
    fetchSources();
  };

  const handleRetryExtract = async (sourceId: string) => {
    const res = await fetch("/api/content/re-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    if (res.ok) {
      await fetchSources();
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/profile/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) await fetchProfile();
    } finally {
      setRegenerating(false);
    }
  };

  const handleDimensionChange = (key: DimensionKey, value: number) => {
    setLiveProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleTagsChange = (field: keyof TasteProfile, tags: string[]) => {
    setLiveProfile((prev) => (prev ? { ...prev, [field]: tags } : prev));
  };

  const handleBudgetChange = (tier: TasteProfile["budget_tier"]) => {
    setLiveProfile((prev) => (prev ? { ...prev, budget_tier: tier } : prev));
  };

  if (!ready || loading) {
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
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Left column: input bar + mood board */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Compact input bar */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <form onSubmit={handleExtractUrl} className="flex flex-1 items-center gap-2 rounded-[24px] border-[1.5px] border-n-200 bg-n-0 px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-lavender-400/40 focus-within:border-lavender-400 transition-all">
              <Link className="h-4 w-4 shrink-0 text-n-400" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t("profilePage.urlPlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-base text-n-900 placeholder:text-n-400 outline-none"
                disabled={extracting}
              />
              <Button type="submit" size="sm" disabled={extracting || !url.trim()}>
                {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("profilePage.extract")}
              </Button>
            </form>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex shrink-0 items-center justify-center gap-2 rounded-[24px] border-[1.5px] border-n-200 bg-n-0 px-4 py-2.5 text-sm font-medium text-n-500 shadow-sm transition-colors hover:bg-lavender-50 hover:text-n-900"
            >
              <Upload className="h-4 w-4" />
              {t("profilePage.uploadPhotos")}
            </button>
            <button
              type="button"
              onClick={() => setShowImport(!showImport)}
              className={`flex shrink-0 items-center justify-center gap-2 rounded-[24px] border-[1.5px] px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
                showImport
                  ? "border-lavender-400/40 bg-lavender-50 text-lavender-600"
                  : "border-n-200 bg-n-0 text-n-500 hover:bg-lavender-50 hover:text-n-900"
              }`}
            >
              {showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {t("profilePage.connectSocials")}
            </button>
          </div>

          {extracting && <ProgressBar progress={extractProgress} className="px-1" />}
          {urlError && (
            <p className="rounded-[16px] bg-rose-50 px-3 py-2 text-sm text-rose-600">{urlError}</p>
          )}

          {/* Connect your socials expanded */}
          {showImport && (
            <div className="rounded-[20px] border-[1.5px] border-n-200 bg-n-0 px-5 py-4 shadow-sm space-y-3">
              <DataExportUpload sessionId={sessionId} onContentAdded={fetchSources} />
            </div>
          )}

          {/* Mood board */}
          {sources.length > 0 ? (
            <div>
              <div className="mb-4">
                <h2 className="font-heading text-[26px] font-semibold text-n-900">{t("profilePage.yourMoodBoard")}</h2>
                <p className="mt-1 text-sm text-n-500">{t("profilePage.moodBoardDesc")}</p>
              </div>
              <ContentPreview sources={sources} onRemove={handleRemove} onRetryExtract={handleRetryExtract} />

              {/* Profile explanation + regenerate */}
              <div className="mt-5 flex flex-col items-center gap-2">
                {typeof profile?.raw_analysis?.summary === "string" && (
                  <div className="flex w-full items-start gap-3 rounded-[20px] bg-lavender-50 px-4 py-4">
                    <Sparkles className="mt-1 h-4 w-4 shrink-0 text-lavender-400" />
                    <p className="text-base leading-[1.6] text-n-600">
                      <span className="font-semibold text-n-900">{buildSourceSummary(sources)}: </span>
                      {renderBoldMarkdown(profile.raw_analysis.summary)}
                    </p>
                  </div>
                )}
                {regenerating && <ProgressBar progress={regenProgress} className="w-full mb-2" />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={regenerating || sources.length === 0}
                >
                  {regenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t("profilePage.regenerateProfile")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-n-200 bg-n-0/50 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-brand-gradient-subtle">
                <ImageIcon className="h-6 w-6 text-lavender-400/50" />
              </div>
              <p className="text-sm font-medium text-n-500">{t("profilePage.moodBoardEmpty")}</p>
              <p className="max-w-xs text-[13px] text-n-400">
                {t("profilePage.moodBoardEmptyDesc")}
              </p>
            </div>
          )}
        </div>

        {/* Right column: sticky taste profile */}
        {liveProfile && (
          <div className="w-full shrink-0 lg:sticky lg:top-28 lg:w-[380px]">
            <Card className="space-y-0">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-[26px] font-semibold text-n-900">
                  {t("profilePage.yourTasteProfile")}
                </h2>
                <div className="group relative">
                  <Info className="h-4 w-4 text-n-300 cursor-help transition-colors group-hover:text-n-500" />
                  <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-64 rounded-[16px] border border-n-200 bg-n-0 px-4 py-3 text-[13px] leading-relaxed text-n-500 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {t("profilePage.tasteProfileTooltip")}
                  </div>
                </div>
              </div>
              <TasteProfileCard
                profile={liveProfile}
                onDimensionChange={handleDimensionChange}
                onTagsChange={handleTagsChange}
                onBudgetChange={handleBudgetChange}
                saving={saving}
                saved={saved}
              />
            </Card>
            <button
              onClick={() => router.push("/onboarding?force=true")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium text-n-400 transition-colors hover:bg-n-100 hover:text-n-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("profilePage.redoOnboarding")}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
