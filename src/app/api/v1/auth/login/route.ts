import { EMAIL_RE } from "@/lib/applicants";
import { authenticate, authenticateAdmin } from "@/server/auth";
import { errorJson, handle, json, rateLimit, readJson } from "@/server/http";
import { isAdminEmail, sessionCookie, withRole } from "@/server/session";

export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "login", 20, 10 * 60 * 1000);
    const body = (await readJson(request)) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_RE.test(email) || email.length > 200) return errorJson(422, "invalid_email", "Enter a valid email address.");
    if (!password || password.length > 200) return errorJson(401, "invalid_credentials", "Email or password is incorrect.");
    const user = isAdminEmail(email) ? await authenticateAdmin(email, password) : await authenticate(email, password);
    return json(withRole(user), 200, { "Set-Cookie": sessionCookie(user) });
  });
}
