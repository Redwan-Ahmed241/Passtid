"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, daysInMonth, firstWeekdayIndex, formatDayLong, formatMonth, monthOf, weekday } from "@/lib/time";

export interface DayInfo {
  /** Open slots that day. */
  total: number;
  /** How many of them are inside the booking window. */
  inWindow: number;
  /** The caller holds a pending or booked entry that day. */
  mine: boolean;
}

interface Props {
  /** "YYYY-MM" */
  month: string;
  today: string;
  scannedUntil: string;
  days: Map<string, DayInfo>;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
  onMonthChange: (month: string) => void;
}

const WEEKDAYS = [
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"],
  ["Sun", "Sunday"],
] as const;

export function MonthCalendar({ month, today, scannedUntil, days, selectedDay, onSelectDay, onMonthChange }: Props) {
  const first = monthOf(today);
  const last = monthOf(scannedUntil);
  const canPrev = month > first;
  const canNext = month < last;
  const count = daysInMonth(month);
  // In the running month, weeks that are entirely in the past carry nothing to pick, so the grid
  // starts at this week's Monday instead of pushing the usable days below the fold.
  const todayIndex = (weekday(today) + 6) % 7;
  const startDay = month === first ? Math.max(1, Number(today.slice(8)) - todayIndex) : 1;
  const blanks = startDay === 1 ? firstWeekdayIndex(month) : 0;
  const cells = Array.from(
    { length: count - startDay + 1 },
    (_, i) => `${month}-${String(startDay + i).padStart(2, "0")}`,
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={!canPrev}
          aria-label="Previous month"
          className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink transition-colors hover:border-line-strong disabled:opacity-35"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <h3 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink" aria-live="polite">
          {formatMonth(month)}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          disabled={!canNext}
          aria-label="Next month"
          className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink transition-colors hover:border-line-strong disabled:opacity-35"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label={`Days in ${formatMonth(month)}`}>
        {WEEKDAYS.map(([short, long]) => (
          <div key={short} className="pb-1 text-center font-mono text-[0.6875rem] tracking-wide text-muted uppercase">
            <abbr title={long} className="no-underline">
              {short}
            </abbr>
          </div>
        ))}

        {Array.from({ length: blanks }, (_, i) => (
          <div key={`b${i}`} aria-hidden="true" />
        ))}

        {cells.map((day) => {
          const info = days.get(day);
          const n = Number(day.slice(8));
          const isToday = day === today;
          const interactive = !!info && info.total > 0 && day >= today && day <= scannedUntil;
          const selected = selectedDay === day;

          if (!interactive) {
            return (
              <div
                key={day}
                className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-sm text-muted/60 sm:min-h-14 ${
                  isToday ? "ring-1 ring-line-strong" : ""
                }`}
              >
                <span className="tabular">{n}</span>
              </div>
            );
          }

          const slotsLabel = `${info.total} open slot${info.total > 1 ? "s" : ""}`;
          const windowLabel =
            info.inWindow > 0 ? `${info.inWindow} inside your window` : "none inside your window";
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={selected}
              aria-label={`${formatDayLong(day)}, ${slotsLabel}, ${windowLabel}${info.mine ? ", you have a booking" : ""}`}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm transition-colors sm:min-h-14 ${
                selected
                  ? "border-accent bg-accent text-on-accent shadow-sm"
                  : info.inWindow > 0
                    ? "border-accent-line bg-accent-soft text-accent-ink hover:border-accent"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong"
              } ${isToday && !selected ? "ring-2 ring-line-strong ring-offset-1 ring-offset-surface" : ""}`}
            >
              <span className="font-semibold tabular">{n}</span>
              <span
                aria-hidden="true"
                className={`font-mono text-[0.6875rem] leading-none tabular ${selected ? "text-on-accent/80" : "opacity-75"}`}
              >
                {info.total}
              </span>
              {info.mine && (
                <span
                  aria-hidden="true"
                  className={`absolute top-1 right-1 grid size-3.5 place-items-center rounded-full ${
                    selected ? "bg-on-accent text-accent" : "bg-clear text-surface"
                  }`}
                >
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted" aria-label="Calendar key">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-accent-line bg-accent-soft" aria-hidden="true" /> Inside your window
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-line bg-surface" aria-hidden="true" /> Outside your window
        </li>
        <li>
          Number = open slots that day
        </li>
      </ul>
    </div>
  );
}
