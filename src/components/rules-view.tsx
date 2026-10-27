"use client";

import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { WindowTimeline } from "./window-timeline";

const STATE_DOTS = ["bg-accent", "bg-clear", "bg-busy", "bg-hot"];

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

export function RulesView() {
  const { c } = useI18n();
  const k = c.rules;
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-14 pb-12 sm:px-6 md:pt-20 lg:px-8">
          <nav aria-label="Breadcrumb" className="font-mono text-xs text-muted">
            <ol className="flex gap-2">
              <li><Link href="/" className="inline-flex min-h-11 items-center hover:text-ink">{k.home}</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink-2">{k.crumb}</li>
            </ol>
          </nav>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.04] font-medium tracking-[-0.02em] text-ink sm:text-6xl">
            {k.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-2">
            {k.lead}
          </p>
          <nav aria-label={k.onThisPage} className="mt-8 flex flex-wrap gap-2">
            {(["#matching", "#queue", "#edge-cases"] as const).map((href, i) => (
              <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
                {k.jump[i]}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-24 px-4 pt-20 sm:px-6 lg:px-8">
        <section id="matching" aria-labelledby="matching-h" className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <SectionHead id="matching-h" n="01" title={k.s1Title}>
            {k.s1Body}
          </SectionHead>
          <div className="space-y-6">
            <WindowTimeline />
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <table className="w-full text-left text-[0.9375rem]">
                <caption className="sr-only">{k.tableCaption}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label-mono px-5 py-3 font-medium">{k.rule}</th>
                    <th scope="col" className="label-mono px-5 py-3 font-medium">{k.result}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-2">
                  {k.matching.map((m) => (
                    <tr key={m.rule} className="align-top">
                      <th scope="row" className="w-[42%] px-5 py-3.5 font-medium text-ink">{m.rule}</th>
                      <td className="px-5 py-3.5 text-ink-2">
                        {m.yes && <span className="mr-1.5 font-semibold text-clear">{k.included}</span>}
                        {m.no && <span className="mr-1.5 font-semibold text-hot">{k.excluded}</span>}
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
          <SectionHead id="queue-h" n="02" title={k.s2Title}>
            {k.s2Body}
          </SectionHead>
          <div className="space-y-6">
            <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
              {k.states.map((s, i) => (
                <li key={s.name} className="bg-surface p-5">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <span className={`size-2 rounded-full ${STATE_DOTS[i]}`} aria-hidden="true" /> {s.name}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-2">{s.text}</p>
                  <p className={`mt-3 font-mono text-xs font-semibold ${s.counts ? "text-clear" : "text-muted"}`}>
                    {s.counts ? k.counts : k.notCountsLabel}
                  </p>
                </li>
              ))}
            </ul>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
              <div className="bg-surface p-5">
                <h3 className="label-mono">{k.countedHead}</h3>
                <ul className="mt-3 space-y-2.5">
                  {k.counted.map((c) => (
                    <li key={c} className="flex gap-2.5 text-[0.9375rem] text-ink-2">
                      <Check className="mt-1 size-4 flex-none text-clear" aria-hidden="true" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface p-5">
                <h3 className="label-mono">{k.notCountedHead}</h3>
                <ul className="mt-3 space-y-2.5">
                  {k.notCounted.map((c) => (
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
          <SectionHead id="edge-h" n="03" title={k.s3Title}>
            {k.s3Body}
          </SectionHead>
          <dl className="divide-y divide-line border-y border-line">
            {k.edges.map(([situation, outcome]) => (
              <div key={situation} className="grid gap-1.5 py-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-8">
                <dt className="font-medium text-ink">{situation}</dt>
                <dd className="text-ink-2">{outcome}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center">
          <p className="font-display text-2xl text-ink">{k.ctaTitle}</p>
          <Link href="/booking" className="btn btn-primary group">
            {k.ctaButton}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
