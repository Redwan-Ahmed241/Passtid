import { adminSetTexts } from "@/server/mock-backend";
import { handle, json, requireAdmin } from "@/server/http";

/** Change site texts. Body: { en: { path: text | null }, sv: { ... } }. null restores the built-in text. */
export async function PUT(request: Request) {
  return handle(async () => {
    requireAdmin(request);
    const body = (await request.json()) as { en?: unknown; sv?: unknown };
    const part = (v: unknown) => (typeof v === "object" && v !== null ? (v as Record<string, string | null>) : {});
    return json(adminSetTexts({ en: part(body.en), sv: part(body.sv) }));
  });
}
