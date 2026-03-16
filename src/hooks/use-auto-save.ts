"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useAutoSave<T>(
  initialValue: T,
  saveFn: (value: T) => Promise<unknown>,
  delayMs = 800
) {
  const [value, setValue] = useState<T>(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentRef = useRef(value);

  // Sync when initialValue changes externally
  useEffect(() => {
    setValue(initialValue);
    currentRef.current = initialValue;
  }, [initialValue]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        currentRef.current = resolved;

        clearTimeout(timeoutRef.current);
        clearTimeout(savedTimeoutRef.current);
        setSaved(false);

        timeoutRef.current = setTimeout(async () => {
          setSaving(true);
          try {
            await saveFn(currentRef.current);
            setSaved(true);
            savedTimeoutRef.current = setTimeout(() => setSaved(false), 1500);
          } finally {
            setSaving(false);
          }
        }, delayMs);

        return resolved;
      });
    },
    [saveFn, delayMs]
  );

  return { value, setValue: update, saving, saved };
}
