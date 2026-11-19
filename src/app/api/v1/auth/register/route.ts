import { EMAIL_RE } from "@/lib/applicants";
import { registerUser } from "@/server/auth";
import { errorJson, handle, json, rateLimit, readJson } from "@/server/http";
import { sessionCookie } from "@/server/session";

/** Creates the account and signs the new user in. */
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
    const user = await registerUser(email, password);
    return json(user, 201, { "Set-Cookie": sessionCookie(user) });
  });
}
