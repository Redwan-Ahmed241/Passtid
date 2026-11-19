import type { User } from "@/lib/types";
import { EMAIL_RE } from "@/lib/applicants";
import { errorJson, handle, json, rateLimit, readJson } from "@/server/http";
import { isAdminEmail, sessionCookie, userIdFor, withRole } from "@/server/session";
import { timingSafeEqual } from "node:crypto";

/** Administrator accounts sign in with ADMIN_PASSWORD, so a demo sign-in can never reach the admin panel. */
function adminPasswordOk(given: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Demo sign-in: any valid email with a password of 8+ characters. The real backend checks credentials. */
export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "login", 20, 10 * 60 * 1000);
    const body = (await readJson(request)) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_RE.test(email) || email.length > 200) return errorJson(422, "invalid_email", "Enter a valid email address.");
    if (password.length < 8 || password.length > 200) return errorJson(401, "invalid_credentials", "Email or password is incorrect.");
    if (isAdminEmail(email) && !adminPasswordOk(password)) {
      return errorJson(401, "invalid_credentials", "Email or password is incorrect.");
    }
    const user: User = { id: userIdFor(email), email };
    return json(withRole(user), 200, { "Set-Cookie": sessionCookie(user) });
  });
}
