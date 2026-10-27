/**
 * Cookie session.
 *
 * The session is a stateless, HMAC-signed, HttpOnly cookie, so it survives serverless cold
 * starts. /auth/me also checks that the account still exists.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "tl_session";
const MAX_AGE_S = 60 * 60 * 24 * 7;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  // A guessable fallback would let anyone forge a session, so production refuses to run without a real secret.
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production.");
  return "passtid-dev-secret-not-for-production";
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const mac = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

function sign(user: User): string {
  const body = b64(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S }));
  return `${body}.${mac(body)}`;
}

function verify(token: string): User | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(unb64(body)) as User & { exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    if (typeof data.id !== "string" || typeof data.email !== "string" || typeof data.name !== "string") return null;
    return { id: data.id, name: data.name, email: data.email };
  } catch {
    return null;
  }
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function userFromRequest(request: Request): User | null {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  return token ? verify(token) : null;
}

const secure = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");

export function sessionCookie(user: User): string {
  return `${SESSION_COOKIE}=${sign(user)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure()}`;
}

export function clearedCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`;
}
