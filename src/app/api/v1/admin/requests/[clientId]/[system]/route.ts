import { isSystemId } from "@/lib/types";
import { adminSaveRequest } from "@/server/admin";
import { errorJson, handle, json, parseBookingRequest, requireAdmin, readJson } from "@/server/http";

type Ctx = { params: Promise<{ clientId: string; system: string }> };

/** Change a customer's saved people, email and booking window on their behalf. */
export async function PUT(request: Request, { params }: Ctx) {
  const { clientId, system } = await params;
  return handle(async () => {
    requireAdmin(request);
    if (!isSystemId(system)) return errorJson(404, "unknown_system", `Unknown system “${system}”.`);
    const body = (await readJson(request)) as { seenAt?: unknown };
    // Required, so a save that cannot say which version it edited never overwrites anything.
    if (body.seenAt !== null && (typeof body.seenAt !== "string" || Number.isNaN(Date.parse(body.seenAt)))) {
      return errorJson(422, "missing_version", "Refresh the page and try again.");
    }
    return json(await adminSaveRequest(clientId, system, parseBookingRequest(body), body.seenAt));
  });
}
