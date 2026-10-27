"use client";

import { useI18n } from "@/lib/i18n";

/**
 * The "start included, end excluded" rule drawn on a clock strip: 08:00 → 13:00,
 * window 09:00–12:00, with sample slots marked bookable or not. Times are listed
 * under the strip rather than labelled on it, because 08:45 and 09:00 are only
 * 15 minutes apart and their labels would sit on top of each other.
 */
const START = 8 * 60;
const END = 13 * 60;
const pct = (m: number) => `${((m - START) / (END - START)) * 100}%`;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

const samples = [
  { t: "08:45", ok: false },
  { t: "09:00", ok: true },
  { t: "10:30", ok: true },
  { t: "11:45", ok: true },
  { t: "12:00", ok: false },
];

export function WindowTimeline() {
  const { c } = useI18n();
  const tl = c.timeline;
  return (
    <figure className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-ink">{tl.caption}</span>
        <span className="font-mono text-xs text-muted">{tl.legend}</span>
      </figcaption>

      <div
        className="relative mt-6 mb-3 h-12"
        role="img"
        aria-label={tl.aria}
      >
        <div className="absolute inset-0 rounded-lg bg-sunken" />
        {/* hour gridlines */}
        {[9, 10, 11, 12].map((h) => (
          <div key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: pct(h * 60) }} />
        ))}
        {/* window band */}
        <div
          className="absolute inset-y-0 rounded-[3px] border-x-2 border-accent bg-accent-soft"
          style={{ left: pct(9 * 60), width: `calc(${pct(12 * 60)} - ${pct(9 * 60)})` }}
        />
        {/* sample slots: a mark only, the times are listed below */}
        {samples.map((s) => (
          <span
            key={s.t}
            aria-hidden="true"
            className={`absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-surface text-[0.625rem] font-bold ${
              s.ok ? "border-clear text-clear" : "border-hot text-hot"
            }`}
            style={{ left: pct(toMin(s.t)) }}
          >
            {s.ok ? "✓" : "×"}
          </span>
        ))}
      </div>

      <div className="relative h-4 font-mono text-[0.6875rem] text-muted tabular" aria-hidden="true">
        {[8, 9, 10, 11, 12, 13].map((h) => (
          <span
            key={h}
            className={`absolute ${h === 8 ? "" : h === 13 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: pct(h * 60) }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label={tl.samples}>
        {samples.map((s) => (
          <li
            key={s.t}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-semibold ${
              s.ok ? "border-clear-line bg-clear-bg text-clear" : "border-hot-line bg-hot-bg text-hot"
            }`}
          >
            <span aria-hidden="true">{s.ok ? "✓" : "×"}</span>
            {s.t}
            <span className="font-sans font-normal">{s.ok ? tl.ok : tl.no}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
