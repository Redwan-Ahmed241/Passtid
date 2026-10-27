import { connection } from "next/server";
import { planFor } from "@/lib/plans";
import { PLAN_IDS, type PlansResponse } from "@/lib/types";
import { handle, json } from "@/server/http";
import { isDemoPayments } from "@/server/payments";

/** Current prices, so the UI never hard-codes them. Public: guests see the price before they create an account. */
export async function GET() {
  return handle(async () => {
    await connection(); // read prices from the runtime environment, not the build's
    return json<PlansResponse>({ plans: PLAN_IDS.map(planFor), demo: isDemoPayments() });
  });
}
