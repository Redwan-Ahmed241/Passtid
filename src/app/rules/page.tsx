import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { WindowTimeline } from "@/components/window-timeline";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Booking rules: windows, queue counts and edge cases",
  description:
    "Exactly how Passtid matches Swedish embassy slots to your booking window, what counts as being in the queue, and what happens when a booking fails, with the same rules for passports, ID cards and migration (coordination numbers).",
  alternates: { canonical: "/rules" },
  openGraph: { url: "/rules" },
};

const matching: { rule: string; result: string; yes?: boolean; no?: boolean }[] = [
  { rule: "Start of a time range", result: "09:00 is bookable", yes: true },
  { rule: "End of a time range", result: "12:00 is not bookable, 11:45 is", no: true },
  { rule: "First and last day of the date range", result: "Both count: 21 Oct and 31 Oct are in", yes: true },
  { rule: "Only a start date", result: "That date onwards, with no end" },
  { rule: "Only an end date", result: "From now until that date" },
  { rule: "Start and end are the same day", result: "That single day only" },
  { rule: "No time ranges on a date range", result: "Any time of day on those dates" },
  { rule: "Several time ranges", result: "A slot is bookable if it is inside any of them" },
  { rule: "Several date ranges", result: "A slot is bookable if it matches any date range, using that range's own times" },
  { rule: "Which clock", result: "The embassy's local time (London) on both systems, whatever the server's timezone" },
  { rule: "How far it looks", result: "12 weeks for passports and ID cards, 8 for migration, and it says when it stops" },
];

const states = [
  { name: "Pending", dot: "bg-accent", text: "Someone confirmed a booking request and it is running.", counts: true },
  { name: "Booked", dot: "bg-clear", text: "The appointment is confirmed. It still holds the slot.", counts: true },
  { name: "Stale", dot: "bg-busy", text: "No progress for 15 minutes, so the slot is released.", counts: false },
  { name: "Released", dot: "bg-hot", text: "Failed, cancelled or timed out. The entry is deleted.", counts: false },
];

const counted = [
  "Other people pending on that exact slot",
  "People already booked on that exact slot",
  "Entries refreshed within the last 15 minutes",
];
const notCounted = [
  "Failed, cancelled or timed-out attempts",
  "The website's own “3 free” label, shown separately and never merged",
  "Your own attempt is labelled as yours, never hidden in the crowd",
  "People queued for a different slot, even on the same day",
];

const edges = [
  ["No free slot inside the window", "A clear message plus the nearest slots outside the window, so it can be widened. Nothing is booked."],
  ["Free slots exist, but all outside the window", "They are listed once, marked “outside your window”, and never booked."],
  ["The window itself is invalid", "The bot refuses it with a message naming the broken range, and keeps the last valid window. Never a silent fallback to booking anything."],
  ["The website changes its layout", "The booking stops, the browser stays on the right page, and you are told to finish it by hand. Never a half-finished booking."],
  ["The slot is gone by the time it is clicked", "The queue entry is released, the count goes back down, and the bot keeps looking."],
  ["The booking succeeds", "You get the confirmation and booking number, and the slot's count stays one higher because the slot is taken."],
];

function SectionHead({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-md">
      <p className="font-mono text-sm text-accent">{n}</p>
      <h2 id={id} className="mt-2 font-display text-[2rem] leading-[1.1] font-medium tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <p className="mt-3 text-ink-2">{children}</p>
    </div>
  );
}

export default function RulesPage() {
  // Built but hidden for now. Set NEXT_PUBLIC_SHOW_RULES=true and redeploy to show it.
  if (!features.rules) notFound();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
            { "@type": "ListItem", position: 2, name: "Booking rules", item: `${site.url}/rules` },
          ],
        }}
      />

      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 lg:px-8">
          <nav aria-label="Breadcrumb" className="font-mono text-xs text-muted">
            <ol className="flex gap-2">
              <li><Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink-2">Booking rules</li>
            </ol>
          </nav>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.04] font-medium tracking-[-0.02em] text-ink sm:text-6xl">
            The rules, written down so nobody has to guess.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-2">
            How a slot is matched to your window, what counts as being in the queue, and what you see when something
            goes wrong. Identical for the passport / national ID service and the migration service.
          </p>
          <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
            {[
              ["#matching", "Matching"],
              ["#queue", "Queue"],
              ["#edge-cases", "Edge cases"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-24 px-4 pt-20 sm:px-6 lg:px-8">
        <section id="matching" aria-labelledby="matching-h" className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <SectionHead id="matching-h" n="01" title="Matching a slot to your window">
            The start of a time range is included, the end is not. Dates are included at both ends.
          </SectionHead>
          <div className="space-y-6">
            <WindowTimeline />
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <table className="w-full text-left text-[0.9375rem]">
                <caption className="sr-only">Matching rules</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label-mono px-5 py-3 font-medium">Rule</th>
                    <th scope="col" className="label-mono px-5 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-2">
                  {matching.map((m) => (
                    <tr key={m.rule} className="align-top">
                      <th scope="row" className="w-[42%] px-5 py-3.5 font-medium text-ink">{m.rule}</th>
                      <td className="px-5 py-3.5 text-ink-2">
                        {m.yes && <span className="mr-1.5 font-semibold text-clear">Included:</span>}
                        {m.no && <span className="mr-1.5 font-semibold text-hot">Excluded:</span>}
                        {m.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="queue" aria-labelledby="queue-h" className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <SectionHead id="queue-h" n="02" title="What counts as “in the queue”">
            One number per exact slot, per service. A passport slot and a migration slot never mix, even at the
            same minute.
          </SectionHead>
          <div className="space-y-6">
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {states.map((s) => (
                <li key={s.name} className="bg-surface p-5">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <span className={`size-2 rounded-full ${s.dot}`} aria-hidden="true" /> {s.name}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-2">{s.text}</p>
                  <p className={`mt-3 font-mono text-xs font-semibold ${s.counts ? "text-clear" : "text-muted"}`}>
                    {s.counts ? "Counts" : "Does not count"}
                  </p>
                </li>
              ))}
            </ul>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
              <div className="bg-surface p-5">
                <h3 className="label-mono">Counted</h3>
                <ul className="mt-3 space-y-2.5">
                  {counted.map((c) => (
                    <li key={c} className="flex gap-2.5 text-[0.9375rem] text-ink-2">
                      <Check className="mt-1 size-4 flex-none text-clear" aria-hidden="true" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface p-5">
                <h3 className="label-mono">Not counted</h3>
                <ul className="mt-3 space-y-2.5">
                  {notCounted.map((c) => (
                    <li key={c} className="flex gap-2.5 text-[0.9375rem] text-ink-2">
                      <Minus className="mt-1 size-4 flex-none text-muted" aria-hidden="true" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="edge-cases" aria-labelledby="edge-h" className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <SectionHead id="edge-h" n="03" title="When things go wrong">
            Every one of these behaves identically in the passport flow and the migration flow.
          </SectionHead>
          <dl className="divide-y divide-line border-y border-line">
            {edges.map(([situation, outcome]) => (
              <div key={situation} className="grid gap-1.5 py-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-8">
                <dt className="font-medium text-ink">{situation}</dt>
                <dd className="text-ink-2">{outcome}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center">
          <p className="font-display text-2xl text-ink">See the rules at work on live slots.</p>
          <Link href="/console" className="btn btn-primary group">
            Open the console
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
