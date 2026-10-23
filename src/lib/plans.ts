import type { Plan, PlanId } from "./types";

/**
 * Plan prices in cents. The client has not confirmed a price list yet, so both are
 * overridable without a code change: PLAN_NOTIFY_CENTS (default 500, in the 4–6 USD
 * range quoted) and PLAN_AUTOBOOK_CENTS (default 2500).
 */
const DEFAULTS: Record<PlanId, number> = { notify: 500, autobook: 2500 };
const ENV_KEYS: Record<PlanId, string> = { notify: "PLAN_NOTIFY_CENTS", autobook: "PLAN_AUTOBOOK_CENTS" };

export function planFor(id: PlanId): Plan {
  const raw = Number(process.env[ENV_KEYS[id]]);
  // Stripe's minimum charge is 50 cents; anything else falls back to the default.
  const amountCents = Number.isInteger(raw) && raw >= 50 && raw <= 100_000 ? raw : DEFAULTS[id];
  return { id, amountCents, currency: "usd" };
}

export function formatPrice(plan: Pick<Plan, "amountCents">): string {
  const dollars = plan.amountCents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}
