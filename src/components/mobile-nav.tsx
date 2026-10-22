"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOut, useMe } from "./auth/use-me";

const links = [
  { href: "/console", label: "Console" },
  { href: "/rules", label: "Booking rules" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useMe();
  // Remembering the path the menu was opened on closes it automatically on navigation.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenPath(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpenPath(null);
  const row = "flex min-h-14 w-full items-center text-left text-lg text-ink";

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpenPath(open ? null : pathname)}
        className="grid size-11 place-items-center rounded-[0.625rem] border border-line bg-surface text-ink"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="animate-rise absolute inset-x-0 top-full border-b border-line bg-paper px-4 pt-2 pb-4 shadow-md"
        >
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href} className="border-b border-line-2">
                <Link
                  href={l.href}
                  onClick={close}
                  aria-current={l.href === pathname ? "page" : undefined}
                  className={row}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <button
                  type="button"
                  className={row}
                  onClick={() => {
                    close();
                    void signOut().then(() => router.push("/"));
                  }}
                >
                  Sign out
                  <span className="ml-auto max-w-[10rem] truncate text-sm text-muted">{user.name}</span>
                </button>
              ) : (
                <Link href="/login" onClick={close} className={row}>
                  Sign in
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
