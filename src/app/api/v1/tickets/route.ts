import { MAX_TICKET_MESSAGE, TICKET_CATEGORIES, isSystemId, type TicketCategory } from "@/lib/types";
import { createTicket, listMyTickets } from "@/server/admin";
import { cleanMultiline } from "@/lib/sanitize";
import { errorJson, handle, json, rateLimit, readJson, requireUser } from "@/server/http";

/** The caller's own tickets, newest first, with any answer from support. */
export async function GET(request: Request) {
  return handle(async () => json({ tickets: await listMyTickets((await requireUser(request)).id) }));
}

/** Report a problem. Answers with the ticket and its token, emails the user and alerts the administrator. */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    rateLimit(request, "ticket", 10, 60 * 60 * 1000, user.id);
    const body = (await readJson(request)) as { category?: unknown; system?: unknown; message?: unknown };
    const category = TICKET_CATEGORIES.find((c) => c === body.category) as TicketCategory | undefined;
    const message = cleanMultiline(body.message, MAX_TICKET_MESSAGE + 1);
    if (!category) return errorJson(422, "invalid_category", "Choose what the problem is about.");
    if (message.length < 10) return errorJson(422, "message_too_short", "Describe the problem in a few words.");
    if (message.length > MAX_TICKET_MESSAGE) return errorJson(422, "message_too_long", "The message is too long.");
    const ticket = await createTicket(user.id, user.email, {
      category,
      system: isSystemId(body.system) ? body.system : null,
      message,
    });
    return json(ticket, 201);
  });
}
