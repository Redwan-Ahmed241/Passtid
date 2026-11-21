import { adminOverview } from "@/server/admin";
import { handle, json, requireAdmin } from "@/server/http";

/** Every customer with their saved requests, bookings and alerts, plus all support tickets. */
export async function GET(request: Request) {
  return handle(async () => {
    requireAdmin(request);
    return json(await adminOverview());
  });
}
