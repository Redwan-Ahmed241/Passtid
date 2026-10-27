import type { BookingWindow, DateRange, TimeRange } from "./types";
import type { Lang, TranslationKey } from "./i18n/translations";
import { translate } from "./i18n/translations";
import { clockOf, dayOf, formatDayShort, minutesToClock } from "./time";

/**
 * The booking-window rules, in one place, used by both the UI and the mock API
 * so they can never disagree:
 *  - a window is a list of date ranges; a slot matches if it is inside ANY of them
 *  - each date range has its own optional time ranges (none = any time of day)
 *  - start of a time range is included, the end is excluded
 *  - both dates of a date range are included; either date may be left open
 */

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const DAY_END = 24 * 60;
export const MAX_DATE_RANGES = 5;
export const MAX_TIME_RANGES = 6;

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
  /** e.g. "ranges", "ranges.0.from", "ranges.0.to", "ranges.0.times.1" */
  field: string;
  /** English text for API errors; the UI translates `key` instead. */
  message: string;
  key?: TranslationKey;
}

export function emptyRange(id: string, from: string | null = null, to: string | null = null): DateRange {
  return { id, from, to, times: [] };
}

function validateRange(r: DateRange, i: number): WindowIssue[] {
  const issues: WindowIssue[] = [];
  const hasFrom = !!r.from;
  const hasTo = !!r.to;
  if (hasFrom && !DAY_RE.test(r.from as string)) {
    issues.push({ field: `ranges.${i}.from`, message: "The start date is not a valid date.", key: "errBadFrom" });
  }
  if (hasTo && !DAY_RE.test(r.to as string)) {
    issues.push({ field: `ranges.${i}.to`, message: "The end date is not a valid date.", key: "errBadTo" });
  }
  if (!hasFrom && !hasTo) {
    issues.push({ field: `ranges.${i}.from`, message: "Add a start date, an end date, or both.", key: "errAddDate" });
  } else if (hasFrom && hasTo && (r.to as string) < (r.from as string)) {
    issues.push({ field: `ranges.${i}.to`, message: "The end date is before the start date.", key: "errEndBeforeStart" });
  }
  r.times.forEach((t, j) => {
    const s = parseClock(t.start, "start");
    const e = parseClock(t.end, "end");
    const label = `“${t.start || "?"} to ${t.end || "?"}”`;
    if (s === null || e === null) {
      issues.push({
        field: `ranges.${i}.times.${j}`,
        message: `${label} is not a valid time range. Use 24-hour HH:MM, or SOD / EOD for start / end of day.`,
      });
    } else if (e <= s) {
      issues.push({ field: `ranges.${i}.times.${j}`, message: `${label} ends before it starts.` });
    }
  });
  return issues;
}

/** Emergency mode ignores the window entirely, so there is nothing to validate. */
export function validateWindow(w: BookingWindow): WindowIssue[] {
  if (w.emergency) return [];
  if (w.ranges.length === 0) {
    return [{ field: "ranges", message: "Add at least one date range.", key: "errAddRange" }];
  }
  return w.ranges.flatMap(validateRange);
}

/** Valid time ranges only, in minutes. Invalid rows are ignored (and reported by validateWindow). */
export function timeRanges(times: TimeRange[]): RangeMinutes[] {
  const out: RangeMinutes[] = [];
  for (const t of times) {
    const s = parseClock(t.start, "start");
    const e = parseClock(t.end, "end");
    if (s !== null && e !== null && e > s) out.push({ start: s, end: e });
  }
  return out;
}

function matchesRange(slotIso: string, r: DateRange): boolean {
  if (!r.from && !r.to) return false;
  const day = dayOf(slotIso);
  if (r.from && day < r.from) return false;
  if (r.to && day > r.to) return false;
  const ranges = timeRanges(r.times);
  if (ranges.length === 0) return true;
  const m = parseClock(clockOf(slotIso), "start");
  if (m === null) return false;
  return ranges.some((t) => m >= t.start && m < t.end);
}

export function matchesWindow(slotIso: string, w: BookingWindow): boolean {
  if (w.emergency) return true;
  return w.ranges.some((r) => matchesRange(slotIso, r));
}

export function formatRange(r: RangeMinutes): string {
  return `${minutesToClock(r.start)}–${r.end >= DAY_END ? "EOD" : minutesToClock(r.end)}`;
}

const LOCALES: Record<Lang, string> = { en: "en-GB", sv: "sv-SE" };

/** "Thu 22 Oct – Wed 4 Nov", "from Thu 22 Oct onwards", "until Wed 4 Nov", "Thu 22 Oct only". */
export function describeDates(r: DateRange, lang: Lang = "en"): string {
  const d = (day: string) => formatDayShort(day, LOCALES[lang]);
  if (r.from && r.to) {
    return r.from === r.to ? translate(lang, "onlyDay", { d: d(r.from) }) : `${d(r.from)} – ${d(r.to)}`;
  }
  if (r.from) return translate(lang, "fromOnwards", { d: d(r.from) });
  if (r.to) return translate(lang, "until", { d: d(r.to) });
  return translate(lang, "noDatesYet");
}

export function describeTimes(r: DateRange, lang: Lang = "en"): string {
  const ranges = timeRanges(r.times);
  return ranges.length ? ranges.map(formatRange).join(", ") : translate(lang, "anyTimeOfDay");
}

/** The exact sentence the user is told in the chat and that appears in the logs. */
export function describeWindow(w: BookingWindow, lang: Lang = "en"): string {
  if (w.emergency) return translate(lang, "anySlotAnytime");
  const valid = w.ranges.filter((r) => r.from || r.to);
  if (valid.length === 0) return translate(lang, "noRangeYetShort");
  return valid.map((r) => `${describeDates(r, lang)}, ${describeTimes(r, lang)}`).join("; ");
}

export function sameWindow(a: BookingWindow, b: BookingWindow): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
