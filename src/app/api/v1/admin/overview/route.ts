import { adminOverview } from "@/server/mock-backend";
import { handle, json, requireAdmin } from "@/server/http";

/** Every customer with their saved requests, bookings and alerts, plus all support tickets. */
export async function GET(request: Request) {
  return handle(() => {
    requireAdmin(request);
    return json(adminOverview());
  });
}
