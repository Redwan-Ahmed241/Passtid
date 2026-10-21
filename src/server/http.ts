import type { ApiErrorBody, BookingWindow } from "@/lib/types";
import { DAY_RE, validateWindow } from "@/lib/window";
import { ApiError } from "./mock-backend";

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(body: T, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export function errorJson(status: number, code: string, message: string) {
  return json<ApiErrorBody>({ error: { code, message } }, status);
}

/** Wrap a handler so thrown ApiErrors become JSON error responses. */
export async function handle(fn: () => Response | Promise<Response>) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return errorJson(err.status, err.code, err.message);
    if (err instanceof SyntaxError) return errorJson(400, "bad_json", "Request body is not valid JSON.");
    console.error(err);
    return errorJson(500, "internal", "Something went wrong on our side.");
  }
}

const CLIENT_RE = /^[A-Za-z0-9-]{8,64}$/;

/** Anonymous per-browser identity. The real backend uses its own session. */
export function clientIdOf(request: Request): string {
  const id = request.headers.get("x-client-id") ?? "";
  if (!CLIENT_RE.test(id)) {
    throw new ApiError(400, "missing_client", "Missing or malformed x-client-id header.");
  }
  return id;
}

export const SLOT_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

/** Validate an untrusted window body. Invalid windows are rejected, never silently widened. */
export function parseWindow(input: unknown): BookingWindow {
  const bad = (message: string) => new ApiError(422, "invalid_window", message);
  if (typeof input !== "object" || input === null) throw bad("Window must be an object.");
  const o = input as Record<string, unknown>;
  if (typeof o.from !== "string" || !DAY_RE.test(o.from)) throw bad("`from` must be YYYY-MM-DD.");
  if (o.to !== null && (typeof o.to !== "string" || !DAY_RE.test(o.to))) {
    throw bad("`to` must be YYYY-MM-DD or null.");
  }
  if (!Array.isArray(o.times) || o.times.length > 8) throw bad("`times` must be a list of up to 8 ranges.");
  const times = o.times.map((t) => {
    const r = t as Record<string, unknown>;
    if (typeof r?.start !== "string" || typeof r?.end !== "string") throw bad("Each range needs start and end.");
    return { start: r.start.slice(0, 5), end: r.end.slice(0, 5) };
  });
  if (typeof o.emergency !== "boolean") throw bad("`emergency` must be true or false.");
  const window: BookingWindow = { from: o.from, to: (o.to as string | null) ?? null, times, emergency: o.emergency };
  const issues = validateWindow(window);
  if (issues.length) throw bad(issues[0].message);
  return window;
}
