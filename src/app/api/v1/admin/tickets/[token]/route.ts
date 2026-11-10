import type { TicketStatus } from "@/lib/types";
import { adminUpdateTicket } from "@/server/mock-backend";
import { errorJson, handle, json, requireAdmin } from "@/server/http";

type Ctx = { params: Promise<{ token: string }> };

/** Answer a ticket and/or change its status. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { token } = await params;
  return handle(async () => {
    requireAdmin(request);
    const body = (await request.json()) as { status?: unknown; reply?: unknown };
    if (body.status !== "open" && body.status !== "resolved") {
      return errorJson(422, "invalid_status", "`status` must be open or resolved.");
    }
    const reply = typeof body.reply === "string" && body.reply.trim() ? body.reply.trim().slice(0, 2000) : null;
    return json(adminUpdateTicket(token, { status: body.status as TicketStatus, reply }));
  });
}
