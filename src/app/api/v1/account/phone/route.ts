import { normalizePhone } from "@/lib/phone";
import { connection } from "next/server";
import { errorJson, handle, json, requireUser } from "@/server/http";
import { getUserPhone, setUserPhone } from "@/server/store";

/** Read the optional phone for prefill. */
export async function GET(request: Request) {
  await connection();
  return handle(async () => json({ phone: await getUserPhone(requireUser(request).id) }));
}

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
