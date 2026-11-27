"use client";

import { useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import type { User } from "@/lib/types";

/**
 * The signed-in user, shared by the header, the menu, the auth forms and the console.
 * One request is cached and re-run whenever someone signs in or out.
 */
const EVENT = "tl-auth";
let cache: Promise<User | null> | null = null;

function fetchMe(): Promise<User | null> {
  return api.me().then(
    (u) => u,
    (err: unknown) => {
      if (err instanceof ApiRequestError && err.status !== 401) return null;
      return null;
    },
  );
}

export function loadMe(force = false): Promise<User | null> {
  if (!cache || force) cache = fetchMe();
  return cache;
}

/**
 * The browser can bring a whole page back from memory (Back after leaving the site or after a full
 * reload). If the person has signed out or changed since, that page shows someone else's details.
 */
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || !cache) return;
    void Promise.all([cache, fetchMe()]).then(([before, now]) => {
      if ((before?.id ?? null) !== (now?.id ?? null)) window.location.reload();
    });
  });
}

/** Call after a successful sign-in or sign-out so every listener refreshes. */
export function announceAuthChange(user: User | null) {
  cache = Promise.resolve(user);
  window.dispatchEvent(new Event(EVENT));
}

/** Ends the session on the backend, then tells every listener. Resolves even if the request fails. */
export function signOut(): Promise<void> {
  return api.logout().then(
    () => announceAuthChange(null),
    () => announceAuthChange(null),
  );
}

/**
 * Sign out from a button. A full page load afterwards, not an in-app navigation: pages already visited
 * stay in memory with their contents, and Back would show them to whoever uses the browser next.
 */
export function signOutAndLeave(): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  void signOut().then(() => window.location.assign("/"));
}

export function useMe():{ loading: boolean; user: User | null } {
  const [state, setState] = useState<{ loading: boolean; user: User | null }>({ loading: true, user: null });

  useEffect(() => {
    let alive = true;
    const sync = () => {
      void loadMe().then((user) => {
        if (alive) setState({ loading: false, user });
      });
    };
    sync();
    window.addEventListener(EVENT, sync);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  return state;
}

/** Short label for the header: the first name guessed from the email, e.g. "naseem_hasan@x.com" -> "Naseem". */
export function displayName(email: string): string {
  const first = email.split("@")[0]?.split(/[._\-+\d]+/).find(Boolean) ?? email;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Only allow same-site paths as a post-login destination. */
export function safeNext(raw: string | null): string {
  // Same-site paths only. Anything with a backslash, control character or second slash can be read as another host.
  if (!raw || raw.length > 300 || !/^\/(?!\/)[A-Za-z0-9\-._~/?=&%#+]*$/.test(raw)) return "/booking";
  return raw;
}
