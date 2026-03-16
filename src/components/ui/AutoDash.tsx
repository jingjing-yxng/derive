"use client";

import { useEffect } from "react";

/**
 * Global listener: replaces `--` with an em dash `—` in any
 * input or textarea on the page, preserving cursor position.
 */
export function AutoDash() {
  useEffect(() => {
    function handle(e: Event) {
      const el = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      // Skip date/number/etc inputs where dashes are meaningful
      if (el.type === "date" || el.type === "number" || el.type === "time") return;

      const val = el.value;
      if (!val.includes("--")) return;

      const pos = el.selectionStart ?? val.length;
      const next = val.replaceAll("--", "\u2014");
      // Each replacement shortens string by 1 char per occurrence
      const diff = val.length - next.length;

      // Use native setter so React's controlled inputs pick up the change
      const nativeSet = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeSet?.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));

      // Restore cursor position (adjusted for shortened string)
      const newPos = Math.max(0, pos - diff);
      el.setSelectionRange(newPos, newPos);
    }

    document.addEventListener("input", handle);
    return () => document.removeEventListener("input", handle);
  }, []);

  return null;
}
