import { Check } from "lucide-react";

const points = [
  "See every open slot on a month calendar, with the live queue count on each one.",
  "Set several date ranges, each with its own times. The bot books only inside them.",
  "Passports and migration, one account. Times are always London time.",
];

/** Two-column frame for sign-in and registration: a short pitch beside the form. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:px-8">
      <div className="order-2 max-w-md lg:order-1 lg:pt-6">
        <p className="label-mono">Why an account</p>
        <p className="mt-4 font-display text-[1.75rem] leading-snug font-medium text-ink">
          Slots and queue counts are for signed-in users only.
        </p>
        <ul className="mt-6 space-y-3.5">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-[0.9375rem] text-ink-2">
              <Check className="mt-1 size-4 flex-none text-clear" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 flex lg:order-2 lg:justify-end">{children}</div>
    </div>
  );
}
