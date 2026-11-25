/** Forgotten passwords: a one-time link by email, valid for an hour. */
import { createHash, randomBytes } from "node:crypto";
import { site } from "@/lib/site";
import { query, transaction } from "./db";
import { enqueue } from "./admin";
import { ApiError } from "./errors";
import { clearFailures, hashPassword } from "./auth";
import { isAdminEmail } from "./session";

const TTL_MINUTES = 60;
const MAX_LINKS_PER_HOUR = 3;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Email a reset link if the address has an account. The route calls this after it has answered, so
 * neither the response nor its timing says whether the account exists.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (isAdminEmail(email)) return; // administrators sign in with ADMIN_PASSWORD, not a stored password
  const token = randomBytes(32).toString("base64url");
  const userId = await transaction(async (client) => {
    // Locking the account row serialises parallel requests, so the hourly cap cannot be raced past.
    const { rows: users } = await client.query<{ id: string }>("select id from users where email = $1 for no key update", [email]);
    if (!users[0]) return null;
    const { rows } = await client.query<{ recent: number }>(
      "select count(*)::int as recent from password_resets where user_id = $1 and created_at > now() - interval '1 hour'",
      [users[0].id],
    );
    if (rows[0].recent >= MAX_LINKS_PER_HOUR) return null;
    await client.query(
      "insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + ($3 || ' minutes')::interval)",
      [hashToken(token), users[0].id, String(TTL_MINUTES)],
    );
    return users[0].id;
  });
  if (!userId) return;

  // The token goes after "#": browsers never send that part to a server, so it stays out of request logs.
  const link = `${site.url}/reset-password#token=${token}`;
  // The notifier needs the link itself, so unlike password_resets the outbox row holds it in plain text.
  await enqueue(
    "password_reset",
    `password_reset:${hashToken(token)}`,
    userId,
    "email",
    email,
    `Someone asked to reset the password of your Passtid account.\n\n` +
      `Choose a new password here (the link works once and expires in ${TTL_MINUTES} minutes):\n${link}\n\n` +
      `If it was not you, ignore this email. Your password stays the same.`,
  );
}

/**
 * Set a new password with a valid, unused link. Every other open link for the account is cancelled and
 * every signed-in session ends, so someone who got into the account does not stay in.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  const invalid = () => new ApiError(400, "invalid_reset_link", "This link is invalid or has expired. Ask for a new one.");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw invalid();
  // A cheap lookup first, so made-up tokens never reach the expensive password hash.
  const live = await query("select 1 from password_resets where token_hash = $1 and used_at is null and expires_at > now()", [
    hashToken(token),
  ]);
  if (!live.length) throw invalid();
  const passwordHash = await hashPassword(password);
  const email = await transaction(async (client) => {
    // This update is what makes the link single use: of two parallel resets, only one gets the row.
    const { rows } = await client.query<{ user_id: string }>(
      `update password_resets set used_at = now()
        where token_hash = $1 and used_at is null and expires_at > now() returning user_id`,
      [hashToken(token)],
    );
    if (!rows[0]) throw invalid();
    const userId = rows[0].user_id;
    const { rows: users } = await client.query<{ email: string }>(
      "update users set password_hash = $2, session_version = session_version + 1 where id = $1 returning email",
      [userId, passwordHash],
    );
    await client.query("update password_resets set used_at = now() where user_id = $1 and used_at is null", [userId]);
    return users[0].email;
  });
  clearFailures(email);
}
