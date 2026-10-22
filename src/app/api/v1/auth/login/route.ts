import type { User } from "@/lib/types";
import { EMAIL_RE } from "@/lib/applicants";
import { errorJson, handle, json } from "@/server/http";
import { sessionCookie, userIdFor } from "@/server/session";

/** Demo sign-in: any valid email with a password of 8+ characters. The real backend checks credentials. */
export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_RE.test(email) || email.length > 200) return errorJson(422, "invalid_email", "Enter a valid email address.");
    if (password.length < 8) return errorJson(401, "invalid_credentials", "Email or password is incorrect.");
    const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    const name = local.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) || email;
    const user: User = { id: userIdFor(email), name, email };
    return json(user, 200, { "Set-Cookie": sessionCookie(user) });
  });
}
