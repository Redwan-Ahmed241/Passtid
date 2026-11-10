/** Normalise a phone number to E.164: strip spaces/dashes, 00 -> +, 0 -> +46. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim().replace(/[\s-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  else if (value.startsWith("0")) value = `+46${value.slice(1)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) return null;
  return value;
}
