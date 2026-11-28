import type { AlertsResponse } from "@/lib/types";
import { handle, json, requireUser } from "@/server/http";
import { listAlerts } from "@/server/store";

/** The caller's own Telegram alert subscriptions. */
export async function GET(request: Request) {
  return handle(async () => json<AlertsResponse>({ alerts: await listAlerts((await requireUser(request)).id) }));
}
