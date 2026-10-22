import type { Metadata } from "next";
import { Suspense } from "react";
import { Console, ConsoleFallback } from "@/components/console/console";

export const metadata: Metadata = {
  title: "Booking console",
  description:
    "Set the days and times you can attend, see every open Swedish embassy slot in London with its live queue count, and book the quiet one. Covers passports, ID cards and coordination numbers.",
  alternates: { canonical: "/console" },
  openGraph: { url: "/console" },
};

export default function ConsolePage() {
  return (
    <Suspense fallback={<ConsoleFallback />}>
      <Console />
    </Suspense>
  );
}
