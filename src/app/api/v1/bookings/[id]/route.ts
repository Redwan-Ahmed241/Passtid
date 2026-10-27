import { cancelBooking, getBooking } from "@/server/store";
import { handle, json, requireUser } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => json(await getBooking(id, requireUser(request).id)));
}

/** Cancelling releases the queue entry, so the count goes back down. */
export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => json(await cancelBooking(id, requireUser(request).id)));
}
