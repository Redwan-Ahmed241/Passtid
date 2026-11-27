"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** Query strings and fragments can carry password-reset tokens and payment session ids. */
const pathOnly = <T extends { url: string }>(event: T): T => ({ ...event, url: event.url.split(/[?#]/)[0] });

/** Vercel's speed and visitor statistics, both told only the path. Add any new one here, not in the layout. */
export function Insights() {
  return (
    <>
      <SpeedInsights beforeSend={pathOnly} />
      <Analytics beforeSend={pathOnly} />
    </>
  );
}
