import { isSystemId } from "@/lib/types";
import { getRequest, saveRequest } from "@/server/mock-backend";
import { errorJson, handle, json, parseBookingRequest, requireUser } from "@/server/http";

type Ctx = { params: Promise<{ system: string }> };

/** The caller's saved people, email and booking window for one service. */
export async function GET(request: Request, { params }: Ctx) {
  const { system } = await params;
  return handle(() => {
    const user = requireUser(request);
    if (!isSystemId(system)) return errorJson(404, "unknown_system", `Unknown system “${system}”.`);
    return json(getRequest(user.id, system, user.email));
  });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { system } = await params;
  return handle(async () => {
    const user = requireUser(request);
    if (!isSystemId(system)) return errorJson(404, "unknown_system", `Unknown system “${system}”.`);
    return json(saveRequest(user.id, system, parseBookingRequest(await request.json())));
  });
}
