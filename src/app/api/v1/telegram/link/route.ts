import { connection } from "next/server";
import { getTelegramLink } from "@/server/store";
import { handle, json, requireUser } from "@/server/http";

/** Optional Telegram link for automatic-booking customers; email is always sent regardless. */
export async function GET(request: Request) {
  // Depends on the request's cookie, so never prerender this.
  await connection();
  return handle(async () => json({ url: await getTelegramLink((await requireUser(request)).id) }));
}
