import {
  MAX_PERSONS,
  type ApiErrorBody,
  type BookingRequest,
  type BookingWindow,
  type DateRange,
  type Person,
  type User,
} from "@/lib/types";
import { EMAIL_RE, NAME_RE, PERSONAL_NUMBER_RE, PHONE_RE } from "@/lib/applicants";
import { cleanLine } from "@/lib/sanitize";
import { DAY_RE, MAX_DATE_RANGES, MAX_TIME_RANGES, validateWindow } from "@/lib/window";
import { ApiError } from "./errors";
import { userFromRequest } from "./session";

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(body: T, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function errorJson(status: number, code: string, message: string) {
  return json<ApiErrorBody>({ error: { code, message } }, status);
}

/** Wrap a handler so thrown ApiErrors become JSON error responses. */
export async function handle(fn: () => Response | Promise<Response>) {
  try {
    return await fn();
  } catch (err) {
    // Next.js control-flow errors (e.g. "this route is dynamic") carry a digest and must propagate.
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    if (err instanceof ApiError) return errorJson(err.status, err.code, err.message);
    if (err instanceof SyntaxError) return errorJson(400, "bad_json", "Request body is not valid JSON.");
    console.error(err);
    return errorJson(500, "internal", "Something went wrong on our side.");
  }
}

/** Every slot, booking and request endpoint requires a signed-in user. */
export function requireUser(request: Request): User {
  const user = userFromRequest(request);
  if (!user) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
  return user;
}

/** Admin endpoints answer 404 to everyone else, so their existence is not advertised. */
export function requireAdmin(request: Request): User {
  const user = userFromRequest(request);
  if (!user?.admin) throw new ApiError(404, "not_found", "Not found.");
  return user;
}

export const SLOT_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

const bad = (message: string) => new ApiError(422, "invalid_request", message);
const str = cleanLine;

/** Empty is fine (a draft); anything typed must have the right shape. */
function shaped(value: string, re: RegExp, what: string): string {
  if (value && !re.test(value)) throw bad(`${what} has characters we cannot accept.`);
  return value;
}

function parseWindow(input: unknown): BookingWindow {
  if (typeof input !== "object" || input === null) throw bad("`window` must be an object.");
  const o = input as Record<string, unknown>;
  if (typeof o.emergency !== "boolean") throw bad("`window.emergency` must be true or false.");
  if (!Array.isArray(o.ranges) || o.ranges.length > MAX_DATE_RANGES) {
    throw bad(`\`window.ranges\` must be a list of up to ${MAX_DATE_RANGES} date ranges.`);
  }
  const ranges: DateRange[] = o.ranges.map((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const date = (v: unknown, label: string) => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v !== "string" || !DAY_RE.test(v)) throw bad(`Range ${i + 1}: \`${label}\` must be YYYY-MM-DD or null.`);
      return v;
    };
    if (!Array.isArray(r.times) || r.times.length > MAX_TIME_RANGES) {
      throw bad(`Range ${i + 1}: \`times\` must be a list of up to ${MAX_TIME_RANGES} time ranges.`);
    }
    return {
      id: str(r.id, 64) || `r${i + 1}`,
      from: date(r.from, "from"),
      to: date(r.to, "to"),
      times: r.times.map((t) => {
        const tr = (t ?? {}) as Record<string, unknown>;
        if (typeof tr.start !== "string" || typeof tr.end !== "string") throw bad(`Range ${i + 1}: each time needs start and end.`);
        return { start: tr.start.trim().slice(0, 5), end: tr.end.trim().slice(0, 5) };
      }),
    };
  });
  const window: BookingWindow = { ranges, emergency: o.emergency };
  // An invalid window is rejected, never silently widened to "book anything".
  const issues = validateWindow(window);
  if (issues.length) throw bad(issues[0].message);
  return window;
}

function parsePersons(input: unknown): Person[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_PERSONS) {
    throw bad(`\`persons\` must be a list of 1 to ${MAX_PERSONS} people.`);
  }
  return input.map((raw) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    return {
      firstName: shaped(str(p.firstName, 60), NAME_RE, "The first name"),
      lastName: shaped(str(p.lastName, 60), NAME_RE, "The last name"),
      personalNumber: shaped(str(p.personalNumber, 24), PERSONAL_NUMBER_RE, "The personal number"),
      phone: shaped(str(p.phone, 24), PHONE_RE, "The phone number"),
    };
  });
}

/**
 * The window must be valid to be saved. People and email may still be incomplete
 * (a draft); a booking can only start once they are complete.
 */
export function parseBookingRequest(input: unknown): BookingRequest {
  if (typeof input !== "object" || input === null) throw bad("Body must be an object.");
  const o = input as Record<string, unknown>;
  return { persons: parsePersons(o.persons), email: shaped(str(o.email, 200), EMAIL_RE, "The email"), window: parseWindow(o.window) };
}

/** Largest JSON body any endpoint accepts. Every payload here is a few kilobytes at most. */
const MAX_BODY_BYTES = 64 * 1024;

/** Read a JSON body with a size cap, so a huge payload cannot tie up the server. */
export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", "The request is too large.");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large", "The request is too large.");
  const body: unknown = JSON.parse(text);
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new ApiError(400, "bad_json", "Request body must be a JSON object.");
  return body;
}

const hits = new Map<string, number[]>();

/**
 * At most `max` calls per `windowMs` for this caller and action. In memory, so it counts per server
 * instance: it slows guessing and spam down, it is not a replacement for a shared limiter at the edge.
 */
export function rateLimit(request: Request, action: string, max: number, windowMs: number, extra = ""): void {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${action}:${ip}:${extra}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    throw new ApiError(429, "too_many_requests", "Too many attempts. Try again in a few minutes.");
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] >= windowMs) hits.delete(k);
}
