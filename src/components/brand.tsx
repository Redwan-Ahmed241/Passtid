import Link from "next/link";
import { site } from "@/lib/site";

/** Mark: a ticket stub with a notch — one slot, punched out of the day. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        d="M6 4h20a2 2 0 0 1 2 2v7a3 3 0 0 0 0 6v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a3 3 0 0 0 0-6V6a2 2 0 0 1 2-2Z"
        fill="var(--ink)"
      />
      <rect x="9" y="10" width="9" height="2.4" rx="1.2" fill="var(--paper)" />
      <rect x="9" y="14.8" width="14" height="2.4" rx="1.2" fill="var(--accent)" />
      <rect x="9" y="19.6" width="6" height="2.4" rx="1.2" fill="var(--paper)" opacity=".55" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5 rounded-md" aria-label={`${site.name} home`}>
      <LogoMark />
      <span className="font-display text-[1.375rem] leading-none font-medium tracking-[-0.01em] text-ink">
        {site.name}
      </span>
    </Link>
  );
}
