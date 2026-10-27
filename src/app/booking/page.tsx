import type { Metadata } from "next";
import { Suspense } from "react";
import { Booking, BookingFallback } from "@/components/booking/booking";

export const metadata: Metadata = {
  title: "Booking",
  description:
    "Set the days and times you can attend, see every open Swedish embassy slot in London on a month calendar with its live queue count, and book the quiet one. Covers passports, ID cards and coordination numbers.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/booking" },
  openGraph: { url: "/booking" },
};

export default function BookingPage() {
  return (
    <Suspense fallback={<BookingFallback />}>
      <Booking />
    </Suspense>
  );
}
