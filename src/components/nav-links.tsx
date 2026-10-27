"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";

const links = [
  { href: "/#how", label: "navHow" },
  { href: "/#price", label: "navPrice" },
  { href: "/#faq", label: "navFaq" },
  { href: "/rules", label: "navRules" },
] as const satisfies readonly { href: string; label: TranslationKey }[];

export function NavLinks() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
      {links.map((l) => {
        const active = l.href === pathname;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-[0.9375rem] transition-colors ${
              active ? "text-ink font-medium" : "text-muted hover:text-ink"
            }`}
          >
            {t(l.label)}
          </Link>
        );
      })}
    </nav>
  );
}
