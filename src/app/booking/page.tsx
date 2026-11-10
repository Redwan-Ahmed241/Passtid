import type { Metadata } from "next";
import { baseOpenGraph } from "@/lib/seo";
import { Suspense } from "react";
import { Booking, BookingFallback } from "@/components/booking/booking";

export const metadata: Metadata = {
  title: "Booking",
  description:
    "Set the days and times you can attend, then choose alerts or automatic booking. Passtid watches Swedish embassy slots in London for passports and ID cards.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/booking" },
  openGraph: { ...baseOpenGraph, url: "/booking" },
};

export default function BookingPage() {
  return (
    <Suspense fallback={<BookingFallback />}>
      <Booking />
    </Suspense>
  );
}
