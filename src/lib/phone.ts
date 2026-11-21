/**
 * Normalise a phone number to E.164. A full international number is required (+44…, or 0044…):
 * customers book from abroad, so a leading 0 has no single country to assume.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim().replace(/[\s()-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) return null;
  return value;
}
