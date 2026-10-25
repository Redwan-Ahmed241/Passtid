/**
 * Everything the API reads and writes in Postgres: booking requests, slots, queue entries,
 * paid plans and Telegram alert links. Implements the contract in src/lib/types.ts.
 *
 * Slots are not invented here. The booking bot publishes what it sees on the embassy sites with
 * PUT /api/v1/bot/slots/{system}; until it does, the console shows no open slots.
 */
import { randomBytes } from "node:crypto";
import type { QueryResultRow } from "pg";
import {
  SYSTEM_INFO,
  type AlertSubscription,
  type Booking,
  type BookingRequest,
  type BookingStatus,
  type ConfirmResponse,
  type PlanId,
  type ReleaseReason,
  type RequestResponse,
  type Slot,
  type SlotsResponse,
  type SystemId,
} from "@/lib/types";
import { isComplete } from "@/lib/applicants";
import { defaultRequest } from "@/lib/defaults";
import { matchesWindow } from "@/lib/window";
import { EMBASSY_TZ, addDays, embassyClock, embassyToday } from "@/lib/time";
import { isUniqueViolation, query, transaction, withLock } from "./db";
import { ApiError } from "./errors";

export { ApiError };

/** A pending entry with no progress for this long stops counting and is released. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

interface BookingRow {
  id: string;
  user_id: string;
  system: SystemId;
  slot: string;
  status: BookingStatus;
  reason: ReleaseReason | null;
  reference: string | null;
  created_at: Date;
  updated_at: Date;
}

const toBooking = (r: BookingRow): Booking => ({
  id: r.id,
  system: r.system,
  slot: r.slot,
  status: r.status,
  reason: r.reason,
  reference: r.reference,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

const BOOKING_COLUMNS = "id, user_id, system, slot, status, reason, reference, created_at, updated_at";

/** Pending entries with no progress stop holding their slot. Called before every read of the queue. */
async function releaseStale() {
  await query(
    `update bookings set status = 'released', reason = 'timed_out', updated_at = now()
     where status = 'pending' and heartbeat < now() - ($1 || ' milliseconds')::interval`,
    [String(STALE_AFTER_MS)],
  );
}

/* ------------------------------ slots ------------------------------ */

export async function listSlots(system: SystemId, userId: string): Promise<SlotsResponse> {
  await releaseStale();
  const nowDate = new Date();
  const today = embassyToday(nowDate);
  const info = SYSTEM_INFO[system];
  const earliest = `${today}T${embassyClock(nowDate)}`;

  const rows = await query<{ slot: string; free_on_site: number | null; queued: string; mine_id: string | null; mine_status: string | null; mine_ref: string | null }>(
    `select s.slot, s.free_on_site,
            (select count(*) from bookings b where b.system = s.system and b.slot = s.slot and b.status in ('pending', 'booked')) as queued,
            m.id as mine_id, m.status as mine_status, m.reference as mine_ref
       from slots s
       left join bookings m on m.system = s.system and m.slot = s.slot and m.user_id = $2 and m.status in ('pending', 'booked')
      where s.system = $1 and s.slot > $3
      order by s.slot`,
    [system, userId, earliest],
  );

  const slots: Slot[] = rows.map((r) => ({
    slot: r.slot,
    freeOnSite: info.showsFreeCount ? r.free_on_site : null,
    queued: Number(r.queued),
    mine: r.mine_id ? { bookingId: r.mine_id, status: r.mine_status as "pending" | "booked", reference: r.mine_ref } : null,
  }));

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

/** The bot publishes the open slots it currently sees. They replace the previous list for that service. */
export async function replaceSlots(system: SystemId, slots: { slot: string; freeOnSite: number | null }[]): Promise<void> {
  await transaction(async (c) => {
    await c.query("delete from slots where system = $1", [system]);
    for (const s of slots) {
      await c.query("insert into slots (system, slot, free_on_site) values ($1, $2, $3) on conflict do nothing", [system, s.slot, s.freeOnSite]);
    }
    await c.query(
      "insert into slot_sync (system, synced_at) values ($1, now()) on conflict (system) do update set synced_at = now()",
      [system],
    );
  });
  await matchWatching(system);
}

/* ---------------------------- bookings ----------------------------- */

export async function createBooking(system: SystemId, slot: string, userId: string): Promise<Booking> {
  await releaseStale();
  const run = <T extends QueryResultRow>(text: string, params: unknown[]) => query<T>(text, params);

  const req = await getRequest(userId, system, "");
  if (!isComplete(system, req.request)) {
    throw new ApiError(422, "incomplete_details", "Complete the people and email details for this service before booking.");
  }
  const [exists] = await run<{ one: number }>("select 1 as one from slots where system = $1 and slot = $2", [system, slot]);
  if (!exists) throw new ApiError(404, "slot_not_found", "That slot is no longer offered by the site.");

  const [active] = await run<{ status: BookingStatus }>(
    "select status from bookings where user_id = $1 and system = $2 and status in ('pending', 'booked')",
    [userId, system],
  );
  if (active) {
    throw new ApiError(
      409,
      "active_booking_exists",
      active.status === "booked"
        ? "You already hold an appointment on this system. Cancel it before booking another."
        : "A booking for this system is already in progress.",
    );
  }
  try {
    const [row] = await run<BookingRow>(
      `insert into bookings (user_id, system, slot, status) values ($1, $2, $3, 'pending') returning ${BOOKING_COLUMNS}`,
      [userId, system, slot],
    );
    return toBooking(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "active_booking_exists", "A booking for this system is already in progress.");
    throw err;
  }
}

/** Reading a pending booking counts as progress, which refreshes its heartbeat. */
export async function getBooking(id: string, userId: string): Promise<Booking> {
  await releaseStale();
  const [row] = await query<BookingRow>(
    `update bookings set heartbeat = case when status = 'pending' then now() else heartbeat end
      where id::text = $1 and user_id = $2 returning ${BOOKING_COLUMNS}`,
    [id, userId],
  );
  if (!row) throw new ApiError(404, "booking_not_found", "No such booking.");
  return toBooking(row);
}

export async function cancelBooking(id: string, userId: string): Promise<Booking> {
  const [row] = await query<BookingRow>(
    `update bookings set status = 'released', reason = 'cancelled', updated_at = now()
      where id::text = $1 and user_id = $2 and status in ('pending', 'booked') returning ${BOOKING_COLUMNS}`,
    [id, userId],
  );
  if (row) return toBooking(row);
  const [existing] = await query<BookingRow>(`select ${BOOKING_COLUMNS} from bookings where id::text = $1 and user_id = $2`, [id, userId]);
  if (!existing) throw new ApiError(404, "booking_not_found", "No such booking.");
  return toBooking(existing);
}

/** The bot reports how a booking attempt ended. */
export async function recordBookingResult(
  id: string,
  result: { status: "pending" | "booked" | "released"; reason?: ReleaseReason | null; reference?: string | null },
): Promise<Booking> {
  const [row] = await query<BookingRow>(
    `update bookings
        set status = $2, reason = $3, reference = coalesce($4, reference), updated_at = now(),
            heartbeat = case when $2 = 'pending' then now() else heartbeat end
      where id::text = $1 and status in ('pending', 'booked') returning ${BOOKING_COLUMNS}`,
    [id, result.status, result.status === "released" ? (result.reason ?? "failed") : null, result.reference ?? null],
  );
  if (!row) throw new ApiError(404, "booking_not_found", "No such active booking.");
  return toBooking(row);
}

/* ------------------------ booking requests ------------------------- */

function toResponse(system: SystemId, request: BookingRequest, updatedAt: string | null): RequestResponse {
  return { request, updatedAt, complete: isComplete(system, request) };
}

export async function getRequest(userId: string, system: SystemId, email: string): Promise<RequestResponse> {
  const [row] = await query<{ request: BookingRequest; updated_at: Date }>(
    "select request, updated_at from booking_requests where user_id = $1 and system = $2",
    [userId, system],
  );
  if (row) return toResponse(system, row.request, row.updated_at.toISOString());
  return toResponse(system, defaultRequest(embassyToday(), email), null);
}

export async function saveRequest(userId: string, system: SystemId, request: BookingRequest): Promise<RequestResponse> {
  const [row] = await query<{ updated_at: Date }>(
    `insert into booking_requests (user_id, system, request) values ($1, $2, $3)
     on conflict (user_id, system) do update set request = excluded.request, updated_at = now()
     returning updated_at`,
    [userId, system, JSON.stringify(request)],
  );
  return toResponse(system, request, row.updated_at.toISOString());
}

/* --------------------------- paid plans ---------------------------- */

interface PaidInfo {
  sessionId: string;
  system: SystemId;
  plan: PlanId;
}

async function earliestMatch(system: SystemId, userId: string): Promise<string | null> {
  const nowDate = new Date();
  const { request } = await getRequest(userId, system, "");
  const open = await query<{ slot: string }>("select slot from slots where system = $1 and slot > $2 order by slot", [
    system,
    `${embassyToday(nowDate)}T${embassyClock(nowDate)}`,
  ]);
  return open.find((s) => matchesWindow(s.slot, request.window))?.slot ?? null;
}

/**
 * Turn a verified payment into what was bought. Idempotent per checkout session, and safe when the
 * browser return and Stripe's webhook arrive at the same moment.
 *  - notify   : Telegram alerts for this service
 *  - autobook : a queued booking for the earliest slot that fits the window, else the bot keeps watching
 */
export function fulfilPayment(paid: PaidInfo, userId: string): Promise<ConfirmResponse> {
  return withLock(`payment:${paid.sessionId}`, async () => {
    const [done] = await query<{ result: ConfirmResponse }>("select result from payments where session_id = $1", [paid.sessionId]);
    if (done) return done.result;

    let result: ConfirmResponse;
    if (paid.plan === "notify") {
      const code = randomBytes(12).toString("hex");
      await query("insert into alert_subscriptions (user_id, system, telegram_code) values ($1, $2, $3)", [userId, paid.system, code]);
      const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
      const alert: AlertSubscription = {
        id: code,
        system: paid.system,
        telegramUrl: bot ? `https://t.me/${bot}?start=${code}` : null,
      };
      result = { plan: "notify", system: paid.system, booking: null, alert, watching: false };
    } else {
      const slot = await earliestMatch(paid.system, userId);
      if (slot) {
        let booking: Booking | null = null;
        try {
          booking = await createBooking(paid.system, slot, userId);
        } catch (err) {
          // Another booking is already active for this service: keep the paid job watching instead of failing the payment.
          if (!(err instanceof ApiError) || err.code !== "active_booking_exists") throw err;
        }
        result = { plan: "autobook", system: paid.system, booking, alert: null, watching: !booking };
      } else {
        result = { plan: "autobook", system: paid.system, booking: null, alert: null, watching: true };
      }
    }
    await query("insert into payments (session_id, user_id, system, plan, result) values ($1, $2, $3, $4, $5)", [
      paid.sessionId,
      userId,
      paid.system,
      paid.plan,
      JSON.stringify(result),
    ]);
    return result;
  });
}

/** After the bot publishes slots: queue a booking for every paid auto-book job that now has a matching slot. */
async function matchWatching(system: SystemId) {
  const jobs = await query<{ session_id: string; user_id: string; result: ConfirmResponse }>(
    `select p.session_id, p.user_id, p.result from payments p
      where p.system = $1 and p.plan = 'autobook' and (p.result->>'watching')::boolean = true`,
    [system],
  );
  for (const job of jobs) {
    await withLock(`payment:${job.session_id}`, async () => {
      const slot = await earliestMatch(system, job.user_id);
      if (!slot) return;
      try {
        const booking = await createBooking(system, slot, job.user_id);
        const result: ConfirmResponse = { ...job.result, booking, watching: false };
        await query("update payments set result = $2 where session_id = $1", [job.session_id, JSON.stringify(result)]);
      } catch (err) {
        if (!(err instanceof ApiError)) throw err; // not bookable right now (e.g. another active booking): try again next sync
      }
    });
  }
}

/* ---------------------------- bot support --------------------------- */

/** What the bot needs to act on: queued bookings with their people, paid jobs still watching, and alert links. */
export async function botJobs() {
  await releaseStale();
  const bookings = await query<{ id: string; user_id: string; system: SystemId; slot: string; request: BookingRequest | null }>(
    `select b.id, b.user_id, b.system, b.slot, r.request
       from bookings b left join booking_requests r on r.user_id = b.user_id and r.system = b.system
      where b.status = 'pending' order by b.created_at`,
  );
  const watching = await query<{ session_id: string; user_id: string; system: SystemId; request: BookingRequest | null }>(
    `select p.session_id, p.user_id, p.system, r.request
       from payments p left join booking_requests r on r.user_id = p.user_id and r.system = p.system
      where p.plan = 'autobook' and (p.result->>'watching')::boolean = true`,
  );
  const alerts = await query<{ code: string; user_id: string; system: SystemId; chat_id: string | null; request: BookingRequest | null }>(
    `select a.telegram_code as code, a.user_id, a.system, a.telegram_chat_id as chat_id, r.request
       from alert_subscriptions a left join booking_requests r on r.user_id = a.user_id and r.system = a.system`,
  );
  return {
    bookings: bookings.map((b) => ({ id: b.id, userId: b.user_id, system: b.system, slot: b.slot, request: b.request })),
    watching: watching.map((w) => ({ paymentId: w.session_id, userId: w.user_id, system: w.system, request: w.request })),
    alerts: alerts.map((a) => ({ code: a.code, userId: a.user_id, system: a.system, telegramChatId: a.chat_id, request: a.request })),
  };
}

/** Connect a Telegram chat to the alert link the customer opened. */
export async function linkTelegram(code: string, chatId: string): Promise<boolean> {
  const rows = await query("update alert_subscriptions set telegram_chat_id = $2 where telegram_code = $1 returning id", [code, chatId]);
  return rows.length > 0;
}
