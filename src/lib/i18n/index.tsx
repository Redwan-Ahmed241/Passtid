"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { TextOverrides } from "@/lib/types";
import { api } from "@/lib/api";
import { content, type Content } from "./content";
import { legal, type LegalDoc, type LegalId } from "./legal";
import { applyOverrides } from "./overrides";
import { LANGS, fill, translate, type Lang, type TranslationKey } from "./translations";

const STORAGE_KEY = "passtid-lang";

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Long-form page copy for the current language. */
  c: Content;
  /** Privacy policy and terms for the current language. */
  l: Record<LegalId, LegalDoc>;
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

const NO_TEXTS: TextOverrides = { en: {}, sv: {} };
/** Texts an administrator changed, loaded once per page view. */
let texts: TextOverrides = NO_TEXTS;
let textsRequested = false;

/** Swap in a new set of overrides; every mounted page re-renders with them. */
export function applyTexts(next: TextOverrides) {
  texts = next;
  listeners.forEach((cb) => cb());
}

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

  const overrides = useSyncExternalStore(subscribe, () => texts, () => NO_TEXTS)[lang];

  useEffect(() => {
    if (textsRequested) return;
    textsRequested = true;
    // Without overrides the built-in texts simply stay, so a failed request needs no handling.
    api.texts().then(applyTexts, () => {});
  }, []);

  const value = useMemo<I18n>(() => {
    const edited = Object.keys(overrides).length > 0;
    return {
      lang,
      setLang,
      t: (key, vars) => {
        const custom = overrides[`t.${key}`];
        return custom !== undefined ? fill(custom, vars) : translate(lang, key, vars);
      },
      c: edited ? applyOverrides(content[lang], "c", overrides) : content[lang],
      l: edited ? applyOverrides(legal[lang], "l", overrides) : legal[lang],
    };
  }, [lang, setLang, overrides]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <LangProvider>");
  return ctx;
}

/** BCP 47 tag for dates and numbers. */
export const LOCALES: Record<Lang, string> = { en: "en-GB", sv: "sv-SE" };
