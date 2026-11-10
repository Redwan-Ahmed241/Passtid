import { MAX_TICKET_MESSAGE, TICKET_CATEGORIES, isSystemId, type TicketCategory } from "@/lib/types";
import { createTicket, listMyTickets } from "@/server/mock-backend";
import { errorJson, handle, json, requireUser } from "@/server/http";
import { notifyAdminOfTicket } from "@/server/notify";

/** The caller's own tickets, newest first, with any answer from support. */
export async function GET(request: Request) {
  return handle(() => json({ tickets: listMyTickets(requireUser(request).id) }));
}

/** Report a problem. Answers with the ticket and its token, and notifies the administrator. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = requireUser(request);
    const body = (await request.json()) as { category?: unknown; system?: unknown; message?: unknown };
    const category = TICKET_CATEGORIES.find((c) => c === body.category) as TicketCategory | undefined;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!category) return errorJson(422, "invalid_category", "Choose what the problem is about.");
    if (message.length < 10) return errorJson(422, "message_too_short", "Describe the problem in a few words.");
    if (message.length > MAX_TICKET_MESSAGE) return errorJson(422, "message_too_long", "The message is too long.");
    const ticket = createTicket(user.id, user.email, {
      category,
      system: isSystemId(body.system) ? body.system : null,
      message,
    });
    notifyAdminOfTicket(ticket);
    return json(ticket, 201);
  });
}
