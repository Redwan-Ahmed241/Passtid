"use client";

import { useId, useState } from "react";
import { Plus, Trash2, X, Zap } from "lucide-react";
import { makeId } from "@/lib/api";
import type { BookingWindow, DateRange, TimeRange } from "@/lib/types";
import { SaveBadge, type SaveState } from "./save-badge";
import { describeDates, describeTimes, emptyRange, MAX_DATE_RANGES, MAX_TIME_RANGES, normaliseClock, validateWindow } from "@/lib/window";

interface Props {
  value: BookingWindow;
  today: string;
  horizon: string;
  save: SaveState;
  onChange: (next: BookingWindow) => void;
}

export function WindowEditor({ value, today, horizon, save, onChange }: Props) {
  const uid = useId();
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const issues = validateWindow(value);
  const issueFor = (field: string) => (touched.has(field) ? issues.find((i) => i.field === field) : undefined);
  const touch = (field: string) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));

  const setRange = (i: number, patch: Partial<DateRange>) =>
    onChange({ ...value, ranges: value.ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const addRange = () =>
    onChange({ ...value, ranges: [...value.ranges, emptyRange(makeId(), today, null)] });
  const removeRange = (i: number) => onChange({ ...value, ranges: value.ranges.filter((_, j) => j !== i) });

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${uid}-h`} className="label-mono">Booking window</h2>
        <SaveBadge state={issues.length > 0 ? "invalid" : save} />
      </div>
      <p className="mt-2 text-[0.8125rem] text-muted">
        Add one or more date ranges. Each can have its own times; leave times empty for any time of day.
      </p>
      {issues.length > 0 && (
        <p className="mt-2 text-[0.8125rem] text-hot">
          Fix the highlighted fields. The bot keeps using your last saved window until then.
        </p>
      )}

      <fieldset className="mt-4 space-y-4" disabled={value.emergency}>
        <legend className="sr-only">Date ranges</legend>
        {value.ranges.map((r, i) => (
          <RangeCard
            key={r.id}
            index={i}
            range={r}
            uid={`${uid}-r${i}`}
            today={today}
            horizon={horizon}
            canRemove={value.ranges.length > 1}
            issueFor={issueFor}
            touch={touch}
            onChange={(patch) => setRange(i, patch)}
            onRemove={() => removeRange(i)}
          />
        ))}

        {value.ranges.length === 0 && (
          <p className="rounded-xl border border-dashed border-line-strong px-3 py-3 text-sm text-muted">
            No date range yet. Add one to tell the bot which days you can attend.
          </p>
        )}

        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-accent hover:text-accent-ink disabled:opacity-50"
          disabled={value.ranges.length >= MAX_DATE_RANGES}
          onClick={addRange}
        >
          <Plus className="size-4" aria-hidden="true" /> Add a date range
        </button>
        {!value.emergency && issueFor("ranges") && (
          <p role="alert" className="text-[0.8125rem] text-hot">{issueFor("ranges")?.message}</p>
        )}
      </fieldset>

      <label
        htmlFor={`${uid}-emerg`}
        className={`mt-5 flex items-start gap-3 rounded-xl border p-3.5 transition-colors ${
          value.emergency ? "border-hot-line bg-hot-bg" : "border-line bg-surface-2 hover:border-line-strong"
        }`}
      >
        <span className="relative mt-0.5 inline-flex flex-none">
          <input
            id={`${uid}-emerg`}
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={value.emergency}
            onChange={(e) => onChange({ ...value, emergency: e.target.checked })}
          />
          <span
            aria-hidden="true"
            className="h-6 w-10 rounded-full bg-line-strong transition-colors peer-checked:bg-hot peer-focus-visible:shadow-[var(--focus)]"
          />
          <span
            aria-hidden="true"
            className="absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform duration-200 peer-checked:translate-x-4"
          />
        </span>
        <span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Zap className={`size-3.5 ${value.emergency ? "text-hot" : "text-muted"}`} aria-hidden="true" />
            Emergency mode
          </span>
          <span className="mt-0.5 block text-[0.8125rem] text-muted">
            Ignore the window and book the very first slot that appears.
          </span>
        </span>
      </label>
    </section>
  );
}

function RangeCard({
  index,
  range: r,
  uid,
  today,
  horizon,
  canRemove,
  issueFor,
  touch,
  onChange,
  onRemove,
}: {
  index: number;
  range: DateRange;
  uid: string;
  today: string;
  horizon: string;
  canRemove: boolean;
  issueFor: (field: string) => { message: string } | undefined;
  touch: (field: string) => void;
  onChange: (patch: Partial<DateRange>) => void;
  onRemove: () => void;
}) {
  const fromIssue = issueFor(`ranges.${index}.from`);
  const toIssue = issueFor(`ranges.${index}.to`);
  const setTime = (j: number, patch: Partial<TimeRange>) =>
    onChange({ times: r.times.map((t, k) => (k === j ? { ...t, ...patch } : t)) });

  const presets: { label: string; times: TimeRange[] }[] = [
    { label: "Mornings", times: [{ start: "SOD", end: "12:00" }] },
    { label: "From 14:00", times: [{ start: "14:00", end: "EOD" }] },
    { label: "Any time", times: [] },
  ];

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Date range {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove date range ${index + 1}`}
            className="grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-hot-bg hover:text-hot"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-from`} className="mb-1.5 block text-sm font-medium text-ink-2">
            From <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${uid}-from`}
            type="date"
            className="field font-mono text-[0.9375rem] tabular"
            value={r.from ?? ""}
            min={today}
            max={horizon}
            onChange={(e) => onChange({ from: e.target.value || null })}
            onBlur={() => touch(`ranges.${index}.from`)}
            aria-invalid={!!fromIssue}
            aria-describedby={fromIssue ? `${uid}-from-err` : `${uid}-desc`}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-to`} className="mb-1.5 block text-sm font-medium text-ink-2">
            To <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${uid}-to`}
            type="date"
            className="field font-mono text-[0.9375rem] tabular"
            value={r.to ?? ""}
            min={r.from || today}
            max={horizon}
            onChange={(e) => onChange({ to: e.target.value || null })}
            onBlur={() => touch(`ranges.${index}.to`)}
            aria-invalid={!!toIssue}
            aria-describedby={toIssue ? `${uid}-to-err` : `${uid}-desc`}
          />
        </div>
      </div>
      {fromIssue && <FieldError id={`${uid}-from-err`}>{fromIssue.message}</FieldError>}
      {toIssue && <FieldError id={`${uid}-to-err`}>{toIssue.message}</FieldError>}

      <p id={`${uid}-desc`} className="mt-2 flex flex-wrap items-center gap-x-3 text-[0.8125rem] text-muted">
        <span>
          Means <span className="font-medium text-ink-2">{describeDates(r)}</span>, {describeTimes(r)}.
        </span>
        {r.from && r.to !== r.from && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-semibold text-accent hover:text-accent-ink"
            onClick={() => onChange({ to: r.from })}
          >
            Only this day
          </button>
        )}
      </p>

      <div className="mt-2 border-t border-line pt-3">
        <p className="mb-2 text-sm font-medium text-ink-2">
          Times of day <span className="font-normal text-muted">(optional)</span>
        </p>
        <ul className="space-y-2">
          {r.times.map((t, j) => {
            const field = `ranges.${index}.times.${j}`;
            const issue = issueFor(field);
            return (
              <li key={j}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    className="field min-w-0 flex-1 text-center font-mono tabular"
                    value={t.start}
                    placeholder="09:00"
                    aria-label={`Date range ${index + 1}, time range ${j + 1} starts at`}
                    aria-invalid={!!issue}
                    aria-describedby={issue ? `${uid}-t${j}-err` : undefined}
                    onChange={(e) => setTime(j, { start: e.target.value })}
                    onBlur={(e) => {
                      setTime(j, { start: normaliseClock(e.target.value) });
                      touch(field);
                    }}
                  />
                  <span className="text-xs text-muted" aria-hidden="true">to</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    className="field min-w-0 flex-1 text-center font-mono tabular"
                    value={t.end}
                    placeholder="EOD"
                    aria-label={`Date range ${index + 1}, time range ${j + 1} ends before`}
                    aria-invalid={!!issue}
                    aria-describedby={issue ? `${uid}-t${j}-err` : undefined}
                    onChange={(e) => setTime(j, { end: e.target.value })}
                    onBlur={(e) => {
                      setTime(j, { end: normaliseClock(e.target.value) });
                      touch(field);
                    }}
                  />
                  <button
                    type="button"
                    className="grid size-11 flex-none place-items-center rounded-[0.625rem] border border-line text-muted transition-colors hover:border-hot-line hover:bg-hot-bg hover:text-hot"
                    aria-label={`Remove time range ${j + 1} from date range ${index + 1}`}
                    onClick={() => onChange({ times: r.times.filter((_, k) => k !== j) })}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {issue && <FieldError id={`${uid}-t${j}-err`}>{issue.message}</FieldError>}
              </li>
            );
          })}
        </ul>

        {r.times.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            24-hour clock. The start is bookable, the end is not: “09:00 to 12:00” takes 11:45 but not 12:00. Use{" "}
            <span className="font-mono">SOD</span> / <span className="font-mono">EOD</span> for start / end of day.
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md pr-2 text-sm font-semibold text-accent hover:text-accent-ink disabled:opacity-50"
            disabled={r.times.length >= MAX_TIME_RANGES}
            onClick={() => onChange({ times: [...r.times, { start: "09:00", end: "12:00" }] })}
          >
            <Plus className="size-4" aria-hidden="true" /> Add a time range
          </button>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ times: p.times })}
              className="min-h-11 rounded-full border border-line bg-surface px-3.5 text-sm text-ink-2 transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-accent-ink sm:min-h-9"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] text-hot">
      <span
        aria-hidden="true"
        className="mt-[3px] grid size-3.5 flex-none place-items-center rounded-full bg-hot text-[9px] font-bold text-surface"
      >
        !
      </span>
      {children}
    </p>
  );
}
