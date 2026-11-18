/**
 * Lets an administrator change any text on the site without a deploy.
 * Every built-in string has a path ("t.signIn", "c.home.heroTitle", "l.privacy.sections.0.h");
 * an override stored under that path replaces it for that language.
 */
import { content } from "./content";
import { legal } from "./legal";
import { translations, type Lang } from "./translations";

/** Collects every string under `value` as path -> text. Numbers and booleans are not editable. */
function flatten(value: unknown, prefix: string, out: Record<string, string> = {}): Record<string, string> {
  if (typeof value === "string") out[prefix] = value;
  else if (Array.isArray(value)) value.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) flatten(v, `${prefix}.${k}`, out);
  }
  return out;
}

/** A copy of `value` with the overridden strings swapped in. */
export function applyOverrides<T>(value: T, prefix: string, map: Record<string, string>): T {
  if (typeof value === "string") return (map[prefix] ?? value) as T;
  if (Array.isArray(value)) return value.map((v, i) => applyOverrides(v, `${prefix}.${i}`, map)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, applyOverrides(v, `${prefix}.${k}`, map)]),
    ) as T;
  }
  return value;
}

/** Every editable text in one language, by path, with its built-in value. */
export function builtinTexts(lang: Lang): Record<string, string> {
  return { ...flatten(translations[lang], "t"), ...flatten(content[lang], "c"), ...flatten(legal[lang], "l") };
}
