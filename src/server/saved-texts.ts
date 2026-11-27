/**
 * The administrator's changed texts, for server rendering. Without them the page would arrive with
 * the built-in wording and change after loading, and search engines could index the wrong one.
 */
import { cacheLife, cacheTag } from "next/cache";
import type { TextOverrides } from "@/lib/types";
import { getTexts } from "./admin";

export const TEXTS_TAG = "site-texts";

export async function savedTexts(): Promise<TextOverrides> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TEXTS_TAG);
  try {
    return await getTexts();
  } catch (err) {
    // The built-in wording is a complete site, so a database problem must not break any page.
    console.error("Saved site texts unavailable", err instanceof Error ? err.message : err);
    return { en: {}, sv: {} };
  }
}
