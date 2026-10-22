/**
 * In-memory stand-in for the separate booking backend.
 *
 * It implements the same contract as src/lib/types.ts and the queue rules from
 * the user story, so the UI can be developed and demoed without the real
 * service. Set NEXT_PUBLIC_API_BASE_URL to the real backend and this module is
 * never called by the browser.
 */
import { randomUUID } from "node:crypto";
import {
  SYSTEM_INFO,
  type Booking,
  type BookingRequest,
  type ReleaseReason,
  type RequestResponse,
  type Slot,
  type SlotsResponse,
  type SystemId,
} from "@/lib/types";
import { emptyPerson, isComplete } from "@/lib/applicants";
import { EMBASSY_TZ, addDays, embassyClock, embassyToday, minutesToClock, weekday } from "@/lib/time";

/** A pending entry with no progress for this long stops counting and is released. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

interface Entry extends Booking {
  clientId: string;
  heartbeat: number;
  outcomeAt: number;
  willSucceed: boolean;
}

interface Store {
  entries: Map<string, Entry>;
  /** Booking request per user and service: people, email and window. */
  requests: Map<string, { request: BookingRequest; updatedAt: string }>;
  /** Seats taken on the migration site by successful bookings, per slot key. */
  taken: Map<string, number>;
}

const globalForStore = globalThis as unknown as { __slotStore?: Store };
const store: Store = (globalForStore.__slotStore ??= {
  entries: new Map(),
  requests: new Map(),
  taken: new Map(),
});

const key = (system: SystemId, slot: string) => `${system}|${slot}`;

/* ------------------------------------------------------------------ */
/* Deterministic sample data, stable per day so a refresh looks live */
/* ------------------------------------------------------------------ */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedSlot {
  slot: string;
  free: number | null;
  baseQueue: number;
}

function seedSlots(system: SystemId, today: string, clock: string): SeedSlot[] {
  const info = SYSTEM_INFO[system];
  const days = info.scanWeeks * 7;
  const out: SeedSlot[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    const wd = weekday(day);
    if (wd === 0 || wd === 6) continue;
    const r = rng(`${system}:${day}`);
    // Sparse, like the real sites: most days have nothing, some have a few.
    const roll = r();
    const count = roll < 0.42 ? 0 : roll < 0.72 ? 1 : roll < 0.9 ? 2 : 3;
    const used = new Set<number>();
    for (let n = 0; n < count; n++) {
      // 08:30 – 16:30 in 15-minute steps
      const mins = 8 * 60 + 30 + Math.floor(r() * 33) * 15;
      if (used.has(mins)) continue;
      used.add(mins);
      const hhmm = minutesToClock(mins);
      if (day === today && hhmm <= clock) continue;
      const q = r();
      const baseQueue = q < 0.38 ? 0 : q < 0.62 ? 1 : q < 0.78 ? 2 : q < 0.88 ? 3 : q < 0.95 ? 4 : 6;
      out.push({
        slot: `${day}T${hhmm}`,
        free: info.showsFreeCount ? 1 + Math.floor(r() * 5) : null,
        baseQueue,
      });
    }
  }
  return out.sort((a, b) => a.slot.localeCompare(b.slot));
}

/* ------------------------------------------------------------------ */
/* Queue lifecycle                                                     */
/* ------------------------------------------------------------------ */

function release(e: Entry, reason: ReleaseReason, now: number) {
  e.status = "released";
  e.reason = reason;
  e.updatedAt = new Date(now).toISOString();
}

/** Move every entry forward in time. Called on each read, so state is always current. */
function advance(now: number) {
  for (const e of store.entries.values()) {
    if (e.status !== "pending") continue;
    if (now - e.heartbeat > STALE_AFTER_MS) {
      release(e, "timed_out", now);
    } else if (now >= e.outcomeAt) {
      if (e.willSucceed) {
        e.status = "booked";
        e.reference = `SE-${e.id.slice(0, 6).toUpperCase()}`;
        e.updatedAt = new Date(now).toISOString();
        if (SYSTEM_INFO[e.system].showsFreeCount) {
          const k = key(e.system, e.slot);
          store.taken.set(k, (store.taken.get(k) ?? 0) + 1);
        }
      } else {
        release(e, "slot_gone", now);
      }
    }
  }
}

/** Pending (fresh) and booked entries count; released and stale ones never do. */
function counts(e: Entry, now: number) {
  if (e.status === "booked") return true;
  return e.status === "pending" && now - e.heartbeat <= STALE_AFTER_MS;
}

function toBooking(e: Entry): Booking {
  return {
    id: e.id,
    system: e.system,
    slot: e.slot,
    status: e.status,
    reason: e.reason,
    reference: e.reference,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Public operations (used by the route handlers)                      */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function listSlots(system: SystemId, clientId: string): SlotsResponse {
  const nowDate = new Date();
  const now = nowDate.getTime();
  advance(now);
  const today = embassyToday(nowDate);
  const info = SYSTEM_INFO[system];

  const slots: Slot[] = seedSlots(system, today, embassyClock(nowDate)).map((s) => {
    const k = key(system, s.slot);
    let queued = s.baseQueue;
    let mine: Slot["mine"] = null;
    for (const e of store.entries.values()) {
      if (e.system !== system || e.slot !== s.slot || !counts(e, now)) continue;
      queued += 1;
      if (e.clientId === clientId && e.status !== "released") {
        mine = { bookingId: e.id, status: e.status, reference: e.reference };
      }
    }
    const free = s.free === null ? null : Math.max(0, s.free - (store.taken.get(k) ?? 0));
    return { slot: s.slot, freeOnSite: free, queued, mine };
  });

  return {
    system,
    timezone: EMBASSY_TZ,
    today,
    scannedUntil: addDays(today, info.scanWeeks * 7 - 1),
    scanWeeks: info.scanWeeks,
    generatedAt: nowDate.toISOString(),
    slots,
  };
}

export function createBooking(system: SystemId, slot: string, clientId: string): Booking {
  const nowDate = new Date();
  const now = nowDate.getTime();
  advance(now);

  const saved = store.requests.get(requestKey(clientId, system));
  if (!saved || !isComplete(system, saved.request)) {
    throw new ApiError(
      422,
      "incomplete_details",
      "Complete the people and email details for this service before booking.",
    );
  }
  const exists = seedSlots(system, embassyToday(nowDate), embassyClock(nowDate)).some(
    (s) => s.slot === slot,
  );
  if (!exists) {
    throw new ApiError(404, "slot_not_found", "That slot is no longer offered by the site.");
  }
  for (const e of store.entries.values()) {
    if (e.clientId === clientId && e.system === system && counts(e, now)) {
      throw new ApiError(
        409,
        "active_booking_exists",
        e.status === "booked"
          ? "You already hold an appointment on this system. Cancel it before booking another."
          : "A booking for this system is already in progress.",
      );
    }
  }

  const iso = nowDate.toISOString();
  const entry: Entry = {
    id: randomUUID(),
    system,
    slot,
    status: "pending",
    reason: null,
    reference: null,
    createdAt: iso,
    updatedAt: iso,
    clientId,
    heartbeat: now,
    outcomeAt: now + 5000 + Math.floor(Math.random() * 4000),
    willSucceed: Math.random() < 0.72,
  };
  store.entries.set(entry.id, entry);
  return toBooking(entry);
}

function ownEntry(id: string, clientId: string): Entry {
  const e = store.entries.get(id);
  if (!e || e.clientId !== clientId) {
    throw new ApiError(404, "booking_not_found", "No such booking.");
  }
  return e;
}

/** Reading a pending booking counts as progress, which refreshes its heartbeat. */
export function getBooking(id: string, clientId: string): Booking {
  const now = Date.now();
  advance(now);
  const e = ownEntry(id, clientId);
  if (e.status === "pending") e.heartbeat = now;
  return toBooking(e);
}

export function cancelBooking(id: string, clientId: string): Booking {
  const now = Date.now();
  advance(now);
  const e = ownEntry(id, clientId);
  if (e.status === "released") return toBooking(e);
  if (e.status === "booked" && SYSTEM_INFO[e.system].showsFreeCount) {
    const k = key(e.system, e.slot);
    store.taken.set(k, Math.max(0, (store.taken.get(k) ?? 0) - 1));
  }
  release(e, "cancelled", now);
  return toBooking(e);
}

const requestKey = (userId: string, system: SystemId) => `${userId}|${system}`;

/** A fresh request: one empty person, the account email, and the next two weeks, mornings and afternoons. */
export function defaultRequest(today: string, email: string): BookingRequest {
  return {
    persons: [emptyPerson()],
    email,
    window: {
      emergency: false,
      ranges: [
        {
          id: "r1",
          from: today,
          to: addDays(today, 13),
          times: [
            { start: "09:00", end: "12:00" },
            { start: "14:00", end: "EOD" },
          ],
        },
      ],
    },
  };
}

function toResponse(system: SystemId, request: BookingRequest, updatedAt: string | null): RequestResponse {
  return { request, updatedAt, complete: isComplete(system, request) };
}

export function getRequest(userId: string, system: SystemId, email: string): RequestResponse {
  const saved = store.requests.get(requestKey(userId, system));
  if (saved) return toResponse(system, saved.request, saved.updatedAt);
  return toResponse(system, defaultRequest(embassyToday(), email), null);
}

export function saveRequest(userId: string, system: SystemId, request: BookingRequest): RequestResponse {
  const updatedAt = new Date().toISOString();
  store.requests.set(requestKey(userId, system), { request, updatedAt });
  return toResponse(system, request, updatedAt);
}
