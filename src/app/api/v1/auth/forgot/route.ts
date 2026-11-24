import { EMAIL_RE } from "@/lib/applicants";
import { errorJson, handle, json, rateLimit, readJson } from "@/server/http";
import { requestPasswordReset } from "@/server/password-reset";

/** Ask for a reset link. Always answers 200 for a well-formed email, whether or not an account exists. */
export async function POST(request: Request) {
  return handle(async () => {
    rateLimit(request, "forgot", 5, 60 * 60 * 1000);
    const body = (await readJson(request)) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email) || email.length > 200) return errorJson(422, "invalid_email", "Enter a valid email address.");
    try {
      await requestPasswordReset(email);
    } catch (err) {
      console.error("Password reset request failed", err); // the caller must not learn anything from a failure
    }
    return json({ ok: true });
  });
}
