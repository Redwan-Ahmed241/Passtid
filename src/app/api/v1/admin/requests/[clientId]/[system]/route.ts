import { isSystemId } from "@/lib/types";
import { adminSaveRequest } from "@/server/mock-backend";
import { errorJson, handle, json, parseBookingRequest, requireAdmin } from "@/server/http";

type Ctx = { params: Promise<{ clientId: string; system: string }> };

/** Change a customer's saved people, email and booking window on their behalf. */
export async function PUT(request: Request, { params }: Ctx) {
  const { clientId, system } = await params;
  return handle(async () => {
    requireAdmin(request);
    if (!isSystemId(system)) return errorJson(404, "unknown_system", `Unknown system “${system}”.`);
    return json(adminSaveRequest(clientId, system, parseBookingRequest(await request.json())));
  });
}
