"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Two-column frame for sign-in and registration: a short pitch beside the form. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const { c } = useI18n();
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:px-8">
      <div className="order-2 max-w-md lg:order-1 lg:pt-6">
        <p className="label-mono">{c.auth.why}</p>
        <p className="mt-4 font-display text-[1.75rem] leading-snug font-medium text-ink">{c.auth.pitch}</p>
        <ul className="mt-6 space-y-3.5">
          {c.auth.points.map((p) => (
            <li key={p} className="flex gap-3 text-[0.9375rem] text-ink-2">
              <Check className="mt-1 size-4 flex-none text-clear" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 flex lg:order-2 lg:justify-end">{children}</div>
    </div>
  );
}
