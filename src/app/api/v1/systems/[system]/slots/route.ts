import { isSystemId } from "@/lib/types";
import { listSlots } from "@/server/store";
import { errorJson, handle, json, requireUser } from "@/server/http";

export async function GET(request: Request, { params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  return handle(async () => {
    const user = requireUser(request);
    if (!isSystemId(system)) return errorJson(404, "unknown_system", `Unknown system “${system}”.`);
    return json(await listSlots(system, user.id));
  });
}
