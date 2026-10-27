import { isPlanId, isSystemId, type CheckoutResponse } from "@/lib/types";
import { getRequest } from "@/server/mock-backend";
import { SLOT_RE, errorJson, handle, json, requireUser } from "@/server/http";
import { createCheckout } from "@/server/payments";

/** Start paying for a plan. Only a complete booking request can be paid for. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = requireUser(request);
    const body = (await request.json()) as { system?: unknown; plan?: unknown; slot?: unknown };
    if (!isSystemId(body.system)) return errorJson(422, "invalid_system", "`system` must be passport or coordination_number.");
    if (!isPlanId(body.plan)) return errorJson(422, "invalid_plan", "`plan` must be notify or autobook.");
    const slot = typeof body.slot === "string" && SLOT_RE.test(body.slot) ? body.slot : null;

    if (!getRequest(user.id, body.system, user.email).complete) {
      return errorJson(422, "incomplete_details", "Complete the people and email details for this service before paying.");
    }
    const origin = new URL(request.url).origin;
    const checkout = await createCheckout(
      { userId: user.id, email: user.email, system: body.system, plan: body.plan, slot },
      origin,
    );
    return json<CheckoutResponse>(checkout, 201);
  });
}
