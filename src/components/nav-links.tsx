"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { features } from "@/lib/features";
import { useHomeHref, useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useMe } from "./auth/use-me";

/** Hidden unless NEXT_PUBLIC_SHOW_RULES=true. */
const RULES_LINK = { href: "/rules", label: "navRules" } as const;

const links = [
  { href: "/#how", label: "navHow" },
  { href: "/#price", label: "navPrice" },
  { href: "/#faq", label: "navFaq" },
  ...(features.rules ? [RULES_LINK] : []),
] as const satisfies readonly { href: string; label: TranslationKey }[];

export function NavLinks() {
  const pathname = usePathname();
  const { t } = useI18n();
  const homeHref = useHomeHref();
  const { user } = useMe();
  // Signed-out visitors already have the "Start booking" button; signed-in ones need a way back in.
  const shown = user ? [...links, { href: "/booking", label: "navConsole" } as const] : links;
  return (
    <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
      {shown.map((l) => {
        const active = l.href === pathname;
        return (
          <Link
            key={l.href}
            href={l.href.startsWith("/#") ? homeHref(l.href.slice(2)) : l.href}
            aria-current={active ? "page" : undefined}
            // Signed in there is one link more, so on tablets the first explainer link makes room for it.
            className={`rounded-lg px-2 py-2 text-[0.9375rem] whitespace-nowrap transition-colors lg:px-3 ${
              user && l.href === "/#how" ? "md:max-lg:hidden " : ""
            }${
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
