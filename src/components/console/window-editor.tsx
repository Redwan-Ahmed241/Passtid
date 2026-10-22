"use client";

import { useId, useState } from "react";
import { Plus, X, Zap } from "lucide-react";
import type { BookingWindow, TimeRange } from "@/lib/types";
import { addDays } from "@/lib/time";
import { normaliseClock, validateWindow } from "@/lib/window";

interface Props {
  value: BookingWindow;
  today: string;
  horizon: string;
  onChange: (next: BookingWindow) => void;
}

const MAX_RANGES = 6;

export function WindowEditor({ value, today, horizon, onChange }: Props) {
  const uid = useId();
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const issues = validateWindow(value);
  const issueFor = (field: string) => (touched.has(field) ? issues.find((i) => i.field === field) : undefined);
  const touch = (field: string) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));

  const set = (patch: Partial<BookingWindow>) => onChange({ ...value, ...patch });
  const setTime = (i: number, patch: Partial<TimeRange>) =>
    set({ times: value.times.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const presets: { label: string; apply: () => void }[] = [
    { label: "Mornings", apply: () => set({ times: [{ start: "09:00", end: "12:00" }] }) },
    { label: "From 14:00", apply: () => set({ times: [{ start: "14:00", end: "EOD" }] }) },
    { label: "Any time", apply: () => set({ times: [] }) },
    { label: "Next 7 days", apply: () => set({ from: today, to: addDays(today, 6) }) },
    { label: "Whole scan", apply: () => set({ from: today, to: horizon }) },
  ];

  const fromIssue = issueFor("from");
  const toIssue = issueFor("to");

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 id={`${uid}-h`} className="label-mono">Your booking window</h2>
      </div>

      <fieldset className="mt-4" disabled={value.emergency}>
        <legend className="sr-only">Dates</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${uid}-from`} className="mb-1.5 block text-sm font-medium text-ink-2">
              From
            </label>
            <input
              id={`${uid}-from`}
              type="date"
              className="field font-mono text-[0.9375rem] tabular disabled:opacity-50"
              value={value.from}
              min={today}
              max={horizon}
              onChange={(e) => set({ from: e.target.value })}
              onBlur={() => touch("from")}
              aria-invalid={!!fromIssue}
              aria-describedby={fromIssue ? `${uid}-from-err` : undefined}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-to`} className="mb-1.5 block text-sm font-medium text-ink-2">
              To <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={`${uid}-to`}
              type="date"
              className="field font-mono text-[0.9375rem] tabular disabled:opacity-50"
              value={value.to ?? ""}
              min={value.from || today}
              max={horizon}
              onChange={(e) => set({ to: e.target.value || null })}
              onBlur={() => touch("to")}
              aria-invalid={!!toIssue}
              aria-describedby={toIssue ? `${uid}-to-err` : `${uid}-to-hint`}
            />
          </div>
        </div>
        {fromIssue && <FieldError id={`${uid}-from-err`}>{fromIssue.message}</FieldError>}
        {toIssue ? (
          <FieldError id={`${uid}-to-err`}>{toIssue.message}</FieldError>
        ) : (
          <p id={`${uid}-to-hint`} className="mt-1.5 text-xs text-muted">
            Both dates count. Leave “To” empty to look from the start date onwards.
          </p>
        )}
      </fieldset>

      <fieldset className="mt-5" disabled={value.emergency}>
        <legend className="mb-1.5 text-sm font-medium text-ink-2">
          Times of day <span className="font-normal text-muted">(empty means any time)</span>
        </legend>

        <ul className="space-y-2">
          {value.times.map((t, i) => {
            const field = `times.${i}`;
            const issue = issueFor(field);
            return (
              <li key={i}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    className="field min-w-0 flex-1 text-center font-mono tabular disabled:opacity-50"
                    value={t.start}
                    placeholder="09:00"
                    aria-label={`Range ${i + 1} starts at`}
                    aria-invalid={!!issue}
                    aria-describedby={issue ? `${uid}-t${i}-err` : `${uid}-times-hint`}
                    onChange={(e) => setTime(i, { start: e.target.value })}
                    onBlur={(e) => {
                      setTime(i, { start: normaliseClock(e.target.value) });
                      touch(field);
                    }}
                  />
                  <span className="text-xs text-muted" aria-hidden="true">to</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    className="field min-w-0 flex-1 text-center font-mono tabular disabled:opacity-50"
                    value={t.end}
                    placeholder="EOD"
                    aria-label={`Range ${i + 1} ends before`}
                    aria-invalid={!!issue}
                    aria-describedby={issue ? `${uid}-t${i}-err` : `${uid}-times-hint`}
                    onChange={(e) => setTime(i, { end: e.target.value })}
                    onBlur={(e) => {
                      setTime(i, { end: normaliseClock(e.target.value) });
                      touch(field);
                    }}
                  />
                  <button
                    type="button"
                    className="grid size-11 flex-none place-items-center rounded-[0.625rem] border border-line text-muted transition-colors hover:border-hot-line hover:bg-hot-bg hover:text-hot"
                    aria-label={`Remove range ${i + 1}`}
                    onClick={() => set({ times: value.times.filter((_, j) => j !== i) })}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {issue && <FieldError id={`${uid}-t${i}-err`}>{issue.message}</FieldError>}
              </li>
            );
          })}
        </ul>

        {value.times.length === 0 && (
          <p className="rounded-[0.625rem] border border-dashed border-line-strong px-3 py-2.5 text-sm text-muted">
            Any time of day on the chosen dates.
          </p>
        )}

        <p id={`${uid}-times-hint`} className="mt-2 text-xs text-muted">
          24-hour clock. The start is bookable, the end is not: “09:00 to 12:00” takes 11:45 but not 12:00.
          Type <span className="font-mono">EOD</span> for end of day.
        </p>

        <button
          type="button"
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold text-accent hover:text-accent-ink disabled:opacity-50"
          disabled={value.times.length >= MAX_RANGES}
          onClick={() => set({ times: [...value.times, { start: "09:00", end: "EOD" }] })}
        >
          <Plus className="size-4" aria-hidden="true" /> Add a time range
        </button>
      </fieldset>

      <div className="mt-4 border-t border-line-2 pt-4">
        <p className="label-mono mb-2.5">Quick picks</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={value.emergency}
              onClick={p.apply}
              className="min-h-11 rounded-full border sm:min-h-9 border-line bg-surface-2 px-3.5 text-sm text-ink-2 transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-accent-ink disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

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
            onChange={(e) => set({ emergency: e.target.checked })}
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
