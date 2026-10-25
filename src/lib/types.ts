/**
 * Shared contract between the UI and the route handlers in src/app/api/v1.
 */

/** The two services one user can hold: passports / ID cards, and migration (coordination numbers). */
export type SystemId = "passport" | "migration";

export const SYSTEMS: readonly SystemId[] = ["passport", "migration"] as const;

export interface SystemInfo {
  id: SystemId;
  name: string;
  short: string;
  /** How many weeks ahead the scanner looks before it stops. */
  scanWeeks: number;
  /** Whether the upstream site publishes its own "N free" count per slot. */
  showsFreeCount: boolean;
  /** Which identifier each person must supply for this service. */
  identifier: "personalNumber" | "phone";
}

export const SYSTEM_INFO: Record<SystemId, SystemInfo> = {
  passport: {
    id: "passport",
    name: "Passport / National ID",
    short: "Passport / ID",
    scanWeeks: 12,
    showsFreeCount: false,
    identifier: "personalNumber",
  },
  migration: {
    id: "migration",
    name: "Migration (coordination number)",
    short: "Migration",
    scanWeeks: 8,
    showsFreeCount: true,
    identifier: "phone",
  },
};

export function isSystemId(value: unknown): value is SystemId {
  return value === "passport" || value === "migration";
}

/* ----------------------------- auth ----------------------------- */

export interface User {
  id: string;
  name: string;
  email: string;
}

/* ------------------------- booking window ------------------------ */

/** A clock boundary. "SOD" = start of day (00:00), "EOD" = end of day (24:00). */
export type ClockValue = string;

export interface TimeRange {
  start: ClockValue;
  end: ClockValue;
}

/**
 * One date range with its own optional time ranges.
 *  - from + to : both dates count
 *  - from only : that date onwards
 *  - to only   : from now until that date
 *  - from = to : that single day
 * No time ranges means any time of day on those dates.
 */
export interface DateRange {
  id: string;
  /** Inclusive, YYYY-MM-DD, embassy local date, or null for "from now". */
  from: string | null;
  /** Inclusive, YYYY-MM-DD, or null for "no end". */
  to: string | null;
  times: TimeRange[];
}

export interface BookingWindow {
  /** A slot matches if it falls inside ANY range. */
  ranges: DateRange[];
  /** Ignore the window and take the first slot that appears. */
  emergency: boolean;
}

/* --------------------------- applicants -------------------------- */

export interface Person {
  firstName: string;
  lastName: string;
  /** Passport / ID service only. Not the same thing as a phone number. */
  personalNumber: string;
  /** Migration service only. */
  phone: string;
}

export const MAX_PERSONS = 6;

/** Everything needed to submit a booking for one service. */
export interface BookingRequest {
  persons: Person[];
  /** One contact email for the whole submission. */
  email: string;
  window: BookingWindow;
}

export interface RequestResponse {
  request: BookingRequest;
  updatedAt: string | null;
  /** True when persons and email are complete, so a booking can be started. */
  complete: boolean;
}

/* ------------------------- bookings & slots ---------------------- */

export type BookingStatus = "pending" | "booked" | "released";

export type ReleaseReason = "failed" | "cancelled" | "timed_out" | "slot_gone";

export interface Booking {
  id: string;
  system: SystemId;
  /** Embassy-local ISO date-time without offset, e.g. 2026-10-23T09:30 */
  slot: string;
  status: BookingStatus;
  reason: ReleaseReason | null;
  /** Booking number from the upstream site once booked. */
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  /** Embassy-local ISO date-time without offset, e.g. 2026-10-23T09:30 */
  slot: string;
  /** The upstream site's own free-seat label. Never merged into `queued`. */
  freeOnSite: number | null;
  /** Counted queue entries on this exact slot (pending + booked, fresh < 15 min). */
  queued: number;
  /** The caller's own active entry on this slot, if any. */
  mine: { bookingId: string; status: Exclude<BookingStatus, "released">; reference: string | null } | null;
}

export interface SlotsResponse {
  system: SystemId;
  timezone: string;
  /** Embassy-local "today", YYYY-MM-DD. */
  today: string;
  /** Last date the scanner looked at, YYYY-MM-DD. */
  scannedUntil: string;
  scanWeeks: number;
  generatedAt: string;
  slots: Slot[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

/* ------------------------------ payments ------------------------------ */

/** What a customer can buy. "notify" = Telegram alerts only; "autobook" = the bot books the slot for them. */
export type PlanId = "notify" | "autobook";

export const PLAN_IDS: readonly PlanId[] = ["notify", "autobook"] as const;

export function isPlanId(value: unknown): value is PlanId {
  return value === "notify" || value === "autobook";
}

export interface Plan {
  id: PlanId;
  /** Price in the smallest currency unit (cents). Set on the server, so the UI never hard-codes it. */
  amountCents: number;
  currency: "usd";
}

export interface PlansResponse {
  plans: Plan[];
  /** True when no Stripe key is configured, so checkout is simulated and nobody is charged. */
  demo: boolean;
}

export interface CheckoutResponse {
  /** Where to send the browser: Stripe Checkout, or straight back to the console in demo mode. */
  url: string;
  demo: boolean;
}

/** Telegram alerts for one service, active once the notification plan is paid. */
export interface AlertSubscription {
  id: string;
  system: SystemId;
  /** Deep link that connects this account to the Telegram bot, when the bot username is configured. */
  telegramUrl: string | null;
}

export interface ConfirmResponse {
  plan: PlanId;
  system: SystemId;
  /** Set for the auto-book plan: the booking that was started. */
  booking: Booking | null;
  /** Set for the notification plan. */
  alert: AlertSubscription | null;
  /** Auto-book was paid but no slot fits yet: the bot keeps watching and books when one opens. */
  watching: boolean;
}
