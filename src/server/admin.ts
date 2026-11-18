/**
 * Support tickets, editable site texts and the admin panel, on Postgres.
 * Bookings here are the same rows the Python booking bot works on, so every change is a guarded
 * single-row update rather than a read-modify-write.
 */
import { randomBytes } from "node:crypto";
import {
  SYSTEMS,
  type AdminBookingPatch,
  type AdminCustomer,
  type AdminOverview,
  type Booking,
  type BookingRequest,
  type BookingStatus,
  type ReleaseReason,
  type RequestResponse,
  type SystemId,
  type TextOverrides,
  type Ticket,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/types";
import { isComplete } from "@/lib/applicants";
import { isUniqueViolation, query } from "./db";
import { ApiError } from "./errors";
import { cancelBooking, getRequest, saveRequest } from "./store";

/* ------------------------------------------------------------------ */
/* Support tickets                                                     */
/* ------------------------------------------------------------------ */

const MAX_OPEN_TICKETS = 5;
const TOKEN_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newToken(): string {
  const bytes = randomBytes(6);
  let t = "PT-";
  for (const b of bytes) t += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
  return t;
}

interface TicketRow {
  token: string;
  email: string;
  category: TicketCategory;
  system: SystemId | null;
  message: string;
  status: TicketStatus;
  reply: string | null;
  created_at: Date;
  updated_at: Date;
}

const TICKET_COLUMNS = "token, email, category, system, message, status, reply, created_at, updated_at";

const toTicket = (r: TicketRow): Ticket => ({
  token: r.token,
  email: r.email,
  category: r.category,
  system: r.system,
  message: r.message,
  status: r.status,
  reply: r.reply,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

export async function createTicket(
  userId: string,
  email: string,
  input: { category: TicketCategory; system: SystemId | null; message: string },
): Promise<Ticket> {
  const [{ open }] = await query<{ open: number }>(
    "select count(*)::int as open from tickets where user_id = $1 and status = 'open'",
    [userId],
  );
  if (open >= MAX_OPEN_TICKETS) {
    throw new ApiError(429, "too_many_tickets", "You already have 5 open reports. Wait for an answer before sending another.");
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await query<TicketRow>(
        `insert into tickets (token, user_id, email, category, system, message)
         values ($1, $2, $3, $4, $5, $6) returning ${TICKET_COLUMNS}`,
        [newToken(), userId, email, input.category, input.system, input.message],
      );
      return toTicket(row);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new ApiError(503, "ticket_token_busy", "Couldn't create the report. Try again.");
}

export async function listMyTickets(userId: string): Promise<Ticket[]> {
  const rows = await query<TicketRow>(
    `select ${TICKET_COLUMNS} from tickets where user_id = $1 order by created_at desc`,
    [userId],
  );
  return rows.map(toTicket);
}

export async function adminUpdateTicket(token: string, patch: { status: TicketStatus; reply: string | null }): Promise<Ticket> {
  const [row] = await query<TicketRow>(
    `update tickets set status = $2, reply = $3, updated_at = now() where token = $1 returning ${TICKET_COLUMNS}`,
    [token, patch.status, patch.reply],
  );
  if (!row) throw new ApiError(404, "ticket_not_found", "No such ticket.");
  return toTicket(row);
}

/* ------------------------------------------------------------------ */
/* Site texts                                                          */
/* ------------------------------------------------------------------ */

const TEXT_KEY_RE = /^[tcl]\.[\w.-]{1,120}$/;

export async function getTexts(): Promise<TextOverrides> {
  const rows = await query<{ lang: "en" | "sv"; key: string; value: string }>("select lang, key, value from site_texts");
  const out: TextOverrides = { en: {}, sv: {} };
  for (const r of rows) if (r.lang === "en" || r.lang === "sv") out[r.lang][r.key] = r.value;
  return out;
}

/** A null or empty value removes that override, so the built-in text shows again. */
export async function adminSetTexts(patch: Record<"en" | "sv", Record<string, string | null>>): Promise<TextOverrides> {
  for (const lang of ["en", "sv"] as const) {
    for (const k of Object.keys(patch[lang] ?? {})) {
      if (!TEXT_KEY_RE.test(k)) throw new ApiError(422, "invalid_text_key", `Unknown text key “${k}”.`);
    }
  }
  for (const lang of ["en", "sv"] as const) {
    for (const [k, v] of Object.entries(patch[lang] ?? {})) {
      if (v === null || v === "") {
        await query("delete from site_texts where lang = $1 and key = $2", [lang, k]);
      } else {
        await query(
          `insert into site_texts (lang, key, value) values ($1, $2, $3)
           on conflict (lang, key) do update set value = excluded.value, updated_at = now()`,
          [lang, k, String(v).slice(0, 5000)],
        );
      }
    }
  }
  return getTexts();
}

/* ------------------------------------------------------------------ */
/* Admin overview and edits on a customer's behalf                     */
/* ------------------------------------------------------------------ */

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

const BOOKING_COLUMNS = "id, user_id, system, slot, status, reason, reference, created_at, updated_at";

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

export async function adminOverview(): Promise<AdminOverview> {
  const users = await query<{ id: string; email: string }>("select id, email from users order by email");
  const requests = await query<{ user_id: string; system: SystemId; request: BookingRequest; updated_at: Date }>(
    "select user_id, system, request, updated_at from booking_requests",
  );
  const bookings = await query<BookingRow>(`select ${BOOKING_COLUMNS} from bookings order by created_at desc`);
  const ticketRows = await query<TicketRow>(
    `select ${TICKET_COLUMNS} from tickets order by (status = 'open') desc, created_at desc`,
  );

  const saved = new Map(requests.map((r) => [`${r.user_id}|${r.system}`, r]));
  const customers: AdminCustomer[] = [];
  for (const u of users) {
    const reqs: AdminCustomer["requests"] = {};
    // Every service is listed, saved or not, so the admin can fill in a request on the customer's behalf.
    for (const system of SYSTEMS) {
      const row = saved.get(`${u.id}|${system}`);
      reqs[system] = row
        ? { request: row.request, updatedAt: row.updated_at.toISOString(), complete: isComplete(system, row.request) }
        : await getRequest(u.id, system, u.email);
    }
    customers.push({
      clientId: u.id,
      email: u.email,
      requests: reqs,
      bookings: bookings.filter((b) => b.user_id === u.id).map(toBooking),
    });
  }
  return { customers, tickets: ticketRows.map(toTicket) };
}

export async function adminSaveRequest(userId: string, system: SystemId, request: BookingRequest): Promise<RequestResponse> {
  const [exists] = await query<{ one: number }>("select 1 as one from users where id = $1", [userId]);
  if (!exists) throw new ApiError(404, "customer_not_found", "No such customer.");
  return saveRequest(userId, system, request);
}

/**
 * Mark a booking booked (with its booking number), release it, or put it back in the bot's queue.
 * Each change is one guarded update, so it never overwrites what the booking bot did in between.
 */
export async function adminUpdateBooking(id: string, patch: AdminBookingPatch): Promise<Booking> {
  const [current] = await query<BookingRow>(`select ${BOOKING_COLUMNS} from bookings where id::text = $1`, [id]);
  if (!current) throw new ApiError(404, "booking_not_found", "No such booking.");

  if (patch.status === "released") return cancelBooking(id, current.user_id);

  if (patch.status === "booked") {
    const ref = (patch.reference ?? "").trim().slice(0, 40);
    if (!ref) throw new ApiError(422, "missing_reference", "Enter the booking number to mark it booked.");
    try {
      const [row] = await query<BookingRow>(
        `update bookings set status = 'booked', reference = $2, reason = null, updated_at = now()
          where id::text = $1 returning ${BOOKING_COLUMNS}`,
        [id, ref],
      );
      return toBooking(row);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ApiError(409, "active_booking_exists", "This customer already has another active booking for this service.");
      }
      throw err;
    }
  }

  // Back to pending: the booking bot picks it up again.
  try {
    const [row] = await query<BookingRow>(
      `update bookings set status = 'pending', reference = null, reason = null, heartbeat = now(), updated_at = now()
        where id::text = $1 returning ${BOOKING_COLUMNS}`,
      [id],
    );
    return toBooking(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "active_booking_exists", "This customer already has another active booking for this service.");
    }
    throw err;
  }
}
