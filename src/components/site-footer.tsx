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
          <ul className="mt-3 text-sm sm:space-y-2">
            <li><Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink sm:min-h-0" href="/console">Booking console</Link></li>
            <li><Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink sm:min-h-0" href="/console?system=migration">Migration</Link></li>
            <li><Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink sm:min-h-0" href="/#chat">Chat bot</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-mono">Reference</p>
          <ul className="mt-3 text-sm sm:space-y-2">
            <li><Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink sm:min-h-0" href="/rules">Matching rules</Link></li>
            <li><Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink sm:min-h-0" href="/rules#queue">Queue rules</Link></li>
            <li><Link className="inline-flex min-h-11 items-center text-ink-2 hover:text-ink sm:min-h-0" href="/rules#edge-cases">When things go wrong</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line-2">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>All times are the embassy&rsquo;s local time (Europe/London).</p>
          <p>
            {site.credit.lead}{" "}
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
      </div>
    </footer>
  );
}
