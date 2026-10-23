"use client";

import { useI18n } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n/translations";

/** EN / SV switch. Two buttons in one group, so the current choice is always visible. */
export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("language")} className="inline-flex h-10 flex-none ml-auto md:ml-0 rounded-[0.625rem] border border-line bg-surface p-0.5">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className="min-w-9 rounded-lg px-2 text-xs font-semibold uppercase text-muted transition-colors hover:text-ink aria-pressed:bg-accent aria-pressed:text-white"
        >
          {l}
        </button>
      ))}
    </div>
  );
}
