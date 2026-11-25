"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

/** Speed Insights, told only the path: query strings and fragments can carry tokens and payment session ids. */
export function Insights() {
  return <SpeedInsights beforeSend={(event) => ({ ...event, url: event.url.split(/[?#]/)[0] })} />;
}
