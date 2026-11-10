import type { BookingStatus } from "@/lib/types";
import { adminUpdateBooking } from "@/server/mock-backend";
import { errorJson, handle, json, requireAdmin } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

/** Change a booking's status: mark it booked with its booking number, release it, or reopen it. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  return handle(async () => {
    requireAdmin(request);
    const body = (await request.json()) as { status?: unknown; reference?: unknown };
    if (body.status !== "pending" && body.status !== "booked" && body.status !== "released") {
      return errorJson(422, "invalid_status", "`status` must be pending, booked or released.");
    }
    return json(
      adminUpdateBooking(id, {
        status: body.status as BookingStatus,
        reference: typeof body.reference === "string" ? body.reference : null,
      }),
    );
  });
}
