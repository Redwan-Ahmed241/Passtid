import { EMAIL_RE } from "@/lib/applicants";
import { authenticate } from "@/server/auth";
import { errorJson, handle, json } from "@/server/http";
import { sessionCookie } from "@/server/session";

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_RE.test(email) || email.length > 200) return errorJson(422, "invalid_email", "Enter a valid email address.");
    if (!password || password.length > 200) return errorJson(401, "invalid_credentials", "Email or password is incorrect.");
    const user = await authenticate(email, password);
    return json(user, 200, { "Set-Cookie": sessionCookie(user) });
  });
}
