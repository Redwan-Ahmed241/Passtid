import { errorJson, handle, json, rateLimit, readJson } from "@/server/http";
import { resetPassword } from "@/server/password-reset";

/** Set a new password with the token from the email. */
export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "reset", 10, 60 * 60 * 1000);
    const body = (await readJson(request)) as { token?: unknown; password?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8 || password.length > 200) {
      return errorJson(422, "weak_password", "Use a password of at least 8 characters.");
    }
    await resetPassword(token, password);
    return json({ ok: true });
  });
}
