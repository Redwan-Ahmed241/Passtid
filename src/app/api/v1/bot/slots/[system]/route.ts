import { isSystemId } from "@/lib/types";
import { ApiError } from "@/server/errors";
import { SLOT_RE, errorJson, handle, json, requireBot } from "@/server/http";
import { replaceSlots } from "@/server/store";

/**
 * The bot publishes the open slots it currently sees for one service. The list replaces the previous one.
 * Body: { "slots": [{ "slot": "2026-10-23T09:30", "freeOnSite": 3 | null }] }
 */
export async function PUT(request: Request, { params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  return handle(async () => {
    requireBot(request);
    if (!isSystemId(system)) return errorJson(404, "unknown_system", `Unknown system “${system}”.`);
    const body = (await request.json()) as { slots?: unknown };
    if (!Array.isArray(body.slots) || body.slots.length > 2000) return errorJson(422, "invalid_slots", "`slots` must be a list.");
    const slots = body.slots.map((raw) => {
      const o = (raw ?? {}) as { slot?: unknown; freeOnSite?: unknown };
      if (typeof o.slot !== "string" || !SLOT_RE.test(o.slot)) throw new ApiError(422, "invalid_slots", "Each slot must look like 2026-10-23T09:30.");
      const free = typeof o.freeOnSite === "number" && Number.isInteger(o.freeOnSite) && o.freeOnSite >= 0 ? o.freeOnSite : null;
      return { slot: o.slot, freeOnSite: free };
    });
    await replaceSlots(system, slots);
    return json({ ok: true, count: slots.length });
  });
}
