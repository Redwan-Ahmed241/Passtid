import { errorJson, handle, json, requireBot } from "@/server/http";
import { linkTelegram } from "@/server/store";

/** The customer opened t.me/<bot>?start=<code>; the bot connects that Telegram chat to the paid alerts. */
export async function POST(request: Request) {
  return handle(async () => {
    requireBot(request);
    const body = (await request.json()) as { code?: unknown; chatId?: unknown };
    if (typeof body.code !== "string" || !/^[a-f0-9]{24}$/.test(body.code) || (typeof body.chatId !== "string" && typeof body.chatId !== "number")) {
      return errorJson(422, "invalid_request", "`code` and `chatId` are required.");
    }
    if (!(await linkTelegram(body.code, String(body.chatId)))) return errorJson(404, "unknown_code", "No alert uses that code.");
    return json({ ok: true });
  });
}
