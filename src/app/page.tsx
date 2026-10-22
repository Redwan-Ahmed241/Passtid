import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BottomCta, HeroActions } from "@/components/home-cta";
import { JsonLd } from "@/components/json-ld";
import { QueueMeter } from "@/components/queue-meter";
import { WindowTimeline } from "@/components/window-timeline";
import { faq } from "@/lib/faq";
import { site } from "@/lib/site";

const principles = [
  {
    n: "01",
    title: "A window you can attend",
    body: "Add one or more date ranges, each with its own hours. The bot books inside them and nowhere else, and tells you in one plain sentence exactly what it understood.",
  },
  {
    n: "02",
    title: "A queue count on every slot",
    body: "See how many people have already claimed each slot before you commit. The count moves the second someone confirms, and falls back when an attempt fails.",
  },
  {
    n: "03",
    title: "One rule set, both services",
    body: "Passports and ID cards, or migration (coordination numbers): the same windows, the same matching, the same queue rules, on London time.",
  },
];

const lifecycle = [
  { label: "Nobody has claimed it", count: 0, note: "Uncontested" },
  { label: "You confirm", count: 1, note: "Counted immediately" },
  { label: "Booking succeeds", count: 1, note: "Stays counted, slot taken" },
  { label: "Or it fails / is cancelled", count: 0, note: "Released, nothing stuck" },
];

const chat = [
  { me: true, text: "/status" },
  {
    me: false,
    text: "Passport / National ID: booking only Tue 27 Oct – Fri 6 Nov, 09:00–12:00, 14:00–EOD\n\n• Tue 27 Oct 09:00 · 0 queued\n• Tue 27 Oct 11:45 · 2 queued\n• Thu 29 Oct 09:30 · 4 queued",
  },
  { me: true, text: "/book 2026-10-27T09:00" },
  { me: false, text: "Queued: Tuesday 27 October at 09:00.\nYou are #1 in the queue for this slot." },
];

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: site.name,
              url: site.url,
              description: site.description,
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Web",
              inLanguage: "en-GB",
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 md:pt-24 lg:px-8 lg:pb-24">
          <p className="label-mono">Swedish embassy appointments · London</p>
          <h1 className="mt-5 max-w-4xl font-display text-[2.75rem] leading-[1.02] font-medium tracking-[-0.02em] text-ink sm:text-6xl lg:text-[4.75rem]">
            Book a slot you can <em className="text-accent">actually attend</em>, and see how busy it is.
          </h1>
          <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-ink-2">
            Tell the bot which days and hours work for you. It watches the passport, ID card and migration
            calendars, shows how many people are already queued for every slot, and books only inside your
            windows. Sign in to see the live calendar.
          </p>
          <HeroActions />

          <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {[
              ["Two services", "Passports and ID cards, and migration, under one account."],
              ["London time", "Every slot on the embassy's clock, whatever your timezone."],
              ["Numbers, not names", "You see how busy a slot is. Never who is in the queue."],
            ].map(([term, text]) => (
              <div key={term} className="bg-surface p-5">
                <dt className="font-display text-xl font-medium text-ink">{term}</dt>
                <dd className="mt-1.5 text-[0.9375rem] text-ink-2">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Principles */}
      <section aria-labelledby="principles-h" className="border-b border-line">
        <h2 id="principles-h" className="sr-only">What it does</h2>
        <div className="mx-auto grid max-w-7xl px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {principles.map((p, i) => (
            <div
              key={p.n}
              className={`py-10 md:px-8 md:py-14 ${i > 0 ? "border-t border-line md:border-t-0 md:border-l" : ""} ${
                i === 0 ? "md:pl-0" : ""
              } ${i === principles.length - 1 ? "md:pr-0" : ""}`}
            >
              <span className="font-mono text-sm text-accent">{p.n}</span>
              <h3 className="mt-3 font-display text-[1.625rem] leading-tight font-medium text-ink">{p.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Queue lifecycle */}
      <section id="how" aria-labelledby="how-h" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="max-w-md">
            <p className="label-mono">The queue count</p>
            <h2 id="how-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              A number that moves when people commit, and only then.
            </h2>
            <p className="mt-4 text-ink-2">
              One count per exact slot, per service. A passport slot and a migration slot at the same minute
              never mix. Your own attempts are labelled as yours, never hidden in the crowd.
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {lifecycle.map((s, i) => (
              <li key={s.label} className="flex flex-col justify-between gap-6 bg-surface p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-medium text-ink">{s.label}</span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <QueueMeter count={s.count} />
                  <span className="text-right text-[0.8125rem] text-muted">{s.note}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Chat */}
      <section id="chat" aria-labelledby="chat-h" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 rounded-2xl border border-line bg-sunken/60 p-4 sm:p-6 lg:order-1">
            <div className="flex flex-col gap-2.5" aria-label="Example bot conversation">
              {chat.map((m, i) => (
                <p
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                    m.me
                      ? "self-end rounded-br-md bg-accent font-mono text-[0.8125rem] text-on-accent"
                      : "self-start rounded-bl-md border border-line-2 bg-surface text-ink"
                  }`}
                >
                  {m.text}
                </p>
              ))}
            </div>
          </div>
          <div className="order-1 max-w-md lg:order-2">
            <p className="label-mono">In the chat</p>
            <h2 id="chat-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              Most people never open a web page. The bot says the same thing.
            </h2>
            <p className="mt-4 text-ink-2">
              The slot list, your window and every queue count arrive in the same conversation. Book from the chat
              and the count on the console updates at once because they read from the same place.
            </p>
            <Link href="/console" className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:text-accent-ink">
              Try it in the console <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Matching rule */}
      <section aria-labelledby="rule-h" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="max-w-md">
            <p className="label-mono">The easy thing to get wrong</p>
            <h2 id="rule-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              The start of a range is in. The end is out.
            </h2>
            <p className="mt-4 text-ink-2">
              Ask for 09:00 to 12:00 and you can get 09:00 or 11:45, never 12:00. Dates are different: both the first
              and the last day of your range count.
            </p>
            <Link href="/rules" className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:text-accent-ink">
              All matching and queue rules <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <WindowTimeline />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="label-mono">Questions</p>
            <h2 id="faq-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              Frequently asked
            </h2>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex min-h-14 list-none items-center justify-between gap-6 py-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="relative size-4 flex-none before:absolute before:top-1/2 before:left-0 before:h-px before:w-4 before:bg-ink-2 after:absolute after:top-0 after:left-1/2 after:h-4 after:w-px after:bg-ink-2 after:transition-transform after:duration-200 group-open:after:scale-y-0"
                  />
                </summary>
                <p className="max-w-[62ch] pb-5 text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-ink px-6 py-12 text-paper sm:px-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl leading-tight font-medium sm:text-4xl">Set your window once.</h2>
            <p className="mt-2 max-w-md opacity-75">The bot keeps looking, books only what you can attend, and tells you how busy it was.</p>
          </div>
          <BottomCta />
        </div>
      </section>
    </>
  );
}
