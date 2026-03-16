"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Link, Loader2 } from "lucide-react";

interface UrlInputProps {
  sessionId: string;
  onContentAdded: () => void;
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export function UrlInput({ sessionId, onContentAdded }: UrlInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Split by newlines and filter valid URLs
    const urls = input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (urls.length === 0) return;

    // Validate all URLs
    const invalidUrls = urls.filter((u) => !isValidUrl(u));
    if (invalidUrls.length > 0) {
      setError(
        urls.length === 1
          ? "Please enter a valid URL"
          : `${invalidUrls.length} invalid URL${invalidUrls.length > 1 ? "s" : ""} found. Make sure each line has a complete URL.`
      );
      return;
    }

    setLoading(true);
    setError("");
    setProgress({ done: 0, total: urls.length });

    let succeeded = 0;
    let lastError = "";

    // Process URLs in parallel batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const res = await fetch("/api/content/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, sessionId }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to extract content");
          }
          return res.json();
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          succeeded++;
        } else {
          lastError = result.reason?.message || "Failed to extract";
        }
      }

      setProgress({ done: i + batch.length, total: urls.length });
    }

    if (succeeded > 0) {
      setInput("");
      onContentAdded();
    }

    if (succeeded === 0) {
      setError(lastError || "Failed to extract any content");
    } else if (succeeded < urls.length) {
      setError(
        `Extracted ${succeeded} of ${urls.length} URLs. Some failed to process.`
      );
    }

    setProgress(null);
    setLoading(false);
  };

  const urlCount = input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;

  const isMultiLine = input.includes("\n") || urlCount > 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-[13px] text-n-500">
        Paste links to your favorite travel content. You can add multiple URLs, one per line.
      </p>
      <div className={isMultiLine ? "space-y-2" : "flex gap-2"}>
        <div className={`relative ${isMultiLine ? "" : "flex-1"}`}>
          <Link
            className={`absolute left-3.5 ${isMultiLine ? "top-3.5" : "top-1/2 -translate-y-1/2"} h-4 w-4 text-n-400`}
          />
          {isMultiLine ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"Paste URLs here, one per line...\nhttps://pinterest.com/...\nhttps://instagram.com/..."}
              className="w-full rounded-[20px] border-[1.5px] border-n-200 bg-n-0 py-3 pl-10 pr-4 text-base text-n-900 placeholder:text-n-400 outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-400/40 transition-all resize-none"
              rows={Math.min(urlCount + 1, 6)}
              disabled={loading}
            />
          ) : (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste any link — Pinterest, Instagram, TikTok, RedNote..."
              className="w-full rounded-[20px] border-[1.5px] border-n-200 bg-n-0 py-3 pl-10 pr-4 text-base text-n-900 placeholder:text-n-400 outline-none focus:border-lavender-400 focus:ring-2 focus:ring-lavender-400/40 transition-all"
              disabled={loading}
            />
          )}
        </div>
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className={isMultiLine ? "w-full" : ""}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {progress
                ? `${progress.done}/${progress.total}`
                : "Extracting..."}
            </>
          ) : urlCount > 1 ? (
            `Extract ${urlCount} links`
          ) : (
            "Extract"
          )}
        </Button>
      </div>
      {loading && progress && (
        <ProgressBar progress={Math.round((progress.done / progress.total) * 100)} />
      )}
      {error && (
        <p className="rounded-[20px] bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}
