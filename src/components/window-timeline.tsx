/**
 * The "start included, end excluded" rule drawn on a clock strip: 08:00 → 13:00,
 * window 09:00–12:00, with sample slots marked bookable or not.
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
  return (
    <figure className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">Window “09:00 – 12:00”</span>
        <span className="font-mono text-xs text-muted">09:00 can be booked · 12:00 cannot</span>
      </figcaption>

      <div className="relative mt-12 mb-3 h-12" role="img" aria-label="Clock strip from 08:00 to 13:00. The window covers 09:00 up to, but not including, 12:00. 09:00, 10:30 and 11:45 are bookable; 08:45 and 12:00 are not.">
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
        {/* sample slots */}
        {samples.map((s) => (
          <div key={s.t} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(toMin(s.t)) }}>
            <span
              className={`grid size-5 place-items-center rounded-full border-2 bg-surface text-[10px] font-bold ${
                s.ok ? "border-clear text-clear" : "border-hot text-hot"
              }`}
              aria-hidden="true"
            >
              {s.ok ? "✓" : "×"}
            </span>
            <span
              className={`absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold whitespace-nowrap ${
                s.ok ? "border-clear-line bg-clear-bg text-clear" : "border-hot-line bg-hot-bg text-hot"
              }`}
            >
              {s.t}
            </span>
          </div>
        ))}
      </div>

      <div className="relative h-4 font-mono text-[0.6875rem] text-muted tabular" aria-hidden="true">
        {[8, 9, 10, 11, 12, 13].map((h) => (
          <span
            key={h}
            className={`absolute ${h === 8 ? "" : h === 13 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: pct(h * 60) }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>
    </figure>
  );
}
