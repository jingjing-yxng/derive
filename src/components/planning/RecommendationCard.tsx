"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Loader2, Bookmark, ChevronDown, X, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Recommendation, DayPlan } from "@/types/trip";

interface AttractionInfo {
  name: string;
  summary: string;
  why: string;
  sources: { title: string; url: string }[];
  images: string[];
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onSelect?: (name: string) => void;
  loadingName?: string | null;
  isSaved?: boolean;
  onSave?: () => void;
  onAddToDay?: (dayIndex: number) => void;
  itineraryDays?: DayPlan[];
  sessionId?: string;
  regions?: string[];
}

// localStorage helpers for feedback
function getFeedbackKey(attraction: string, destination: string) {
  return `attraction-feedback:${destination}:${attraction}`;
}
function getSavedVote(attraction: string, destination: string): number | null {
  try {
    const v = localStorage.getItem(getFeedbackKey(attraction, destination));
    return v ? Number(v) : null;
  } catch { return null; }
}
function saveVote(attraction: string, destination: string, vote: number) {
  try { localStorage.setItem(getFeedbackKey(attraction, destination), String(vote)); } catch {}
}

// Get all feedback for injection into prompts
export function getAllFeedback(): { name: string; vote: number }[] {
  try {
    const feedback: { name: string; vote: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("attraction-feedback:")) {
        const name = key.split(":").slice(2).join(":");
        const vote = Number(localStorage.getItem(key));
        if (vote) feedback.push({ name, vote });
      }
    }
    return feedback;
  } catch { return []; }
}

function AttractionPanel({
  highlight,
  destination,
  sessionId,
  regions,
  onClose,
}: {
  highlight: string;
  destination: string;
  sessionId?: string;
  regions?: string[];
  onClose: () => void;
}) {
  const [data, setData] = useState<AttractionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [vote, setVote] = useState<number | null>(() => getSavedVote(highlight, destination));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const params = new URLSearchParams({ name: highlight, destination });
        if (sessionId) params.set("sessionId", sessionId);
        if (regions?.length) params.set("regions", regions.join(","));
        const res = await fetch(`/api/attraction?${params}`);
        if (res.ok) setData(await res.json());
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, [highlight, destination, sessionId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleVote = (v: number) => {
    const newVote = vote === v ? null : v;
    setVote(newVote);
    if (newVote !== null) {
      saveVote(highlight, destination, newVote);
    } else {
      try { localStorage.removeItem(getFeedbackKey(highlight, destination)); } catch {}
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-n-900/20 backdrop-blur-[2px]" />
      {/* Panel */}
      <div
        ref={panelRef}
        className="relative my-2 flex h-[calc(100vh-48px)] w-full max-w-md animate-slide-in-right flex-col overflow-hidden rounded-[28px] border border-n-200 bg-n-0 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-n-200 px-6 py-4">
          <h3 className="font-heading text-lg font-semibold text-n-900 pr-4">
            {highlight}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-n-400 hover:bg-n-100 hover:text-n-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-n-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading attraction info...</span>
            </div>
          ) : data ? (
            <div className="space-y-5">
              {/* Images */}
              {data.images.length > 0 && (
                <div className={`grid gap-2 ${data.images.length === 1 ? "grid-cols-1" : data.images.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                  {data.images.slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${highlight} photo ${i + 1}`}
                      className={`w-full rounded-[16px] object-cover bg-n-100 ${
                        data.images.length === 3 && i === 0 ? "col-span-2 h-48" : "h-36"
                      }`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Summary */}
              {data.summary && (
                <p className="text-[15px] leading-relaxed text-n-700">
                  {data.summary}
                </p>
              )}

              {/* Why selected — personalized */}
              {data.why && (
                <div className="rounded-[14px] bg-lavender-50 px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[1px] text-lavender-400">
                    Why this matches you
                  </p>
                  <p className="text-[13px] leading-relaxed text-lavender-600">
                    {data.why}
                  </p>
                </div>
              )}

              {/* Sources */}
              {data.sources.length > 0 && (
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-[1px] text-n-400">
                    Sources
                  </p>
                  <div className="space-y-1.5">
                    {data.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-n-600 transition-colors hover:bg-n-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-n-400" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-n-400">
              Could not load attraction info.
            </p>
          )}
        </div>

        {/* Feedback footer — always visible */}
        {!loading && data && (
          <div className="border-t border-n-200 px-6 py-4">
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[1px] text-n-400">
              Was this a good suggestion?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleVote(1)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-medium transition-colors ${
                  vote === 1
                    ? "bg-mint-50 text-mint-600 border-[1.5px] border-mint-300"
                    : "border-[1.5px] border-n-200 text-n-500 hover:border-mint-300 hover:text-mint-600"
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${vote === 1 ? "fill-current" : ""}`} />
                {vote === 1 ? "Liked" : "More like this"}
              </button>
              <button
                onClick={() => handleVote(-1)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-medium transition-colors ${
                  vote === -1
                    ? "bg-rose-50 text-rose-500 border-[1.5px] border-rose-300"
                    : "border-[1.5px] border-n-200 text-n-500 hover:border-rose-300 hover:text-rose-500"
                }`}
              >
                <ThumbsDown className={`h-4 w-4 ${vote === -1 ? "fill-current" : ""}`} />
                {vote === -1 ? "Noted" : "Not for me"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

import { stripMarkdown } from "@/lib/strip-markdown";

export function RecommendationCard({
  recommendation,
  onSelect,
  loadingName,
  isSaved,
  onSave,
  onAddToDay,
  itineraryDays,
  sessionId,
  regions,
}: RecommendationCardProps) {
  const isThisLoading = loadingName === recommendation.name;
  const isAnyLoading = !!loadingName;
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const handleClosePanel = useCallback(() => setActiveHighlight(null), []);

  return (
    <>
      <Card className="space-y-2 overflow-hidden rounded-[16px] p-0 transition-all hover:shadow-lg">
        <div className="h-1 bg-brand-gradient opacity-50" />
        <div className="space-y-2.5 px-4 pb-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-[15px] font-semibold text-n-900">
              {recommendation.name}
            </h3>
            <div className="flex items-center gap-1.5">
              {onSave && (
                <button
                  onClick={onSave}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors ${
                    isSaved
                      ? "border-lavender-300 bg-lavender-100 text-lavender-600"
                      : "border-n-300 bg-n-0 text-n-500 hover:border-lavender-300 hover:bg-lavender-50 hover:text-lavender-600"
                  }`}
                  title={isSaved ? "Remove from saved" : "Save idea"}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved" : "Save"}
                </button>
              )}
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 text-[12px] font-semibold text-mint-600">
                <Star className="h-3.5 w-3.5" />
                {recommendation.vibe_match}%
              </div>
            </div>
          </div>

          <p className="text-[13px] leading-snug text-n-600 line-clamp-2">
            {stripMarkdown(recommendation.description)}
          </p>

          {/* Highlight tags — clickable */}
          <div className="flex flex-wrap gap-1">
            {recommendation.highlights.map((h) => (
              <button
                key={h}
                onClick={() => setActiveHighlight(h)}
                className="rounded-full bg-n-100 px-2.5 py-[3px] text-[12px] font-medium text-n-600 border border-transparent transition-colors hover:border-lavender-400 hover:text-lavender-600 hover:bg-lavender-50"
              >
                {h}
              </button>
            ))}
          </div>

          {/* Trip theme + budget */}
          <div className="flex items-center gap-2 rounded-[10px] bg-n-50 px-3 py-2 text-[12px]">
            <span className="flex items-center gap-1 text-n-500">
              <MapPin className="h-3 w-3 shrink-0" />
              {stripMarkdown(recommendation.best_for)}
            </span>
            <span className="text-n-200">|</span>
            <span className="font-medium text-amber-600">{recommendation.estimated_budget}</span>
          </div>

          {onSelect && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onSelect(recommendation.name)}
                disabled={isAnyLoading}
              >
                {isThisLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Planning...
                  </>
                ) : (
                  "Plan this trip"
                )}
              </Button>

              {onAddToDay && itineraryDays && itineraryDays.length > 0 && (
                <div className="relative">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDayPicker(!showDayPicker)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  {showDayPicker && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-[20px] border border-n-200 bg-n-0 py-1.5 shadow-lg">
                      <p className="px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[1px] text-n-400">Add to day</p>
                      {itineraryDays.map((day, i) => (
                        <button
                          key={day.day}
                          onClick={() => {
                            onAddToDay(i);
                            setShowDayPicker(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-n-700 hover:bg-lavender-50 transition-colors"
                        >
                          Day {day.day}: {day.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {activeHighlight && (
        <AttractionPanel
          highlight={activeHighlight}
          destination={recommendation.name}
          sessionId={sessionId}
          regions={regions}
          onClose={handleClosePanel}
        />
      )}
    </>
  );
}
