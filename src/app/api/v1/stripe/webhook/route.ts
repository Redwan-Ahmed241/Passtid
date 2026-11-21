import { handle, json } from "@/server/http";
import { readWebhook } from "@/server/payments";
import { endSubscription, fulfilPayment } from "@/server/store";

/**
 * Stripe calls this when a checkout is paid, so the plan is activated even if the customer closes the tab
 * before returning to the site, and when a monthly alerts subscription ends, so the alerts stop.
 * Set the endpoint to /api/v1/stripe/webhook, subscribe it to checkout.session.completed,
 * checkout.session.async_payment_succeeded and customer.subscription.deleted, and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const raw = await request.text();
    const { paid, endedSubscription } = readWebhook(raw, request.headers.get("stripe-signature"));
    if (paid) await fulfilPayment(paid, paid.userId);
    if (endedSubscription) await endSubscription(endedSubscription);
    return json({ received: true });
  });
}
