import {
  MAX_PERSONS,
  type ApiErrorBody,
  type BookingRequest,
  type BookingWindow,
  type DateRange,
  type Person,
  type User,
} from "@/lib/types";
import { DAY_RE, MAX_DATE_RANGES, MAX_TIME_RANGES, validateWindow } from "@/lib/window";
import { ApiError } from "./mock-backend";
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

export const SLOT_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

const bad = (message: string) => new ApiError(422, "invalid_request", message);
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

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
      firstName: str(p.firstName, 80),
      lastName: str(p.lastName, 80),
      personalNumber: str(p.personalNumber, 32),
      phone: str(p.phone, 32),
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
  return { persons: parsePersons(o.persons), email: str(o.email, 200), window: parseWindow(o.window) };
}
