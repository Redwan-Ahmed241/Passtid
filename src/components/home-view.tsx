"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { features } from "@/lib/features";
import { useI18n } from "@/lib/i18n";
import type { PlanId } from "@/lib/types";
import { BottomCta, HeroActions } from "./home-cta";
import { LogoMark } from "./brand";

/** Machine-readable strip along the bottom of each passport card, in place of a barcode. */
const MRZ: Record<PlanId, [string, string]> = {
  notify: ["P<SWE<<PASSTID<<ALERTS<<<<<<<<<<", "00102627SWE2610272<3010273<<<<<<04"],
  autobook: ["P<SWE<<PASSTID<<AUTOBOOK<<<<<<<", "00102627SWE2610272<3010273<<<<<<08"],
};

export function HomeView({ prices }: { prices: Record<PlanId, string> }) {
  const { c } = useI18n();
  const h = c.home;
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pt-14 pb-16 sm:px-6 md:pt-20 lg:px-8">
        <p className="label-mono">{h.eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-[2.25rem] leading-[1.08] font-bold tracking-[-0.02em] text-ink sm:text-5xl lg:text-[3.5rem]">
          {h.heroTitle}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{h.heroLead}</p>
        <HeroActions />
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-ink-2">
          {h.points.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Check className="size-4 flex-none text-accent" strokeWidth={3} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-h" className="mx-auto max-w-5xl scroll-mt-24 border-t border-line px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="how-h" className="text-2xl font-bold text-ink sm:text-3xl">{h.howTitle}</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
          {h.steps.map((s, i) => (
            <li key={s.title}>
              <span className="grid size-9 place-items-center rounded-full bg-accent font-mono text-sm font-semibold text-on-accent">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[0.9375rem] text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
        {features.rules && (
          <Link href="/rules" className="mt-8 inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent hover:text-accent-ink">
            {h.rulesLink} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </section>

      {/* Price: two passports */}
      <section id="price" aria-labelledby="price-h" className="mx-auto max-w-5xl scroll-mt-24 border-t border-line px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="price-h" className="text-2xl font-bold text-ink sm:text-3xl">{h.priceTitle}</h2>
        <div className="mt-8 grid max-w-3xl gap-6">
          {(["notify", "autobook"] as const).map((id) => (
            <PassportCard key={id} id={id} price={prices[id]} featured={id === "autobook"} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className="mx-auto max-w-5xl scroll-mt-24 border-t border-line px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="faq-h" className="text-2xl font-bold text-ink sm:text-3xl">{h.faqTitle}</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {c.faq.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex min-h-14 list-none items-center justify-between gap-6 py-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden="true"
                  className="relative size-4 flex-none before:absolute before:top-1/2 before:left-0 before:h-0.5 before:w-4 before:bg-accent after:absolute after:top-0 after:left-1/2 after:h-4 after:w-0.5 after:bg-accent after:transition-transform after:duration-200 group-open:after:scale-y-0"
                />
              </summary>
              <p className="max-w-[62ch] pb-5 text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl border-t border-line px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">{h.ctaTitle}</h2>
            <p className="mt-1.5 text-ink-2">{h.ctaBody}</p>
          </div>
          <BottomCta />
        </div>
      </section>
    </>
  );
}

/**
 * One plan as an open passport: the details page on the left, a stitched spine, and the price,
 * machine-readable strip and button on the right. The featured plan is the blue cover.
 */
function PassportCard({ id, price, featured }: { id: PlanId; price: string; featured: boolean }) {
  const { c } = useI18n();
  const h = c.home;
  const p = h.plans[id];
  const [mrz1, mrz2] = MRZ[id];
  const facts: [string, string][] = [
    [h.applicantLabel, p.applicants],
    [h.paymentLabel, p.payment],
    [h.coverageLabel, p.coverage],
  ];
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-[1.75rem] sm:flex-row ${
        featured ? "bg-accent text-on-accent" : "border border-line bg-surface text-ink"
      }`}
    >
      <div className="flex-1 p-6 sm:p-8">
        <p className={`flex items-center gap-2 text-sm font-medium ${featured ? "text-on-accent/85" : "text-muted"}`}>
          <span className={`grid size-6 place-items-center rounded-md ${featured ? "bg-white" : ""}`}>
            <LogoMark className="size-5" />
          </span>
          Passtid
        </p>
        <h3 className="mt-6 text-2xl font-bold">{p.name}</h3>
        <p className={`mt-2 text-[0.9375rem] leading-relaxed ${featured ? "text-on-accent/85" : "text-ink-2"}`}>{p.desc}</p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className={featured ? "text-on-accent/75" : "text-muted"}>{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Stitched spine */}
      <div
        aria-hidden="true"
        className={`mx-6 border-t-2 border-dashed sm:mx-0 sm:my-6 sm:border-t-0 sm:border-l-2 ${
          featured ? "border-on-accent/40" : "border-line-strong"
        }`}
      />

      <div className="flex flex-col p-6 sm:w-64 sm:flex-none sm:p-8">
        <p className={`text-sm ${featured ? "text-on-accent/85" : "text-muted"}`}>{h.priceLabel}</p>
        <p className="mt-1 text-5xl font-bold tracking-tight tabular">{price}</p>
        <p
          aria-hidden="true"
          className={`mt-6 overflow-hidden font-mono text-[0.5rem] leading-[1.4] tracking-[0.05em] whitespace-nowrap sm:mt-auto sm:pt-8 ${
            featured ? "text-on-accent/65" : "text-line-strong"
          }`}
        >
          {mrz1}
          <br />
          {mrz2}
        </p>
        <Link
          href={`/booking?plan=${id}`}
          className={`btn mt-4 h-12 text-base ${featured ? "btn-yellow" : "btn-primary"}`}
        >
          {h.select}
        </Link>
      </div>
    </article>
  );
}
