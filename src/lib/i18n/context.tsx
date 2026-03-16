"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import en from "./translations/en";
import zh from "./translations/zh";
import es from "./translations/es";
import fr from "./translations/fr";
import type { TranslationKeys } from "./translations/en";

export type Locale = "en" | "zh" | "es" | "fr";

const TRANSLATIONS: Record<Locale, TranslationKeys> = { en, zh, es, fr };

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
  es: "Español",
  fr: "Français",
};

const STORAGE_KEY = "derive-locale";

type NestedKeyOf<T> = T extends string
  ? ""
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${NestedKeyOf<T[K]>}`;
    }[keyof T & string];

type TranslationKey = NestedKeyOf<TranslationKeys>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && TRANSLATIONS[stored]) {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale === "zh" ? "zh-CN" : newLocale;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const translations = TRANSLATIONS[locale];
      const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
      return interpolate(value, vars);
    },
    [locale]
  );

  // Avoid hydration mismatch by rendering with "en" on server
  const contextValue: I18nContextValue = {
    locale: mounted ? locale : "en",
    setLocale,
    t: mounted ? t : (key: string, vars?: Record<string, string | number>) => {
      const value = getNestedValue(en as unknown as Record<string, unknown>, key);
      return interpolate(value, vars);
    },
  };

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
