"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LogOut } from "lucide-react";
import { signOut, useMe } from "./auth/use-me";

export function HeaderActions() {
  const router = useRouter();
  const { loading, user } = useMe();

  if (loading) {
    // Reserve the space so the header doesn't jump when the session resolves.
    return <div className="ml-auto h-11 w-28 md:ml-0 md:h-10 md:w-44" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Link href="/login" className="btn btn-ghost hidden h-10 min-h-10 px-4 text-sm md:inline-flex">
          Sign in
        </Link>
        <Link href="/register" className="btn btn-ink h-11 min-h-11 px-4 text-sm md:h-10 md:min-h-10">
          <span className="md:hidden">Sign in</span>
          <span className="hidden md:inline">Create account</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2 md:ml-0">
      <span className="hidden max-w-[10rem] truncate text-sm text-muted xl:inline" title={user.email}>
        {user.name}
      </span>
      <button
        type="button"
        onClick={() => void signOut().then(() => router.push("/"))}
        className="btn btn-ghost hidden h-10 min-h-10 px-3.5 text-sm md:inline-flex"
      >
        <LogOut className="size-4" aria-hidden="true" /> Sign out
      </button>
      {/* The nav already links to the console from tablet width up. */}
      <Link href="/console" className="btn btn-ink h-11 min-h-11 px-4 text-sm md:hidden">
        Console
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
