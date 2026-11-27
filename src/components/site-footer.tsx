"use client";

import Link from "next/link";
import { Wordmark } from "./brand";
import { features } from "@/lib/features";
import { usePathname } from "next/navigation";
import { HOME_PATHS, QUESTIONS_PATHS, routeOf } from "@/lib/i18n/paths";
import { useHomeHref, useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";

/** Hidden unless NEXT_PUBLIC_SHOW_RULES=true. */
const RULES_LINK = { href: "/rules", label: "navRules" } as const;

const links = [
  { href: "/#how", label: "navHow" },
  { href: "/#price", label: "navPrice" },
  { href: "/#faq", label: "navFaq" },
  { href: "/booking?support=1", label: "navSupport" },
  ...(features.rules ? [RULES_LINK] : []),
  { href: "/privacy", label: "navPrivacy" },
  { href: "/terms", label: "navTerms" },
] as const satisfies readonly { href: string; label: TranslationKey }[];

export function SiteFooter() {
  const { t, lang, setLang } = useI18n();
  const homeHref = useHomeHref();
  const other = lang === "sv" ? "en" : "sv";
  const pair = routeOf(usePathname())?.pair ?? HOME_PATHS;
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div className="max-w-sm">
          <Wordmark />
          <p className="mt-3 text-sm text-muted">{t("disclaimer")}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 text-sm md:gap-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink md:min-h-9" href={l.href.startsWith("/#") ? homeHref(l.href.slice(2)) : l.href}>
                  {t(l.label)}
                </Link>
              </li>
            ))}
            <li>
              <Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink md:min-h-9" href={QUESTIONS_PATHS[lang]}>
                {t("navPassportQuestions")}
              </Link>
            </li>
            <li>
              {/* A real link, so crawlers find the Swedish page without running scripts. A plain click
                  changes the language where the visitor is instead of taking them to the home page. */}
              <Link
                className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink md:min-h-9"
                href={pair[other]}
                hrefLang={other === "sv" ? "sv-SE" : "en-GB"}
                lang={other}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab or window
                  e.preventDefault();
                  setLang(other);
                }}
              >
                {other === "sv" ? "Svenska" : "English"}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
