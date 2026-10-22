/** All slot times are the embassy's local clock (London), whatever the server's timezone. */
export const EMBASSY_TZ = "Europe/London";

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in the embassy's timezone, YYYY-MM-DD. */
export function embassyToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EMBASSY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current embassy-local wall time, HH:MM. */
export function embassyClock(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EMBASSY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

/** Date arithmetic on plain YYYY-MM-DD strings (no timezone drift). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday, for a plain YYYY-MM-DD string. */
export function weekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const dayOf = (iso: string) => iso.slice(0, 10);
export const clockOf = (iso: string) => iso.slice(11, 16);

function utcDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** "Thursday 22 October" */
export function formatDayLong(dayOrIso: string): string {
  return utcDate(dayOf(dayOrIso)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** "Thu 22 Oct" */
export function formatDayShort(dayOrIso: string): string {
  return utcDate(dayOf(dayOrIso)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "22 Oct" */
export function formatDayCompact(dayOrIso: string): string {
  return utcDate(dayOf(dayOrIso)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Human relative label for a day relative to today. */
export function relativeDay(day: string, today: string): string | null {
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  return null;
}

/* ------------------------------ months ------------------------------ */

/** "2026-10-23" -> "2026-10" */
export const monthOf = (dayOrIso: string) => dayOrIso.slice(0, 7);

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Position of the 1st of the month in a Monday-first week: 0 = Monday … 6 = Sunday. */
export function firstWeekdayIndex(month: string): number {
  return (weekday(`${month}-01`) + 6) % 7;
}

/** "October 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function minutesToClock(mins: number): string {
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}
