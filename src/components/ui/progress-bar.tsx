"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook that estimates progress for non-streaming async operations.
 * Uses an ease-out curve: fast at first, slows near the end.
 * Caps at 90% until `done` is set to true, then jumps to 100%.
 */
export function useProgressEstimate(active: boolean, expectedMs = 8000) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      // When done, briefly show 100% then reset
      if (progress > 0) {
        setProgress(100);
        const t = setTimeout(() => setProgress(0), 600);
        return () => clearTimeout(t);
      }
      return;
    }

    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      // Ease-out curve: 1 - e^(-3t) scaled to 90%
      const t = elapsed / expectedMs;
      const eased = 1 - Math.exp(-3 * t);
      setProgress(Math.min(Math.round(eased * 90), 90));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, expectedMs]);

  return progress;
}

/**
 * Thin progress bar with percentage label.
 * Pass `progress` (0-100) for determinate, or use `useProgressEstimate`.
 */
export function ProgressBar({
  progress,
  className = "",
  showLabel = true,
}: {
  progress: number;
  className?: string;
  showLabel?: boolean;
}) {
  if (progress <= 0) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="progress-bar-track flex-1">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-[12px] font-medium tabular-nums text-n-400">
          {Math.min(progress, 100)}%
        </span>
      )}
    </div>
  );
}
