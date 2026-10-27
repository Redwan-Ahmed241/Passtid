"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMe } from "./auth/use-me";

/** Primary call to action. Signed-in users go straight back into booking. */
export function HeroActions() {
  const { user } = useMe();
  const { c } = useI18n();
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link href="/booking" className="btn btn-primary group h-12 px-6 text-base">
        {user ? c.home.openBooking : c.home.startBooking}
        <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
      <Link href="#how" className="btn btn-ghost h-12 px-6 text-base">
        {c.home.howTitle}
      </Link>
    </div>
  );
}

export function BottomCta() {
  const { user } = useMe();
  const { c } = useI18n();
  return (
    <Link href="/booking" className="btn btn-primary group h-12 px-6 text-base">
      {user ? c.home.openBooking : c.home.startBooking}
      <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
