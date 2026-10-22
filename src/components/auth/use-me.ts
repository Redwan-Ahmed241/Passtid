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

/** Only allow same-site paths as a post-login destination. */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/console";
  return raw;
}
