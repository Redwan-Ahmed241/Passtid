"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { content, type Content } from "./content";
import { LANGS, translate, type Lang, type TranslationKey } from "./translations";

const STORAGE_KEY = "passtid-lang";

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Long-form page copy for the current language. */
  c: Content;
}

const Ctx = createContext<I18n | null>(null);

const listeners = new Set<() => void>();
/** Kept in memory too, so the toggle still works when storage is blocked. */
let chosen: Lang | null = null;

function readLang(): Lang {
  if (chosen) return chosen;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {}
  return LANGS.find((l) => l === saved) ?? (navigator.language?.toLowerCase().startsWith("sv") ? "sv" : "en");
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/** English on the server and during hydration, then the saved or browser language. */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);

  useEffect(() => {
    document.documentElement.lang = lang === "sv" ? "sv-SE" : "en-GB";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    chosen = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    listeners.forEach((cb) => cb());
  }, []);

  const value = useMemo<I18n>(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars), c: content[lang] }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <LangProvider>");
  return ctx;
}

/** BCP 47 tag for dates and numbers. */
export const LOCALES: Record<Lang, string> = { en: "en-GB", sv: "sv-SE" };
