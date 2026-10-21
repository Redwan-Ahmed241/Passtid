/**
 * Shared contract between this frontend and the booking backend.
 * The bundled mock API (src/app/api/v1) implements exactly these shapes, so
 * pointing NEXT_PUBLIC_API_BASE_URL at the real backend needs no UI changes.
 */

export type SystemId = "passport" | "coordination";

export const SYSTEMS: readonly SystemId[] = ["passport", "coordination"] as const;

export interface SystemInfo {
  id: SystemId;
  name: string;
  short: string;
  /** How many weeks ahead the scanner looks before it stops. */
  scanWeeks: number;
  /** Whether the upstream site publishes its own "N free" count per slot. */
  showsFreeCount: boolean;
}

export const SYSTEM_INFO: Record<SystemId, SystemInfo> = {
  passport: {
    id: "passport",
    name: "Passport / National ID",
    short: "Passport / ID",
    scanWeeks: 12,
    showsFreeCount: false,
  },
  coordination: {
    id: "coordination",
    name: "Coordination number",
    short: "Coordination no.",
    scanWeeks: 8,
    showsFreeCount: true,
  },
};

export function isSystemId(value: unknown): value is SystemId {
  return value === "passport" || value === "coordination";
}

/** A clock boundary. "SOD" = start of day (00:00), "EOD" = end of day (24:00). */
export type ClockValue = string;

export interface TimeRange {
  start: ClockValue;
  end: ClockValue;
}

export interface BookingWindow {
  /** Inclusive, YYYY-MM-DD, embassy local date. */
  from: string;
  /** Inclusive, YYYY-MM-DD, or null for "from the start date onwards". */
  to: string | null;
  /** Empty = any time of day. A slot matches if it falls inside ANY range. */
  times: TimeRange[];
  /** Ignore the window and take the first slot that appears. */
  emergency: boolean;
}

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
  mine: { bookingId: string; status: Exclude<BookingStatus, "released"> } | null;
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

export interface WindowResponse {
  window: BookingWindow;
  updatedAt: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
