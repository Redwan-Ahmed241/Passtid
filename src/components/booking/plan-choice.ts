/**
 * The plan the visitor picked, remembered for this tab. It has to survive what takes them away from
 * the page and back: another page, signing in, a reload and the trip to the payment page.
 */
import { useEffect, useSyncExternalStore } from "react";
import { isPlanId, type PlanId } from "@/lib/types";

const KEY = "passtid-plan";
const listeners = new Set<() => void>();
/** Kept in memory too, so choosing still works when storage is blocked. */
let chosen: PlanId | null = null;

function read(): PlanId | null {
  if (chosen) return chosen;
  try {
    const saved = sessionStorage.getItem(KEY);
    return isPlanId(saved) ? saved : null;
  } catch {
    return null;
  }
}

/** A `?plan=` left in the address would override every later choice on the page. */
function dropFromAddress(): void {
  const q = new URLSearchParams(window.location.search);
  if (!q.has("plan")) return;
  q.delete("plan");
  const qs = q.toString();
  window.history.replaceState(window.history.state, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

export function choosePlan(plan: PlanId): void {
  dropFromAddress();
  chosen = plan;
  try {
    sessionStorage.setItem(KEY, plan);
  } catch {}
  listeners.forEach((cb) => cb());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/**
 * The picked plan, or null if none was picked. A `?plan=` link (from the home page, or back from
 * payment) is a pick: it is remembered and then taken out of the address, so that a later change on
 * the page is not undone by an old address in the history.
 */
export function usePlanChoice(fromUrl: string | null): PlanId | null {
  const linked = isPlanId(fromUrl) ? fromUrl : null;
  const saved = useSyncExternalStore(subscribe, read, () => null);
  useEffect(() => {
    if (linked) choosePlan(linked);
  }, [linked]);
  return linked ?? saved;
}
