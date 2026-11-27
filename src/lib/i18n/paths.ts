/** Pages that have their own address in each language. The address decides the language there. */
import type { Lang } from "./translations";

export const HOME_PATHS: Record<Lang, string> = { en: "/", sv: "/sv" };
export const QUESTIONS_PATHS: Record<Lang, string> = { en: "/questions", sv: "/sv/fragor" };

const PAIRS = [HOME_PATHS, QUESTIONS_PATHS];

export function routeOf(pathname: string): { lang: Lang; pair: Record<Lang, string> } | null {
  for (const pair of PAIRS) {
    if (pair.en === pathname) return { lang: "en", pair };
    if (pair.sv === pathname) return { lang: "sv", pair };
  }
  return null;
}
