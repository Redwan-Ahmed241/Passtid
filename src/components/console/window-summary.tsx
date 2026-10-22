import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";
import type { BookingWindow } from "@/lib/types";
import { describeWindow, formatRange, validateWindow, windowRanges } from "@/lib/window";
import { formatDayShort } from "@/lib/time";

export type SaveState = "idle" | "saving" | "saved" | "invalid" | "error";

export function WindowSummary({ value, save }: { value: BookingWindow; save: SaveState }) {
  const issues = validateWindow(value);
  const ranges = windowRanges(value.times);

  return (
    <section aria-labelledby="summary-h" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id="summary-h" className="label-mono">What the system understood</h2>
        <SaveBadge state={save} />
      </div>

      <div className="mt-4 rounded-xl border border-line-2 bg-surface-2 p-4">
        <p className="text-[0.8125rem] text-muted">Booking only</p>
        {value.emergency ? (
          <p className="mt-1 font-display text-xl leading-snug text-hot">Any slot, whenever it appears</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip strong>
              {value.from ? formatDayShort(value.from) : "No start date"}
              {value.to ? ` → ${formatDayShort(value.to)}` : " onwards"}
            </Chip>
            {ranges.length ? (
              ranges.map((r) => <Chip key={`${r.start}-${r.end}`}>{formatRange(r)}</Chip>)
            ) : (
              <Chip>any time of day</Chip>
            )}
          </div>
        )}
        {issues.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 text-[0.8125rem] text-hot">
            <AlertTriangle className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
            {issues[0].message} The bot keeps using the last valid window until this is fixed.
          </p>
        )}
      </div>

      <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
        The bot tells you exactly this, <q className="text-ink-2">{describeWindow(value)}</q>, and the same
        sentence goes in the logs, so nobody has to guess which times it may book.
      </p>
    </section>
  );
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-[0.8125rem] tabular ${
        strong ? "font-semibold text-ink" : "text-ink-2"
      }`}
    >
      {children}
    </span>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const map = {
    idle: null,
    saving: { icon: <Loader2 className="size-3.5 animate-spin" />, text: "Saving", cls: "text-muted" },
    saved: { icon: <Check className="size-3.5" />, text: "Saved", cls: "text-clear" },
    invalid: { icon: <AlertTriangle className="size-3.5" />, text: "Not saved", cls: "text-hot" },
    error: { icon: <CloudOff className="size-3.5" />, text: "Offline", cls: "text-hot" },
  } as const;
  const s = map[state];
  return (
    <span aria-live="polite" className="min-h-5">
      {s && (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.cls}`}>
          <span aria-hidden="true">{s.icon}</span>
          {s.text}
        </span>
      )}
    </span>
  );
}
