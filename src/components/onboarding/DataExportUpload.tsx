"use client";

import { useState } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar, useProgressEstimate } from "@/components/ui/progress-bar";
import { useTranslation } from "@/lib/i18n/context";

interface DataExportUploadProps {
  sessionId: string;
  onContentAdded: () => void;
}

type Platform = "instagram" | "tiktok";

const PLATFORM_INFO: Record<
  Platform,
  {
    label: string;
    accept: string;
    steps: string[];
  }
> = {
  instagram: {
    label: "Instagram",
    accept: ".zip,.json",
    steps: [
      "Open Instagram > Settings > Accounts Center",
      'Select "Your information and permissions"',
      'Tap "Download your information"',
      "Choose JSON format, select only Saved posts",
      "Download and upload the ZIP file here",
    ],
  },
  tiktok: {
    label: "TikTok",
    accept: ".zip,.json",
    steps: [
      "Open TikTok > Settings and privacy > Account",
      'Tap "Download your data"',
      "Select JSON as the file format",
      "Request data, then download when ready",
      "Upload the ZIP or JSON file here",
    ],
  },
};

function PlatformExportRow({
  platform,
  sessionId,
  onContentAdded,
}: {
  platform: Platform;
  sessionId: string;
  onContentAdded: () => void;
}) {
  const { t } = useTranslation();
  const STEPS_I18N: Record<Platform, string[]> = {
    instagram: [t("dataExport.igStep1"), t("dataExport.igStep2"), t("dataExport.igStep3"), t("dataExport.igStep4"), t("dataExport.igStep5")],
    tiktok: [t("dataExport.tkStep1"), t("dataExport.tkStep2"), t("dataExport.tkStep3"), t("dataExport.tkStep4"), t("dataExport.tkStep5")],
  };
  const info = PLATFORM_INFO[platform];
  const [uploading, setUploading] = useState(false);
  const importProgress = useProgressEstimate(uploading, 6000);
  const [result, setResult] = useState<{ imported?: number; error?: string } | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);
      formData.append("platform", platform);

      const res = await fetch("/api/content/import-export", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ error: data.error || "Import failed" });
      } else {
        setResult({ imported: data.imported });
        if (data.imported > 0) onContentAdded();
      }
    } catch {
      setResult({ error: "Something went wrong" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-n-700">{platform === "instagram" ? t("dataExport.instagramSavedPosts") : t("dataExport.tiktokSavedPosts")}</p>
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex items-center gap-1 text-[12px] text-n-400 hover:text-lavender-500 transition-colors"
          >
            {showSteps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t("dataExport.howToExport")}
          </button>
        </div>
        <label>
          <input
            type="file"
            accept={info.accept}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-n-200 bg-n-0 px-3.5 py-1.5 text-[13px] font-medium text-n-600 transition-colors hover:bg-n-50 hover:border-lavender-400/30">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? t("dataExport.importing") : t("dataExport.upload")}
          </span>
        </label>
      </div>

      {showSteps && (
        <ol className="ml-1 space-y-1">
          {STEPS_I18N[platform].map((step, i) => (
            <li key={i} className="flex gap-2 text-[12px] text-n-500">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-n-100 text-[10px] font-medium text-n-400">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}

      {uploading && <ProgressBar progress={importProgress} />}
      {result && (
        <div
          className={`flex items-center gap-1.5 text-[12px] ${
            result.error ? "text-rose-500" : "text-emerald-600"
          }`}
        >
          {result.error ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {result.error}
            </>
          ) : (
            <>
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              {t("dataExport.importedItems", { count: result.imported || 0, s: (result.imported || 0) !== 1 ? "s" : "" })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function DataExportUpload({ sessionId, onContentAdded }: DataExportUploadProps) {
  return (
    <div className="space-y-3">
      <PlatformExportRow platform="instagram" sessionId={sessionId} onContentAdded={onContentAdded} />
      <div className="border-t border-n-100" />
      <PlatformExportRow platform="tiktok" sessionId={sessionId} onContentAdded={onContentAdded} />
    </div>
  );
}
