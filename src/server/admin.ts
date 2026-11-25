/**
 * Support tickets, editable site texts and the admin panel, on Postgres.
 * Bookings here are the same rows the Python booking bot works on, so every change is a guarded
 * single-row update rather than a read-modify-write.
 */
import { createHash, randomBytes } from "node:crypto";
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
import { isUniqueViolation, query, transaction } from "./db";
import { ApiError } from "./errors";
import { assertBookingId, blankRequest, cancelBooking, saveRequest } from "./store";
import { site } from "@/lib/site";

/* ------------------------------------------------------------------ */
/* Support tickets                                                     */
/* ------------------------------------------------------------------ */

const MAX_OPEN_TICKETS = 5;
const MAX_TICKETS_PER_HOUR = 3;
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

/* Messages go into the notifications outbox; the notifier worker (sweden/bots) sends and retries them. */

export async function enqueue(kind: string, dedupeKey: string, userId: string | null, channel: string, address: string, message: string) {
  await query(
    `insert into notifications (user_id, kind, dedupe_key, channel, address, message)
     values ($1, $2, $3, $4, $5, $6) on conflict (dedupe_key) do nothing`,
    [userId, kind, `${dedupeKey}:${address}`, channel, address, message],
  );
  await query("select pg_notify('notify_needed', '')");
}

const supportUrl = () => `${site.url}/booking?support=1`;

/** Email to the customer that the report arrived, and a Telegram alert to the administrator. */
async function announceTicket(userId: string, ticket: Ticket) {
  // The customer's own words are not repeated here: sign-up does not verify addresses, so doing so would
  // let anyone send text of their choosing to someone else's inbox under our name.
  await enqueue(
    "ticket_received",
    `ticket_received:${ticket.token}`,
    userId,
    "email",
    ticket.email,
    `We received your report ${ticket.token}.

` +
      `We will email you when support answers. You can also see your reports here: ${supportUrl()}

` +
      `Quote ${ticket.token} if you contact us about it.`,
  );
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID ?? process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (adminChat) {
    await enqueue(
      "ticket_new",
      `ticket_new:${ticket.token}`,
      null,
      "telegram",
      adminChat,
      `New support ticket ${ticket.token}
From: ${ticket.email}
About: ${ticket.category}

${ticket.message}`,
    );
  }
}

/** Email to the customer when support writes or changes an answer. The same answer is never sent twice. */
async function announceAnswer(userId: string, ticket: Ticket) {
  if (!ticket.reply) return;
  const digest = createHash("sha256").update(ticket.reply).digest("hex").slice(0, 16);
  await enqueue(
    "ticket_answered",
    `ticket_answered:${ticket.token}:${digest}`,
    userId,
    "email",
    ticket.email,
    `Support answered your report ${ticket.token}.

` +
      `Your message:
${ticket.message}

` +
      `Answer from support:
${ticket.reply}

` +
      `Status: ${ticket.status === "resolved" ? "resolved" : "still open"}.
` +
      `See all your reports: ${supportUrl()}`,
  );
}

export async function createTicket(
  userId: string,
  email: string,
  input: { category: TicketCategory; system: SystemId | null; message: string },
): Promise<Ticket> {
  // The limit checks and the insert share one transaction under a per-user lock, so parallel
  // requests cannot slip past. Everything runs on that one connection, so the pool cannot run dry.
  const ticket = await transaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`ticket:${userId}`]);
    const { rows: [{ open }] } = await client.query<{ open: number }>(
      "select count(*)::int as open from tickets where user_id = $1 and status = 'open'",
      [userId],
    );
    if (open >= MAX_OPEN_TICKETS) {
      throw new ApiError(429, "too_many_tickets", "You already have 5 open reports. Wait for an answer before sending another.");
    }
    const { rows: [{ recent }] } = await client.query<{ recent: number }>(
      "select count(*)::int as recent from tickets where user_id = $1 and created_at > now() - interval '1 hour'",
      [userId],
    );
    if (recent >= MAX_TICKETS_PER_HOUR) {
      throw new ApiError(429, "too_many_tickets_recently", "You have sent 3 reports in the last hour. Try again later.");
    }
    // A token collision is resolved inside the insert, so the transaction never sees a failed statement.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { rows: [row] } = await client.query<TicketRow>(
        `insert into tickets (token, user_id, email, category, system, message)
         values ($1, $2, $3, $4, $5, $6) on conflict (token) do nothing returning ${TICKET_COLUMNS}`,
        [newToken(), userId, email, input.category, input.system, input.message],
      );
      if (row) return toTicket(row);
    }
    throw new ApiError(503, "ticket_token_busy", "Couldn't create the report. Try again.");
  });
  await announceTicket(userId, ticket);
  return ticket;
}

export async function listMyTickets(userId: string): Promise<Ticket[]> {
  const rows = await query<TicketRow>(
    `select ${TICKET_COLUMNS} from tickets where user_id = $1 order by created_at desc`,
    [userId],
  );
  return rows.map(toTicket);
}

export async function adminUpdateTicket(token: string, patch: { status: TicketStatus; reply: string | null }): Promise<Ticket> {
  const [row] = await query<TicketRow & { user_id: string }>(
    `update tickets set status = $2, reply = $3, updated_at = now() where token = $1 returning ${TICKET_COLUMNS}, user_id`,
    [token, patch.status, patch.reply],
  );
  if (!row) throw new ApiError(404, "ticket_not_found", "No such ticket.");
  const ticket = toTicket(row);
  await announceAnswer(row.user_id, ticket);
  return ticket;
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
        : blankRequest(system, u.email);
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

/** The booking bot changed the row after the admin loaded it: refresh instead of overwriting. */
const changedMeanwhile = () =>
  new ApiError(409, "booking_changed", "This booking changed while you were looking at it. Refresh and try again.");

/**
 * Mark a booking booked (with its booking number), release it, or put it back in the bot's queue.
 * Each change is one guarded update, so it never overwrites what the booking bot did in between.
 */
export async function adminUpdateBooking(id: string, patch: AdminBookingPatch): Promise<Booking> {
  assertBookingId(id);
  const [current] = await query<BookingRow>(`select ${BOOKING_COLUMNS} from bookings where id = $1::uuid`, [id]);
  if (!current) throw new ApiError(404, "booking_not_found", "No such booking.");

  if (patch.status === "released") return cancelBooking(id, current.user_id);

  if (patch.status === "booked") {
    const ref = (patch.reference ?? "").trim().slice(0, 40);
    if (!ref) throw new ApiError(422, "missing_reference", "Enter the booking number to mark it booked.");
    try {
      const [row] = await query<BookingRow>(
        `update bookings set status = 'booked', reference = $2, reason = null, updated_at = now()
          where id = $1::uuid and status = $3 returning ${BOOKING_COLUMNS}`,
        [id, ref, current.status],
      );
      if (!row) throw changedMeanwhile();
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
        where id = $1::uuid and status = $2 returning ${BOOKING_COLUMNS}`,
      [id, current.status],
    );
    if (!row) throw changedMeanwhile();
    return toBooking(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "active_booking_exists", "This customer already has another active booking for this service.");
    }
    throw err;
  }
}
