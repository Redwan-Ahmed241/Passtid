/**
 * Text cleaning shared by the API and the UI. React escapes everything it renders, so this is
 * not about HTML: it removes what has no place in a name, an email or a message and is used to
 * disguise content: control characters, zero-width characters and bidirectional overrides.
 */

// C0/C1 controls except tab and newline, zero-width and word-joiner characters, bidi embeddings, isolates and BOM.
const INVISIBLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/** One line of text: normalised, no control or invisible characters, single spaces, trimmed, capped. */
export function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Free text such as a support message: newlines kept (at most two in a row), everything else as cleanLine. */
export function cleanMultiline(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}
