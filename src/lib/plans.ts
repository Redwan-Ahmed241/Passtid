import type { Plan, PlanId } from "./types";

/**
 * Plan prices in pence. Alerts are £4 a month, automatic booking is £30 once. Both are
 * overridable without a code change: PLAN_NOTIFY_CENTS and PLAN_AUTOBOOK_CENTS (the names
 * keep "CENTS" for compatibility; the unit is pence).
 */
const DEFAULTS: Record<PlanId, number> = { notify: 400, autobook: 3000 };
const ENV_KEYS: Record<PlanId, string> = { notify: "PLAN_NOTIFY_CENTS", autobook: "PLAN_AUTOBOOK_CENTS" };
const INTERVALS: Record<PlanId, Plan["interval"]> = { notify: "month", autobook: null };

export function planFor(id: PlanId): Plan {
  const raw = Number(process.env[ENV_KEYS[id]]);
  // Stripe's minimum charge is 30p; anything outside a sane range falls back to the default.
  const amountCents = Number.isInteger(raw) && raw >= 50 && raw <= 100_000 ? raw : DEFAULTS[id];
  return { id, amountCents, currency: "gbp", interval: INTERVALS[id] };
}

/** "£4", or "£4 / month" when the plan renews and a localised suffix is given. */
export function formatPrice(plan: Pick<Plan, "amountCents"> & { interval?: Plan["interval"] }, perMonth?: string): string {
  const pounds = plan.amountCents / 100;
  const amount = `£${Number.isInteger(pounds) ? pounds : pounds.toFixed(2)}`;
  return plan.interval === "month" && perMonth ? `${amount} ${perMonth}` : amount;
}
