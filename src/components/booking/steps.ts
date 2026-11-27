/**
 * The booking steps as browser history. `?step=` in the address says which one is showing; Next.js
 * keeps useSearchParams in step with window.history.
 */
export type Step = 1 | 2 | 3 | 4;

export const stepFromUrl = (value: string | null): Step => (value === "2" ? 2 : value === "3" ? 3 : value === "4" ? 4 : 1);

function url(step: Step): string {
  const q = new URLSearchParams(window.location.search);
  if (step === 1) q.delete("step");
  else q.set("step", String(step));
  const qs = q.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

/** Marks the entries we added, so the in-page Back button knows there is one behind it. */
const MARK = "bookingStep";

/** Move forward: Back returns to the step before. */
export function goToStep(step: Step): void {
  window.history.pushState({ [MARK]: true }, "", url(step));
}

/** Change the step without adding a history entry, for resets and corrections. */
export function showStep(step: Step): void {
  window.history.replaceState(window.history.state, "", url(step));
}

/** The in-page Back button: the same as the browser's, unless the page was opened part-way through. */
export function goBackToStep(step: Step): void {
  if (window.history.state?.[MARK]) window.history.back();
  else showStep(step);
}
