"use client";

import { useState } from "react";
import { X, Image as ImageIcon, Link, ExternalLink, RefreshCw } from "lucide-react";
import { ProgressBar, useProgressEstimate } from "@/components/ui/progress-bar";
import { detectPlatform, getPlatformLabel, isInstagramProfile, isPinterestBoard } from "@/lib/content/detect-platform";
import type { ContentSource } from "@/types/profile";

interface ContentPreviewProps {
  sources: ContentSource[];
  onRemove: (id: string) => void;
  onRetryExtract?: (id: string) => Promise<void>;
}

function deriveSourceLabel(source: ContentSource): string {
  if (source.source_type === "uploaded_image") return "Screenshot";

  const platform = detectPlatform(source.source_url);

  if (platform === "pinterest" && source.source_url) {
    try {
      const segments = new URL(source.source_url).pathname.split("/").filter(Boolean);
      if (segments[0] !== "pin" && segments.length >= 2) {
        const boardName = segments[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `Pinterest - ${boardName}`;
      }
    } catch {
      // fall through
    }
    return "Pinterest";
  }

  if (platform === "instagram" && source.source_url) {
    try {
      const segments = new URL(source.source_url).pathname.split("/").filter(Boolean);
      if (isInstagramProfile(source.source_url) && segments[0]) {
        return `@${segments[0]}`;
      }
    } catch {
      // fall through
    }
    return "Instagram";
  }

  return getPlatformLabel(source.source_url);
}

function ImageCollage({
  images,
  label,
  url,
}: {
  images: string[];
  label: string;
  url: string;
}) {
  const displayImages = images.slice(0, 9);
  const count = displayImages.length;

  if (count <= 1) return null;

  const cols = count <= 2 ? 2 : count <= 4 ? 2 : 3;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {displayImages.map((img, i) => (
          <div key={i} className="relative aspect-square overflow-hidden bg-n-100">
            <img
              src={img}
              alt={`${label} photo ${i + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </a>
  );
}

function RetryCard({
  label,
  url,
  onRetry,
}: {
  label: string;
  url: string;
  onRetry: () => Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);
  const retryProgress = useProgressEstimate(retrying, 5000);

  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-n-100 p-5 text-center"
    >
      <ImageIcon className="h-8 w-8 text-n-300" />
      <span className="text-[14px] font-medium text-n-600">{label}</span>
      {retrying ? (
        <div className="w-full px-4">
          <ProgressBar progress={retryProgress} />
        </div>
      ) : (
        <button
          onClick={handleRetry}
          className="flex items-center gap-1.5 rounded-full bg-n-200 px-3 py-1.5 text-[12px] font-medium text-n-600 transition-colors hover:bg-n-300"
        >
          <RefreshCw className="h-3 w-3" />
          Retry extraction
        </button>
      )}
    </a>
  );
}

/** Extract the Instagram username from a URL */
function extractInstagramUsername(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    if (segments.length >= 1 && !["p", "reel", "stories", "explore", "accounts"].includes(segments[0])) {
      return segments[0];
    }
  } catch {}
  return null;
}

/**
 * Instagram embed card — shows only the photo grid from the Instagram embed.
 * Uses a scaled-up iframe shifted upward to crop out the profile header,
 * so the user sees a 3×3 photo grid similar to Pinterest board previews.
 */
function InstagramEmbedCard({
  username,
  url,
}: {
  username: string;
  url: string;
  onRetry?: () => Promise<void>;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-lavender-100 via-rose-50 to-mint-50"
    >
      <p className="text-[15px] font-semibold text-n-600">@{username}</p>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-lavender-200/60 to-transparent px-2.5 pb-2 pt-5">
        <div className="flex items-center gap-1.5">
          <ExternalLink className="h-2.5 w-2.5 text-n-500" />
          <span className="truncate text-xs font-medium text-n-600">Instagram</span>
        </div>
      </div>
    </a>
  );
}

export function ContentPreview({ sources, onRemove, onRetryExtract }: ContentPreviewProps) {
  if (sources.length === 0) return null;

  return (
    <div className="columns-2 gap-3 lg:columns-3">
      {sources.map((source) => {
        const label = deriveSourceLabel(source);
        const isLink = source.source_type !== "uploaded_image" && source.source_url;
        const platform = detectPlatform(source.source_url);
        const isIgProfile =
          platform === "instagram" &&
          source.source_url &&
          isInstagramProfile(source.source_url);
        const isPinBoard =
          platform === "pinterest" &&
          source.source_url &&
          isPinterestBoard(source.source_url);
        const hasMultipleImages = (source.extracted_image_urls?.length || 0) > 1;
        const showCollage = (isIgProfile || isPinBoard) && hasMultipleImages;
        const hasImage = !!source.extracted_image_urls?.[0];

        return (
          <div
            key={source.id}
            className="group relative mb-3 break-inside-avoid overflow-hidden rounded-[20px] shadow-md"
          >
            {/* Multi-image sources (boards, profiles): show collage */}
            {showCollage ? (
              <ImageCollage
                images={source.extracted_image_urls}
                label={label}
                url={source.source_url!}
              />
            ) : hasImage && isLink ? (
              <a
                href={source.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={source.extracted_image_urls[0]}
                  alt={label}
                  className="w-full h-auto"
                />
              </a>
            ) : hasImage ? (
              <img
                src={source.extracted_image_urls[0]}
                alt={label}
                className="w-full h-auto"
              />
            ) : isIgProfile && source.source_url ? (
              <InstagramEmbedCard
                username={extractInstagramUsername(source.source_url) || ""}
                url={source.source_url}
                onRetry={onRetryExtract && source.id ? () => onRetryExtract(source.id!) : undefined}
              />
            ) : onRetryExtract && source.id ? (
              <RetryCard
                label={label}
                url={source.source_url || "#"}
                onRetry={() => onRetryExtract(source.id!)}
              />
            ) : isLink ? (
              <a
                href={source.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-[4/5] items-center justify-center bg-n-100"
              >
                <Link className="h-8 w-8 text-n-300" />
              </a>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-n-100">
                <ImageIcon className="h-8 w-8 text-n-300" />
              </div>
            )}

            {/* Remove button */}
            <div className="absolute inset-0 z-20 flex items-start justify-end p-1.5 pointer-events-none">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  source.id && onRemove(source.id);
                }}
                className="pointer-events-auto rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Source label — hide for IG profile fallback (username already in card) */}
            {!(isIgProfile && !hasImage) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2.5 pb-2 pt-5">
                <div className="flex items-center gap-1.5">
                  {isLink && <ExternalLink className="h-2.5 w-2.5 text-white/70" />}
                  <span className="truncate text-xs font-medium text-white">
                    {label}
                  </span>
                </div>
              </div>
            )}

            {source.status === "processing" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 pointer-events-none">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-lavender-400 border-t-transparent" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
