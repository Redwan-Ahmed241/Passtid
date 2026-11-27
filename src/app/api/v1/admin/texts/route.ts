import { revalidateTag } from "next/cache";
import { cleanMultiline } from "@/lib/sanitize";
import { adminSetTexts } from "@/server/admin";
import { handle, json, requireAdmin, readJson } from "@/server/http";
import { TEXTS_TAG } from "@/server/saved-texts";

/** Change site texts. Body: { en: { path: text | null }, sv: { ... } }. null restores the built-in text. */
export async function PUT(request: Request) {
  return handle(async () => {
    requireAdmin(request);
    const body = (await readJson(request)) as { en?: unknown; sv?: unknown };
    const part = (v: unknown): Record<string, string | null> => {
      if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
      return Object.fromEntries(
        Object.entries(v).slice(0, 2000).map(([k, text]) => [k, typeof text === "string" ? cleanMultiline(text, 5000) : null]),
      );
    };
    const saved = await adminSetTexts({ en: part(body.en), sv: part(body.sv) });
    revalidateTag(TEXTS_TAG, { expire: 0 }); // pages are rendered with these texts
    return json(saved);
  });
}
