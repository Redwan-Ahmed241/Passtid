import { planFor } from "@/lib/plans";
import { PLAN_IDS, type PlansResponse } from "@/lib/types";
import { handle, json, requireUser } from "@/server/http";
import { isDemoPayments } from "@/server/payments";

/** Current prices, so the UI never hard-codes them. */
export async function GET(request: Request) {
  return handle(() => {
    requireUser(request);
    return json<PlansResponse>({ plans: PLAN_IDS.map(planFor), demo: isDemoPayments() });
  });
}
