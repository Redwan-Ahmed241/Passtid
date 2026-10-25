"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { features } from "@/lib/features";

const links = [
  { href: "/console", label: "Console" },
  ...(features.rules ? [{ href: "/rules", label: "Booking rules" }] : []),
  { href: "/#faq", label: "FAQ" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
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
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
