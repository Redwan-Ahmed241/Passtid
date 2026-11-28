import { isPlanId, isSystemId, type CheckoutResponse } from "@/lib/types";
import { getRequest, listAlerts } from "@/server/store";
import { SLOT_RE, errorJson, handle, json, requireUser, readJson } from "@/server/http";
import { createCheckout } from "@/server/payments";

/** Start paying for a plan. Only a complete booking request can be paid for. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    const body = (await readJson(request)) as { system?: unknown; plan?: unknown; slot?: unknown };
    if (!isSystemId(body.system)) return errorJson(422, "invalid_system", "`system` must be passport or coordination_number.");
    if (!isPlanId(body.plan)) return errorJson(422, "invalid_plan", "`plan` must be notify or autobook.");
    const slot = typeof body.slot === "string" && SLOT_RE.test(body.slot) ? body.slot : null;

    if (!(await getRequest(user.id, body.system, user.email)).complete) {
      return errorJson(422, "incomplete_details", "Complete the people and email details for this service before paying.");
    }
    // A second alerts subscription for the same service would bill twice for the same messages.
    if (body.plan === "notify" && (await listAlerts(user.id)).some((a) => a.system === body.system)) {
      return errorJson(409, "already_subscribed", "Telegram alerts are already on for this service.");
    }
    const origin = new URL(request.url).origin;
    const checkout = await createCheckout(
      { userId: user.id, email: user.email, system: body.system, plan: body.plan, slot },
      origin,
    );
    return json<CheckoutResponse>(checkout, 201);
  });
}
