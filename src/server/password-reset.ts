/** Forgotten passwords: a one-time link by email, valid for an hour. */
import { createHash, randomBytes } from "node:crypto";
import { site } from "@/lib/site";
import { query, transaction } from "./db";
import { enqueue } from "./admin";
import { ApiError } from "./errors";
import { hashPassword } from "./auth";
import { isAdminEmail } from "./session";

const TTL_MINUTES = 60;
const MAX_LINKS_PER_HOUR = 3;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Email a reset link if the address has an account. It never says whether it does: the caller always
 * gets the same answer, so this cannot be used to find out who is registered.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (isAdminEmail(email)) return; // administrators sign in with ADMIN_PASSWORD, not a stored password
  const [user] = await query<{ id: string }>("select id from users where email = $1", [email]);
  if (!user) return;
  const [{ recent }] = await query<{ recent: number }>(
    "select count(*)::int as recent from password_resets where user_id = $1 and created_at > now() - interval '1 hour'",
    [user.id],
  );
  if (recent >= MAX_LINKS_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  await query(
    "insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' minutes')::interval)",
    [hashToken(token), user.id, String(TTL_MINUTES)],
  );
  const link = `${site.url}/reset-password?token=${token}`;
  await enqueue(
    "password_reset",
    `password_reset:${hashToken(token)}`,
    user.id,
    "email",
    email,
    `Someone asked to reset the password of your Passtid account.\n\n` +
      `Choose a new password here (the link works once and expires in ${TTL_MINUTES} minutes):\n${link}\n\n` +
      `If it was not you, ignore this email. Your password stays the same.`,
  );
}

/** Set a new password with a valid, unused link. Every other open link for the account is cancelled. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const invalid = () => new ApiError(400, "invalid_reset_link", "This link is invalid or has expired. Ask for a new one.");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw invalid();
  const passwordHash = await hashPassword(password);
  await transaction(async (client) => {
    const { rows } = await client.query<{ user_id: string }>(
      `update password_resets set used_at = now()
        where token_hash = $1 and used_at is null and expires_at > now() returning user_id`,
      [hashToken(token)],
    );
    if (!rows[0]) throw invalid();
    const userId = rows[0].user_id;
    await client.query("update users set password_hash = $2 where id = $1", [userId, passwordHash]);
    await client.query("update password_resets set used_at = now() where user_id = $1 and used_at is null", [userId]);
  });
}
