"use client";

import Link from "next/link";
import { Wordmark } from "./brand";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { site } from "@/lib/site";

const links = [
  { href: "/#how", label: "navHow" },
  { href: "/#price", label: "navPrice" },
  { href: "/#faq", label: "navFaq" },
  { href: "/rules", label: "navRules" },
  { href: "/privacy", label: "navPrivacy" },
  { href: "/terms", label: "navTerms" },
] as const satisfies readonly { href: string; label: TranslationKey }[];

export function SiteFooter() {
  const { t } = useI18n();
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
                <Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink md:min-h-9" href={l.href}>
                  {t(l.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-5xl px-4 py-5 font-mono text-xs text-muted sm:px-6 lg:px-8">
          {t("builtBy")}{" "}
          <a
            href={site.credit.url}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline sm:min-h-0"
          >
            {site.credit.name}
          </a>
        </p>
      </div>
    </footer>
  );
}
