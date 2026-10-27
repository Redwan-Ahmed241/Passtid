import { isSystemId } from "@/lib/types";
import { createBooking } from "@/server/store";
import { SLOT_RE, errorJson, handle, json, requireUser } from "@/server/http";

/** Confirming a request puts the caller in the queue immediately, before the booking succeeds. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = requireUser(request);
    const body = (await request.json()) as { system?: unknown; slot?: unknown };
    if (!isSystemId(body.system)) return errorJson(422, "invalid_system", "`system` must be passport or migration.");
    if (typeof body.slot !== "string" || !SLOT_RE.test(body.slot)) {
      return errorJson(422, "invalid_slot", "`slot` must look like 2026-10-23T09:30.");
    }
    return json(await createBooking(body.system, body.slot, user.id), 201);
  });
}
