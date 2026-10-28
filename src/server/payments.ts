/**
 * Stripe Checkout for the bundled mock API, talking to Stripe's REST API directly (no SDK).
 *
 * The flow is stateless on purpose: the plan, service and user go into the Checkout Session's
 * metadata, and on return the session is fetched from Stripe and checked (paid, right user,
 * right amount) before anything is activated. Without STRIPE_SECRET_KEY the same flow runs in
 * demo mode and nobody is charged.
 */
import { randomUUID } from "node:crypto";
import { planFor } from "@/lib/plans";
import type { PlanId, SystemId } from "@/lib/types";
import { ApiError } from "./mock-backend";

const STRIPE_API = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");

export const isDemoPayments = () => !process.env.STRIPE_SECRET_KEY;

const DEMO_PREFIX = "demo_";

async function stripe<T>(path: string, init: { method?: string; form?: URLSearchParams } = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(503, "payments_unavailable", "Payments are not configured.");
  let res: Response;
  try {
    res = await fetch(`${STRIPE_API}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        ...(init.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: init.form,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(502, "payments_unreachable", "Can't reach the payment provider. Try again in a moment.");
  }
  if (!res.ok) {
    console.error("Stripe error", res.status, await res.text().catch(() => ""));
    throw new ApiError(502, "payments_failed", "The payment provider refused the request. Try again.");
  }
  return (await res.json()) as T;
}

export interface CheckoutIntent {
  userId: string;
  email: string;
  system: SystemId;
  plan: PlanId;
  /** Slot the auto-book plan was bought for, if one was open at the time. */
  slot: string | null;
}

const PRODUCT_NAME: Record<PlanId, string> = {
  notify: "Passtid: Telegram slot alerts",
  autobook: "Passtid: automatic booking",
};

/** Start a payment and return the URL to send the browser to. */
export async function createCheckout(intent: CheckoutIntent, origin: string): Promise<{ url: string; demo: boolean }> {
  const plan = planFor(intent.plan);
  const back = `${origin}/booking?system=${intent.system}`;

  if (isDemoPayments()) {
    const id = `${DEMO_PREFIX}${randomUUID()}`;
    const meta = Buffer.from(JSON.stringify({ ...intent, amountCents: plan.amountCents }), "utf8").toString("base64url");
    return { url: `${back}&checkout=success&session_id=${id}.${meta}`, demo: true };
  }

  const form = new URLSearchParams({
    mode: "payment",
    success_url: `${back}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${back}&checkout=cancel`,
    client_reference_id: intent.userId,
    customer_email: intent.email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": plan.currency,
    "line_items[0][price_data][unit_amount]": String(plan.amountCents),
    "line_items[0][price_data][product_data][name]": PRODUCT_NAME[intent.plan],
    "metadata[user_id]": intent.userId,
    "metadata[system]": intent.system,
    "metadata[plan]": intent.plan,
    "metadata[slot]": intent.slot ?? "",
  });
  const session = await stripe<{ url?: string }>("/v1/checkout/sessions", { method: "POST", form });
  if (!session.url) throw new ApiError(502, "payments_failed", "The payment provider did not return a checkout page.");
  return { url: session.url, demo: false };
}

export interface PaidSession extends CheckoutIntent {
  /** The id that identifies this payment, so a page reload never starts a second booking. */
  sessionId: string;
}

/** Check that a returned session really was paid by this user, for this plan, at the current price. */
export async function verifyCheckout(sessionParam: string, userId: string): Promise<PaidSession> {
  const invalid = () => new ApiError(402, "payment_not_confirmed", "We could not confirm that payment.");

  if (isDemoPayments()) {
    const [id, meta] = sessionParam.split(".");
    if (!id?.startsWith(DEMO_PREFIX) || !meta) throw invalid();
    try {
      const data = JSON.parse(Buffer.from(meta, "base64url").toString("utf8")) as CheckoutIntent & { amountCents: number };
      if (data.userId !== userId) throw invalid();
      return { ...data, sessionId: id };
    } catch (err) {
      throw err instanceof ApiError ? err : invalid();
    }
  }

  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionParam)) throw invalid();
  const s = await stripe<{
    id: string;
    payment_status: string;
    amount_total: number | null;
    currency: string | null;
    customer_email: string | null;
    metadata: Record<string, string> | null;
  }>(`/v1/checkout/sessions/${sessionParam}`);

  const m = s.metadata ?? {};
  const plan = m.plan === "notify" || m.plan === "autobook" ? m.plan : null;
  const system = m.system === "passport" || m.system === "coordination_number" ? m.system : null;
  if (s.payment_status !== "paid" || m.user_id !== userId || !plan || !system) throw invalid();
  if (s.amount_total !== planFor(plan).amountCents || s.currency !== "usd") throw invalid();
  return { sessionId: s.id, userId, email: s.customer_email ?? "", system, plan, slot: m.slot || null };
}
