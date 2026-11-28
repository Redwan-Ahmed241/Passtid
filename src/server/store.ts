/**
 * Everything the API reads and writes in Postgres: booking requests, slots, queue entries,
 * paid plans and Telegram alert links. Implements the contract in src/lib/types.ts.
 *
 * Slots are not invented here. The Python booking bots write what they see on the embassy sites
 * straight into the slots table; until they do, the console shows no open slots.
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
import { EMBASSY_TZ, addDays, embassyClock, embassyToday } from "@/lib/time";
import { isUniqueViolation, query, transaction } from "./db";
import { ApiError } from "./errors";
import { paidSessionPattern } from "./payments";

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
  await transaction(async (client) => {
    const stale = await client.query<{ id: string; system: SystemId }>(
      `update bookings set status = 'released', reason = 'timed_out', updated_at = now()
       where status = 'pending' and heartbeat < now() - ($1 || ' milliseconds')::interval
       returning id, system`,
      [String(STALE_AFTER_MS)],
    );
    if (stale.rows.length === 0) return;

    for (const b of stale.rows) {
      await client.query(
        `update payments
            set result = jsonb_set(jsonb_set(result, '{watching}', 'true'::jsonb), '{booking}', 'null'::jsonb)
          where result->'booking'->>'id' = $1`,
        [b.id],
      );
    }

    const systems = [...new Set(stale.rows.map((r) => r.system))];
    for (const sys of systems) {
      await client.query("select pg_notify('match_needed', $1)", [sys]);
    }
  });
}

/* ------------------------------ slots ------------------------------ */

export async function listSlots(system: SystemId, userId: string): Promise<SlotsResponse> {
  await releaseStale();
  const nowDate = new Date();
  const today = embassyToday(nowDate);
  const info = SYSTEM_INFO[system];
  const earliest = `${today}T${embassyClock(nowDate)}`;

  const rows = await query<{ slot: string; free_on_site: number | null; queued: string; mine_id: string | null; mine_status: string | null; mine_ref: string | null; mine_autobook: boolean }>(
    `select s.slot, s.free_on_site,
            (select count(*) from bookings b where b.system = s.system and b.slot = s.slot and b.status in ('pending', 'booked')) as queued,
            m.id as mine_id, m.status as mine_status, m.reference as mine_ref,
            exists (
              select 1 from payments p
               where p.user_id = m.user_id and p.system = m.system and p.plan = 'autobook'
            ) as mine_autobook
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
    mine: r.mine_id ? { bookingId: r.mine_id, status: r.mine_status as "pending" | "booked", reference: r.mine_ref, autobook: r.mine_autobook } : null,
  }));

  const [myBookingRow] = await query<{ id: string; slot: string; status: string; reference: string | null; autobook: boolean }>(
    `select b.id, b.slot, b.status, b.reference,
            exists (
              select 1 from payments p
               where p.user_id = b.user_id and p.system = b.system and p.plan = 'autobook'
            ) as autobook
       from bookings b
      where b.user_id = $2 and b.system = $1 and b.status in ('pending', 'booked')
      order by b.updated_at desc, b.created_at desc
      limit 1`,
    [system, userId],
  );
  const myBooking = myBookingRow
    ? {
        bookingId: myBookingRow.id,
        slot: myBookingRow.slot,
        status: myBookingRow.status as "pending" | "booked",
        reference: myBookingRow.reference,
        autobook: myBookingRow.autobook,
      }
    : null;

  return {
    system,
    timezone: EMBASSY_TZ,
    today,
    scannedUntil: addDays(today, info.scanWeeks * 7 - 1),
    scanWeeks: info.scanWeeks,
    generatedAt: nowDate.toISOString(),
    slots,
    myBooking,
  };
}

/* ---------------------------- bookings ----------------------------- */

export async function createBooking(system: SystemId, slot: string, userId: string): Promise<Booking> {
  await releaseStale();
  const run = <T extends QueryResultRow>(text: string, params: unknown[]) => query<T>(text, params);

  const req = await getRequest(userId, system, "");
  if (!isComplete(system, req.request)) {
    throw new ApiError(422, "incomplete_details", "Complete the people and email details for this service before booking.");
  }
  // A queued booking is what the bot acts on, so only a paid automatic-booking plan may create one.
  const [plan] = await run<{ one: number }>(
    "select 1 as one from payments where user_id = $1 and system = $2 and plan = 'autobook' and session_id like $3 limit 1",
    [userId, system, paidSessionPattern()],
  );
  if (!plan) throw new ApiError(402, "payment_required", "Buy automatic booking for this service before booking.");
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
  assertBookingId(id);
  await releaseStale();
  const [row] = await query<BookingRow>(
    `update bookings set heartbeat = case when status = 'pending' then now() else heartbeat end
      where id = $1::uuid and user_id = $2 returning ${BOOKING_COLUMNS}`,
    [id, userId],
  );
  if (!row) throw new ApiError(404, "booking_not_found", "No such booking.");
  return toBooking(row);
}

/** Cancelling by the user leaves the line on purpose, so the payment stays watching: false. */
export async function cancelBooking(id: string, userId: string): Promise<Booking> {
  assertBookingId(id);
  const [row] = await query<BookingRow>(
    `update bookings set status = 'released', reason = 'cancelled', updated_at = now()
      where id = $1::uuid and user_id = $2 and status in ('pending', 'booked') returning ${BOOKING_COLUMNS}`,
    [id, userId],
  );
  if (row) return toBooking(row);
  const [existing] = await query<BookingRow>(`select ${BOOKING_COLUMNS} from bookings where id = $1::uuid and user_id = $2`, [id, userId]);
  if (!existing) throw new ApiError(404, "booking_not_found", "No such booking.");
  return toBooking(existing);
}

/* ------------------------ booking requests ------------------------- */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Booking ids are UUIDs; anything else cannot exist, so it is a 404 without touching the database. */
export function assertBookingId(id: string): void {
  if (!UUID_RE.test(id)) throw new ApiError(404, "booking_not_found", "No such booking.");
}

/** The empty request shown for a service the customer has not saved yet. */
export function blankRequest(system: SystemId, email: string): RequestResponse {
  return toResponse(system, defaultRequest(embassyToday(), email), null);
}

function toResponse(system: SystemId, request: BookingRequest, updatedAt: string | null): RequestResponse {
  return { request, updatedAt, complete: isComplete(system, request) };
}

export async function getRequest(userId: string, system: SystemId, email: string): Promise<RequestResponse> {
  const [row] = await query<{ request: BookingRequest; updated_at: Date }>(
    "select request, updated_at from booking_requests where user_id = $1 and system = $2",
    [userId, system],
  );
  if (row) return toResponse(system, row.request, row.updated_at.toISOString());
  return blankRequest(system, email);
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
  subscriptionId?: string | null;
  system: SystemId;
  plan: PlanId;
}

/** The bot link that connects an account to its alerts, when the bot username is configured. */
function botLink(code: string): string | null {
  const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  return bot ? `https://t.me/${bot}?start=${code}` : null;
}

/** The caller's switched-on alert subscriptions, newest first, one per service. */
export async function listAlerts(userId: string): Promise<AlertSubscription[]> {
  const rows = await query<{ system: SystemId; telegram_code: string; linked: boolean }>(
    `select distinct on (system) system, telegram_code, telegram_chat_id is not null as linked
       from alert_subscriptions
      where user_id = $1 and active
      order by system, created_at desc`,
    [userId],
  );
  return rows.map((r) => ({ id: r.telegram_code, system: r.system, telegramUrl: botLink(r.telegram_code), linked: r.linked }));
}

/**
 * Turn a verified payment into what was bought. Idempotent per checkout session, and safe when the
 * browser return and Stripe's webhook arrive at the same moment.
 *  - notify   : Telegram alerts for this service
 *  - autobook : a queued booking for the earliest slot that fits the window, else the bot keeps watching
 */
export function fulfilPayment(paid: PaidInfo, userId: string): Promise<ConfirmResponse> {
  // One transaction on one connection: the lock makes a second delivery wait its turn, and either
  // everything that was bought is saved or nothing is.
  return transaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`payment:${paid.sessionId}`]);
    const { rows: [done] } = await client.query<{ result: ConfirmResponse }>("select result from payments where session_id = $1", [
      paid.sessionId,
    ]);
    if (done) return done.result;

    let result: ConfirmResponse;
    if (paid.plan === "notify") {
      const code = randomBytes(12).toString("hex");
      await client.query(
        // A user who already linked Telegram (by phone or an earlier code) gets alerts straight away.
        `insert into alert_subscriptions (user_id, system, telegram_code, stripe_subscription_id, telegram_chat_id)
         values ($1, $2, $3, $4, (select telegram_chat_id from users where id = $1))`,
        [userId, paid.system, code, paid.subscriptionId ?? null],
      );
      const alert: AlertSubscription = { id: code, system: paid.system, telegramUrl: botLink(code) };
      result = { plan: "notify", system: paid.system, booking: null, alert, watching: false };
    } else {
      result = { plan: "autobook", system: paid.system, booking: null, alert: null, watching: true };
    }
    await client.query("insert into payments (session_id, user_id, system, plan, result) values ($1, $2, $3, $4, $5)", [
      paid.sessionId,
      userId,
      paid.system,
      paid.plan,
      JSON.stringify(result),
    ]);
    if (paid.plan === "autobook") {
      // Delivered when the transaction commits, so the bot never looks for a payment that is not there yet.
      await client.query("select pg_notify('match_needed', $1)", [paid.system]);
    }
    return result;
  });
}

/* ---------------------------- bot support --------------------------- */

/** The monthly alerts subscription ended in Stripe: the bot stops sending those alerts. */
export async function endSubscription(subscriptionId: string): Promise<void> {
  await query("update alert_subscriptions set active = false where stripe_subscription_id = $1", [subscriptionId]);
}

/** A stable per-user code so autobook customers can optionally link Telegram later. */
export async function getOrCreateTelegramCode(userId: string): Promise<string> {
  const [existing] = await query<{ code: string | null }>("select telegram_code as code from users where id = $1", [userId]);
  if (!existing) throw new ApiError(404, "user_not_found", "No such user.");
  if (existing.code) return existing.code;

  const code = randomBytes(12).toString("hex");
  const [updated] = await query<{ code: string }>(
    "update users set telegram_code = $2 where id = $1 and telegram_code is null returning telegram_code as code",
    [userId, code],
  );
  if (updated) return updated.code;

  // Another request won the race; use the code it stored.
  const [again] = await query<{ code: string }>("select telegram_code as code from users where id = $1", [userId]);
  if (!again) throw new ApiError(404, "user_not_found", "No such user.");
  return again.code;
}

/** The optional "get updates on Telegram too" link for automatic-booking customers. */
export async function getTelegramLink(userId: string): Promise<string | null> {
  const code = await getOrCreateTelegramCode(userId);
  const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  return bot ? `https://t.me/${bot}?start=${code}` : null;
}

/**
 * Save or clear the optional E.164 phone used for Telegram linking. Numbers are not unique and never
 * rejected as taken, so the answer reveals nothing about other accounts and nobody can block a number.
 * The bot links by phone only when the Telegram contact is the sender's own and exactly one paying
 * account has that number; otherwise the customer uses the one-time /start link.
 */
export async function setUserPhone(userId: string, phone: string | null): Promise<string | null> {
  await query("update users set phone = $2 where id = $1", [userId, phone]);
  return phone;
}

/** Read the optional stored phone for prefill. */
export async function getUserPhone(userId: string): Promise<string | null> {
  const [row] = await query<{ phone: string | null }>("select phone from users where id = $1", [userId]);
  return row?.phone ?? null;
}
