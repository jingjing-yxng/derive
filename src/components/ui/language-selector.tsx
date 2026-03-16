"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useTranslation, LOCALE_LABELS, type Locale } from "@/lib/i18n/context";

const LOCALES = Object.entries(LOCALE_LABELS) as [Locale, string][];

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-n-500 transition-colors hover:bg-n-100 hover:text-n-900"
        aria-label="Select language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-[16px] border border-n-200 bg-n-0 p-1 shadow-lg">
          {LOCALES.map(([code, label]) => (
            <button
              key={code}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-[10px] px-3 py-2 text-sm transition-colors ${
                locale === code
                  ? "bg-lavender-50 font-medium text-lavender-500"
                  : "text-n-600 hover:bg-n-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
