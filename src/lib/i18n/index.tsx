"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANGS, translate, type Lang, type TranslationKey } from "./translations";

const STORAGE_KEY = "passtid-lang";

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18n | null>(null);

/** English on the server and first paint, then the saved or browser language once mounted. */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const next = LANGS.find((l) => l === saved) ?? (navigator.language?.toLowerCase().startsWith("sv") ? "sv" : "en");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only state after hydration
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "sv" ? "sv-SE" : "en-GB";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  const value = useMemo<I18n>(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <LangProvider>");
  return ctx;
}
