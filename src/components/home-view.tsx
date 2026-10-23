"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { BottomCta, HeroActions } from "./home-cta";
import { QueueMeter } from "./queue-meter";
import { WindowTimeline } from "./window-timeline";

export function HomeView() {
  const { c } = useI18n();
  const h = c.home;
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 md:pt-24 lg:px-8 lg:pb-24 xl:pt-28 xl:pb-28">
          <p className="label-mono lg:text-center">{h.eyebrow}</p>
          <h1 className="mt-5 max-w-5xl font-display lg:mx-auto lg:text-center text-[2.75rem] leading-[1.02] font-medium tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
            {h.heroBefore}<em className="text-accent">{h.heroEm}</em>{h.heroAfter}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 lg:mx-auto lg:text-center lg:text-xl">
            {h.lead}
          </p>
          <HeroActions />

          <dl className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {h.facts.map(([term, text]) => (
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
        <h2 id="principles-h" className="sr-only">{h.whatItDoes}</h2>
        <div className="mx-auto grid max-w-7xl px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {h.principles.map((p, i) => (
            <div
              key={p.title}
              className={`py-10 md:px-8 md:py-14 ${i > 0 ? "border-t border-line md:border-t-0 md:border-l" : ""} ${
                i === 0 ? "md:pl-0" : ""
              } ${i === h.principles.length - 1 ? "md:pr-0" : ""}`}
            >
              <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
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
            <p className="label-mono">{h.queueEyebrow}</p>
            <h2 id="how-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              {h.queueTitle}
            </h2>
            <p className="mt-4 text-ink-2">
              {h.queueBody}
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {h.lifecycle.map((s, i) => (
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
            <div className="flex flex-col gap-2.5" aria-label={h.chatLabel}>
              {h.chat.map((m, i) => (
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
            <p className="label-mono">{h.chatEyebrow}</p>
            <h2 id="chat-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              {h.chatTitle}
            </h2>
            <p className="mt-4 text-ink-2">
              {h.chatBody}
            </p>
            <Link href="/console" className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:text-accent-ink">
              {h.chatLink} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Matching rule */}
      <section aria-labelledby="rule-h" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="max-w-md">
            <p className="label-mono">{h.ruleEyebrow}</p>
            <h2 id="rule-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              {h.ruleTitle}
            </h2>
            <p className="mt-4 text-ink-2">
              {h.ruleBody}
            </p>
            <Link href="/rules" className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:text-accent-ink">
              {h.ruleLink} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <WindowTimeline />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <p className="label-mono">{h.faqEyebrow}</p>
            <h2 id="faq-h" className="mt-3 font-display text-4xl leading-[1.08] font-medium tracking-[-0.01em] text-ink">
              {h.faqTitle}
            </h2>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {c.faq.map((f) => (
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
            <h2 className="font-display text-3xl leading-tight font-medium sm:text-4xl">{h.ctaTitle}</h2>
            <p className="mt-2 max-w-md opacity-75">{h.ctaBody}</p>
          </div>
          <BottomCta />
        </div>
      </section>
    </>
  );
}
