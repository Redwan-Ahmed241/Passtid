import { errorJson, handle, json, requireUser } from "@/server/http";
import { fulfilPayment } from "@/server/store";
import { verifyCheckout } from "@/server/payments";

/** Called when the browser comes back from checkout: verify the payment, then activate what was bought. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = requireUser(request);
    const body = (await request.json()) as { sessionId?: unknown };
    if (typeof body.sessionId !== "string" || body.sessionId.length > 4000) {
      return errorJson(422, "invalid_session", "`sessionId` is required.");
    }
    const paid = await verifyCheckout(body.sessionId, user.id);
    return json(await fulfilPayment(paid, user.id));
  });
}
