import type { ApiErrorBody, Booking, BookingWindow, SlotsResponse, SystemId, WindowResponse } from "./types";

/**
 * Browser client for the booking backend.
 * Defaults to the bundled mock API; set NEXT_PUBLIC_API_BASE_URL to the real
 * service (e.g. https://api.example.com/v1) to switch over.
 */
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1").replace(/\/$/, "");

const CLIENT_KEY = "slot-console.client-id";

let memoryClientId: string | null = null;

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function clientId(): string {
  if (memoryClientId) return memoryClientId;
  try {
    const stored = window.localStorage.getItem(CLIENT_KEY);
    if (stored) return (memoryClientId = stored);
    const id = makeId();
    window.localStorage.setItem(CLIENT_KEY, id);
    return (memoryClientId = id);
  } catch {
    // Private mode or blocked storage: keep an id for this tab only.
    return (memoryClientId = makeId());
  }
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
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId(),
        ...init.headers,
      },
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
  slots: (system: SystemId, signal?: AbortSignal) =>
    request<SlotsResponse>(`/systems/${system}/slots`, { signal }),
  book: (system: SystemId, slot: string) =>
    request<Booking>(`/bookings`, { method: "POST", body: JSON.stringify({ system, slot }) }),
  booking: (id: string) => request<Booking>(`/bookings/${encodeURIComponent(id)}`),
  cancel: (id: string) => request<Booking>(`/bookings/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getWindow: () => request<WindowResponse>(`/window`),
  saveWindow: (window: BookingWindow) =>
    request<WindowResponse>(`/window`, { method: "PUT", body: JSON.stringify(window) }),
};
