import { cancelBooking, getBooking } from "@/server/mock-backend";
import { clientIdOf, handle, json } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(() => json(getBooking(id, clientIdOf(request))));
}

/** Cancelling releases the queue entry, so the count goes back down. */
export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(() => json(cancelBooking(id, clientIdOf(request))));
}
