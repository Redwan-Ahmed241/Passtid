import { normalizePhone } from "@/lib/phone";
import { errorJson, handle, json, requireUser } from "@/server/http";
import { setUserPhone } from "@/server/store";

/** Save or clear the optional phone used to link a Telegram chat. */
export async function PUT(request: Request) {
  return handle(async () => {
    const user = requireUser(request);
    const body = (await request.json()) as { phone?: unknown };
    if (body.phone !== null && typeof body.phone !== "string") {
      return errorJson(422, "invalid_phone", "Enter a valid phone number.");
    }
    if (body.phone === null || body.phone.trim() === "") {
      return json({ phone: await setUserPhone(user.id, null) });
    }
    const phone = normalizePhone(body.phone);
    if (!phone) return errorJson(422, "invalid_phone", "Enter a valid phone number.");
    return json({ phone: await setUserPhone(user.id, phone) });
  });
}
