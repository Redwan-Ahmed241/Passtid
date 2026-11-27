"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { TextOverrides } from "@/lib/types";
import { api } from "@/lib/api";
import { content, type Content } from "./content";
import { legal, type LegalDoc, type LegalId } from "./legal";
import { applyOverrides } from "./overrides";
import { HOME_PATHS, routeOf } from "./paths";
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

/** Texts an administrator changed, as fetched by this browser. Until then the server's copy is used. */
let texts: TextOverrides | null = null;
let textsRequested = false;

/** Swap in a new set of overrides; every mounted page re-renders with them. */
export function applyTexts(next: TextOverrides) {
  texts = next;
  listeners.forEach((cb) => cb());
}

/** English on the server and during hydration, then the saved or browser language. */
export function LangProvider({ children, initialTexts }: { children: React.ReactNode; initialTexts: TextOverrides }) {
  const router = useRouter();
  const pathname = usePathname();
  const route = useMemo(() => routeOf(pathname), [pathname]);
  const routeLang = route?.lang ?? null;
  const stored = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
  const lang = routeLang ?? stored;

  // Someone who arrived on the Swedish URL keeps Swedish when they move on to the booking pages.
  // English addresses save nothing: "/" is also where old links lead.
  useEffect(() => {
    if (routeLang === "sv" && chosen !== routeLang) {
      chosen = routeLang;
      try {
        localStorage.setItem(STORAGE_KEY, routeLang);
      } catch {}
      listeners.forEach((cb) => cb());
    }
  }, [routeLang]);

  useEffect(() => {
    document.documentElement.lang = lang === "sv" ? "sv-SE" : "en-GB";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    chosen = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    listeners.forEach((cb) => cb());
    // Where the language belongs to the address, choosing the other one moves to its address.
    if (route && next !== route.lang) router.push(route.pair[next]);
  }, [route, router]);

  const overrides = useSyncExternalStore(
    subscribe,
    () => (texts ?? initialTexts)[lang],
    () => initialTexts[lang],
  );

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

/** The home page in the current language, optionally at a section: homeHref("how"). */
export function useHomeHref(): (section?: string) => string {
  const { lang } = useI18n();
  return useCallback((section?: string) => HOME_PATHS[lang] + (section ? `#${section}` : ""), [lang]);
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <LangProvider>");
  return ctx;
}

/** BCP 47 tag for dates and numbers. */
export const LOCALES: Record<Lang, string> = { en: "en-GB", sv: "sv-SE" };
