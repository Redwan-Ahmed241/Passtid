import type { User } from "@/lib/types";
import { EMAIL_RE } from "@/lib/applicants";
import { errorJson, handle, json, rateLimit, readJson } from "@/server/http";
import { isAdminEmail, sessionCookie, userIdFor, withRole } from "@/server/session";

/** Demo registration: validates input and signs the user in. The real backend stores the account. */
export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "register", 10, 60 * 60 * 1000);
    const body = (await readJson(request)) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_RE.test(email) || email.length > 200) return errorJson(422, "invalid_email", "Enter a valid email address.");
    if (password.length < 8 || password.length > 200) {
      return errorJson(422, "weak_password", "Use a password of at least 8 characters.");
    }
    if (isAdminEmail(email)) return errorJson(409, "email_taken", "An account with this email already exists. Sign in instead.");
    const user: User = { id: userIdFor(email), email };
    return json(withRole(user), 201, { "Set-Cookie": sessionCookie(user) });
  });
}
