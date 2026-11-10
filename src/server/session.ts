/**
 * Cookie session for the bundled mock API.
 *
 * The session is a stateless, HMAC-signed cookie, so it survives serverless cold
 * starts. The real backend replaces this entirely; the frontend only relies on
 * the cookie being sent (credentials: "include") and on /auth/me.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "tl_session";
const MAX_AGE_S = 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.AUTH_SECRET || "passtid-demo-secret-replace-with-AUTH_SECRET";
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const mac = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function userIdFor(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function sign(user: User): string {
  // The role is never stored in the cookie: it is looked up again on every request.
  const body = b64(JSON.stringify({ id: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S }));
  return `${body}.${mac(body)}`;
}

/**
 * Administrators are named in ADMIN_EMAILS (comma-separated). The real backend keeps the role
 * in its database; the mock reads it from the environment so no page ever has to offer it.
 */
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** The user as the API returns it: the admin flag is added for administrators only. */
export function withRole(user: User): User {
  return isAdminEmail(user.email) ? { id: user.id, email: user.email, admin: true } : { id: user.id, email: user.email };
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
    if (typeof data.id !== "string" || typeof data.email !== "string") return null;
    return withRole({ id: data.id, email: data.email });
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
