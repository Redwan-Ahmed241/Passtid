import { FEEDBACK_STATUSES } from "@/lib/types";
import { adminDeleteFeedback, adminSetFeedbackStatus } from "@/server/feedback";
import { errorJson, handle, json, requireAdmin, readJson } from "@/server/http";

type Ctx = { params: Promise<{ clientId: string }> };

/** Publish or hide one customer's feedback. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { clientId } = await params;
  return handle(async () => {
    requireAdmin(request);
    const body = (await readJson(request)) as { status?: unknown; seenAt?: unknown };
    const status = FEEDBACK_STATUSES.find((s) => s === body.status);
    if (!status || typeof body.seenAt !== "string" || Number.isNaN(Date.parse(body.seenAt))) {
      return errorJson(422, "invalid_status", "Send the new status and the version you reviewed.");
    }
    return json(await adminSetFeedbackStatus(clientId, status, body.seenAt));
  });
}

/** Erase the feedback altogether. */
export async function DELETE(request: Request, { params }: Ctx) {
  const { clientId } = await params;
  return handle(async () => {
    requireAdmin(request);
    await adminDeleteFeedback(clientId);
    return json({ ok: true });
  });
}
