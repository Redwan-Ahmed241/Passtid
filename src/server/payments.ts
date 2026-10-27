/**
 * Stripe Checkout, talking to Stripe's REST API directly (no SDK).
 *
 * The plan, service and user go into the Checkout Session's metadata. When the customer comes back,
 * and again when Stripe's webhook fires, the payment is checked (paid, right user, right amount)
 * before anything is activated; activation is idempotent, so doing it twice is harmless.
 *
 * Without STRIPE_SECRET_KEY the flow runs in demo mode and nobody is charged. Demo mode only exists
 * outside production: a production deployment without a key refuses to take orders.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { planFor } from "@/lib/plans";
import type { PlanId, SystemId } from "@/lib/types";
import { ApiError } from "./errors";

const STRIPE_API = (process.env.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");

export const isDemoPayments = () => !process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production";

const DEMO_PREFIX = "demo_";

async function stripe<T>(path: string, init: { method?: string; form?: URLSearchParams } = {}): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(503, "payments_unavailable", "Payments are not available yet.");
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

interface StripeSession {
  id: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  customer_email: string | null;
  metadata: Record<string, string> | null;
}

const invalid = () => new ApiError(402, "payment_not_confirmed", "We could not confirm that payment.");

/** A Checkout Session counts only if it is paid, for a known plan, at the current price. */
function paidFromSession(s: StripeSession, expectedUserId: string | null): PaidSession {
  const m = s.metadata ?? {};
  const plan = m.plan === "notify" || m.plan === "autobook" ? m.plan : null;
  const system = m.system === "passport" || m.system === "migration" ? m.system : null;
  if (s.payment_status !== "paid" || !m.user_id || !plan || !system) throw invalid();
  if (expectedUserId && m.user_id !== expectedUserId) throw invalid();
  if (s.amount_total !== planFor(plan).amountCents || s.currency !== "usd") throw invalid();
  return { sessionId: s.id, userId: m.user_id, email: s.customer_email ?? "", system, plan, slot: m.slot || null };
}

/** Check that a returned session really was paid by this user, for this plan, at the current price. */
export async function verifyCheckout(sessionParam: string, userId: string): Promise<PaidSession> {
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
  return paidFromSession(await stripe<StripeSession>(`/v1/checkout/sessions/${sessionParam}`), userId);
}

/**
 * Verify a webhook from Stripe (signature over the raw body, 5 minute tolerance) and return the paid
 * session it carries, or null for events we do not act on.
 */
export function paidFromWebhook(rawBody: string, signatureHeader: string | null): PaidSession | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, "webhook_unavailable", "Webhooks are not configured.");
  const parts = Object.fromEntries((signatureHeader ?? "").split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!parts.t || !parts.v1 || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) {
    throw new ApiError(400, "bad_signature", "Invalid webhook signature.");
  }
  const expected = Buffer.from(createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex"));
  const given = Buffer.from(parts.v1);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new ApiError(400, "bad_signature", "Invalid webhook signature.");
  }
  const event = JSON.parse(rawBody) as { type?: string; data?: { object?: StripeSession } };
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return null;
  if (!event.data?.object) return null;
  return paidFromSession(event.data.object, null);
}
