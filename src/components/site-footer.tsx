import Link from "next/link";
import { Wordmark } from "./brand";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          <Wordmark />
          <p className="mt-4 text-sm text-muted">{site.disclaimer}</p>
        </div>
        <div>
          <p className="label-mono">Product</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/console">Booking console</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/console?system=coordination">Coordination numbers</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/#chat">Chat bot</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-mono">Reference</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/rules">Matching rules</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/rules#queue">Queue rules</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/rules#edge-cases">When things go wrong</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line-2">
        <p className="mx-auto max-w-7xl px-4 py-5 font-mono text-xs text-muted sm:px-6 lg:px-8">
          All times are the embassy&rsquo;s local time (Europe/London).
        </p>
      </div>
    </footer>
  );
}
