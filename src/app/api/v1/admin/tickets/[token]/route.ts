import type { TicketStatus } from "@/lib/types";
import { cleanMultiline } from "@/lib/sanitize";
import { adminUpdateTicket } from "@/server/admin";
import { errorJson, handle, json, requireAdmin, readJson } from "@/server/http";

type Ctx = { params: Promise<{ token: string }> };

/** Answer a ticket and/or change its status. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { token } = await params;
  return handle(async () => {
    requireAdmin(request);
    const body = (await readJson(request)) as { status?: unknown; reply?: unknown };
    if (body.status !== "open" && body.status !== "resolved") {
      return errorJson(422, "invalid_status", "`status` must be open or resolved.");
    }
    const reply = cleanMultiline(body.reply, 2000) || null;
    return json(await adminUpdateTicket(token, { status: body.status as TicketStatus, reply }));
  });
}
