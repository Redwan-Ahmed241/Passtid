import { errorJson, handle, json, requireBot } from "@/server/http";
import { recordBookingResult } from "@/server/store";
import type { ReleaseReason } from "@/lib/types";

const REASONS = ["failed", "cancelled", "timed_out", "slot_gone"] as const;

/**
 * The bot reports how a booking attempt is going.
 * Body: { "status": "pending" | "booked" | "released", "reference"?: "SE-...", "reason"?: "failed" | "slot_gone" | ... }
 * "pending" counts as progress and keeps the slot held.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    requireBot(request);
    const body = (await request.json()) as { status?: unknown; reference?: unknown; reason?: unknown };
    if (body.status !== "pending" && body.status !== "booked" && body.status !== "released") {
      return errorJson(422, "invalid_status", "`status` must be pending, booked or released.");
    }
    const reason = REASONS.find((r) => r === body.reason) as ReleaseReason | undefined;
    const reference = typeof body.reference === "string" ? body.reference.slice(0, 64) : null;
    return json(await recordBookingResult(id, { status: body.status, reason, reference }));
  });
}
