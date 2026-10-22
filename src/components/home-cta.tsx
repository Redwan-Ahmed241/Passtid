"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMe } from "./auth/use-me";

/** Primary calls to action. They change once you're signed in, since slots are for signed-in users only. */
export function HeroActions() {
  const { loading, user } = useMe();
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {user ? (
        <Link href="/console" className="btn btn-primary group h-12 px-5 text-base">
          Open the console
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ) : (
        <>
          <Link
            href="/register"
            className={`btn btn-primary group h-12 px-5 text-base ${loading ? "opacity-0" : ""}`}
          >
            Create an account
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link href="/login" className={`btn btn-ghost h-12 px-5 text-base ${loading ? "opacity-0" : ""}`}>
            Sign in
          </Link>
        </>
      )}
      <Link href="/rules" className="btn h-12 px-3 text-base text-ink-2 hover:text-ink">
        How matching works
      </Link>
    </div>
  );
}

export function BottomCta() {
  const { user } = useMe();
  return (
    <Link href={user ? "/console" : "/register"} className="btn h-12 bg-paper px-5 text-base text-ink hover:opacity-90">
      {user ? "Open the console" : "Create an account"} <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  );
}
