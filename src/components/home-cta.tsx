"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useMe } from "./auth/use-me";

/** Primary calls to action. They change once you're signed in, since slots are for signed-in users only. */
export function HeroActions() {
  const { loading, user } = useMe();
  const { c } = useI18n();
  return (
    <div className="mt-8 flex flex-wrap gap-3 lg:justify-center">
      {user ? (
        <Link href="/console" className="btn btn-primary group h-12 px-5 text-base">
          {c.home.openConsole}
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ) : (
        <>
          <Link
            href="/register"
            className={`btn btn-primary group h-12 px-5 text-base ${loading ? "opacity-0" : ""}`}
          >
            {c.home.createAccount}
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link href="/login" className={`btn btn-ghost h-12 px-5 text-base ${loading ? "opacity-0" : ""}`}>
            {c.home.signIn}
          </Link>
        </>
      )}
      <Link href="/rules" className="btn h-12 px-3 text-base text-ink-2 hover:text-ink">
        {c.home.howMatching}
      </Link>
    </div>
  );
}

export function BottomCta() {
  const { user } = useMe();
  const { c } = useI18n();
  return (
    <Link href={user ? "/console" : "/register"} className="btn h-12 bg-paper px-5 text-base text-ink hover:opacity-90">
      {user ? c.home.openConsole : c.home.createAccount} <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
