import type {
  ApiErrorBody,
  Booking,
  CheckoutResponse,
  ConfirmResponse,
  PlanId,
  PlansResponse,
  BookingRequest,
  RequestResponse,
  SlotsResponse,
  SystemId,
  User,
} from "./types";

/**
 * Browser client for the booking backend.
 * Defaults to the bundled mock API; set NEXT_PUBLIC_API_BASE_URL to the real
 * service (e.g. https://api.example.com/v1) to switch over. Requests carry the
 * session cookie (credentials: "include"), so a separate backend origin must
 * allow credentialed CORS for this site.
 */
const CONFIGURED_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const BASE = (CONFIGURED_BASE || "/api/v1").replace(/\/$/, "");

/** True while the bundled demo API is in use, so the UI can say sign-in is a demo. */
export const isMockApi = !CONFIGURED_BASE;

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError(0, "network", "Can't reach the booking service. Check your connection and try again.");
  }
  if (!res.ok) {
    let code = "http_error";
    let message = `The booking service answered ${res.status}.`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      code = body.error.code;
      message = body.error.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiRequestError(res.status, code, message);
  }
  return (await res.json()) as T;
}

export const api = {
  me: () => request<User>(`/auth/me`),
  login: (email: string, password: string) =>
    request<User>(`/auth/login`, { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<User>(`/auth/register`, { method: "POST", body: JSON.stringify({ name, email, password }) }),
  logout: () => request<{ ok: true }>(`/auth/logout`, { method: "POST" }),

  slots: (system: SystemId, signal?: AbortSignal) =>
    request<SlotsResponse>(`/systems/${system}/slots`, { signal }),
  getRequest: (system: SystemId) => request<RequestResponse>(`/systems/${system}/request`),
  saveRequest: (system: SystemId, body: BookingRequest) =>
    request<RequestResponse>(`/systems/${system}/request`, { method: "PUT", body: JSON.stringify(body) }),

  book: (system: SystemId, slot: string) =>
    request<Booking>(`/bookings`, { method: "POST", body: JSON.stringify({ system, slot }) }),
  plans: () => request<PlansResponse>(`/plans`),
  checkout: (system: SystemId, plan: PlanId, slot: string | null) =>
    request<CheckoutResponse>(`/checkout`, { method: "POST", body: JSON.stringify({ system, plan, slot }) }),
  confirmCheckout: (sessionId: string) =>
    request<ConfirmResponse>(`/checkout/confirm`, { method: "POST", body: JSON.stringify({ sessionId }) }),
  booking: (id: string) => request<Booking>(`/bookings/${encodeURIComponent(id)}`),
  cancel: (id: string) => request<Booking>(`/bookings/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
