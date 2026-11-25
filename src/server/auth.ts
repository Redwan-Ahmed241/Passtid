/** Real accounts: scrypt-hashed passwords in Postgres. */
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { User } from "@/lib/types";
import { isUniqueViolation, query } from "./db";
import { ApiError } from "./errors";
import type { SessionUser } from "./session";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A real hash to compare against when the email is unknown, so timing does not reveal which emails exist. */
let dummy: Promise<string> | null = null;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  session_version: number;
}

const toUser = (r: UserRow): SessionUser => ({ id: r.id, email: r.email, sessionVersion: r.session_version });

export async function registerUser(email: string, password: string): Promise<User> {
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    await query("insert into users (id, email, password_hash) values ($1, $2, $3)", [id, email, passwordHash]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "email_taken", "An account with this email already exists. Sign in instead.");
    }
    throw err;
  }
  return { id, email };
}

/** At most this many failed sign-ins per email in the window, per server instance. */
const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

function assertNotLocked(email: string): void {
  const f = failures.get(email);
  if (!f || f.count < MAX_FAILURES) return;
  const retryAfter = Math.ceil((f.first + WINDOW_MS - Date.now()) / 1000);
  if (retryAfter > 0) {
    throw new ApiError(429, "too_many_attempts", "Too many failed sign-ins. Try again in a few minutes.", retryAfter);
  }
}

/** Count a failed sign-in and return the error to throw for it. */
function failedSignIn(email: string): ApiError {
  const f = failures.get(email);
  const now = Date.now();
  const cur = f && now - f.first < WINDOW_MS ? f : { count: 0, first: now };
  failures.set(email, { count: cur.count + 1, first: cur.first });
  return new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
}

/** A completed password reset lifts the lockout (on this server instance). */
export function clearFailures(email: string): void {
  failures.delete(email);
}

const findByEmail = (email: string) =>
  query<UserRow>("select id, email, password_hash, session_version from users where email = $1", [email]);

export async function authenticate(email: string, password: string): Promise<SessionUser> {
  assertNotLocked(email);
  const [row] = await findByEmail(email);
  const hash = row?.password_hash ?? (await (dummy ??= hashPassword("passtid-dummy-password")));
  const ok = await verifyPassword(password, hash);
  if (!row || !ok) throw failedSignIn(email);
  clearFailures(email);
  return toUser(row);
}

/** Administrator accounts sign in with ADMIN_PASSWORD (12+ characters), not the password stored on the account. */
export function adminPasswordOk(given: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Sign an administrator in: the email must belong to an existing account and the password must be ADMIN_PASSWORD. */
export async function authenticateAdmin(email: string, password: string): Promise<SessionUser> {
  assertNotLocked(email);
  const [row] = await findByEmail(email);
  if (!row || !adminPasswordOk(password)) throw failedSignIn(email);
  clearFailures(email);
  return toUser(row);
}

/** False once the account is gone or its password has been reset since the session was issued. */
export async function isSessionCurrent(id: string, version: number): Promise<boolean> {
  return (await query("select 1 from users where id = $1 and session_version = $2", [id, version])).length > 0;
}
