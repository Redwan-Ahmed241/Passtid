import type { BookingWindow, TimeRange } from "./types";
import { clockOf, dayOf, formatDayShort, minutesToClock } from "./time";

/**
 * The booking-window rules from the user story, in one place, used by both the
 * UI and the mock API so they can never disagree:
 *  - start of a time range is included, the end is excluded
 *  - both dates of the date range are included
 *  - no time ranges = any time of day; no end date = open-ended
 *  - several ranges = a slot matches if it is inside ANY of them
 */

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const DAY_END = 24 * 60;

/** Parse a clock boundary into minutes since midnight, or null if invalid. */
export function parseClock(value: string, edge: "start" | "end"): number | null {
  const v = value.trim().toUpperCase();
  if (v === "SOD") return 0;
  if (v === "EOD") return DAY_END;
  if (v === "24:00" && edge === "end") return DAY_END;
  const m = CLOCK_RE.exec(v);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Normalise loose input such as "9", "930", "9.30" or "eod" into canonical form. */
export function normaliseClock(value: string): string {
  const v = value.trim();
  if (/^(sod|eod)$/i.test(v)) return v.toUpperCase();
  const digits = v.replace(/[.:h\s]/gi, "");
  if (!/^\d{1,4}$/.test(digits)) return v;
  let h: number;
  let m: number;
  if (digits.length <= 2) {
    h = Number(digits);
    m = 0;
  } else {
    h = Number(digits.slice(0, digits.length - 2));
    m = Number(digits.slice(-2));
  }
  if (h === 24 && m === 0) return "EOD";
  if (h > 23 || m > 59) return v;
  return minutesToClock(h * 60 + m);
}

export interface RangeMinutes {
  start: number;
  end: number;
}

export interface WindowIssue {
  field: "from" | "to" | `times.${number}`;
  message: string;
}

export function validateWindow(w: BookingWindow): WindowIssue[] {
  const issues: WindowIssue[] = [];
  if (!w.from || !DAY_RE.test(w.from)) {
    issues.push({ field: "from", message: "Pick a start date." });
  }
  if (w.to !== null) {
    if (!DAY_RE.test(w.to)) {
      issues.push({ field: "to", message: "The end date is not a valid date." });
    } else if (w.from && w.to < w.from) {
      issues.push({ field: "to", message: "The end date is before the start date." });
    }
  }
  w.times.forEach((t, i) => {
    const s = parseClock(t.start, "start");
    const e = parseClock(t.end, "end");
    const label = `“${t.start || "?"} – ${t.end || "?"}”`;
    if (s === null || e === null) {
      issues.push({
        field: `times.${i}`,
        message: `${label} is not a valid time range. Use 24-hour HH:MM, or EOD for end of day.`,
      });
    } else if (e <= s) {
      issues.push({ field: `times.${i}`, message: `${label} ends before it starts.` });
    }
  });
  return issues;
}

/** Valid ranges only, in minutes. Invalid rows are ignored (and reported by validateWindow). */
export function windowRanges(times: TimeRange[]): RangeMinutes[] {
  const out: RangeMinutes[] = [];
  for (const t of times) {
    const s = parseClock(t.start, "start");
    const e = parseClock(t.end, "end");
    if (s !== null && e !== null && e > s) out.push({ start: s, end: e });
  }
  return out;
}

export function matchesWindow(slotIso: string, w: BookingWindow): boolean {
  if (w.emergency) return true;
  if (!w.from) return false;
  const day = dayOf(slotIso);
  if (day < w.from) return false;
  if (w.to && day > w.to) return false;
  const ranges = windowRanges(w.times);
  if (ranges.length === 0) return true;
  const m = parseClock(clockOf(slotIso), "start");
  if (m === null) return false;
  return ranges.some((r) => m >= r.start && m < r.end);
}

export function formatRange(r: RangeMinutes): string {
  return `${minutesToClock(r.start)}–${r.end >= DAY_END ? "EOD" : minutesToClock(r.end)}`;
}

/** The exact sentence the user is told in the chat and that appears in the logs. */
export function describeWindow(w: BookingWindow): string {
  if (w.emergency) return "any slot, whenever it appears";
  if (!w.from) return "no valid window yet";
  const days = w.to
    ? `${formatDayShort(w.from)} – ${formatDayShort(w.to)}`
    : `from ${formatDayShort(w.from)} onwards`;
  const ranges = windowRanges(w.times);
  const clocks = ranges.length ? ranges.map(formatRange).join(", ") : "any time of day";
  return `${days}, ${clocks}`;
}

export function sameWindow(a: BookingWindow, b: BookingWindow): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
