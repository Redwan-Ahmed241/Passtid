import { handle, json } from "@/server/http";
import { paidFromWebhook } from "@/server/payments";
import { fulfilPayment } from "@/server/store";

/**
 * Stripe calls this when a checkout is paid, so the plan is activated even if the customer closes the tab
 * before returning to the site. Set the endpoint to /api/v1/stripe/webhook and STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const raw = await request.text();
    const paid = paidFromWebhook(raw, request.headers.get("stripe-signature"));
    if (paid) await fulfilPayment(paid, paid.userId);
    return json({ received: true });
  });
}
