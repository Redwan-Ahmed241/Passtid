/** Real accounts: scrypt-hashed passwords in Postgres. */
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { User } from "@/lib/types";
import { isUniqueViolation, query } from "./db";
import { ApiError } from "./errors";

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
  name: string;
  email: string;
  password_hash: string;
}

const toUser = (r: UserRow): User => ({ id: r.id, name: r.name, email: r.email });

export async function registerUser(name: string, email: string, password: string): Promise<User> {
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    await query("insert into users (id, name, email, password_hash) values ($1, $2, $3, $4)", [id, name, email, passwordHash]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "email_taken", "An account with this email already exists. Sign in instead.");
    }
    throw err;
  }
  return { id, name, email };
}

/** At most this many failed sign-ins per email in the window, per server instance. */
const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

export async function authenticate(email: string, password: string): Promise<User> {
  const f = failures.get(email);
  if (f && Date.now() - f.first < WINDOW_MS && f.count >= MAX_FAILURES) {
    throw new ApiError(429, "too_many_attempts", "Too many failed sign-ins. Try again in a few minutes.");
  }
  const [row] = await query<UserRow>("select id, name, email, password_hash from users where email = $1", [email]);
  const hash = row?.password_hash ?? (await (dummy ??= hashPassword("passtid-dummy-password")));
  const ok = await verifyPassword(password, hash);
  if (!row || !ok) {
    const now = Date.now();
    const cur = f && now - f.first < WINDOW_MS ? f : { count: 0, first: now };
    failures.set(email, { count: cur.count + 1, first: cur.first });
    throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
  }
  failures.delete(email);
  return toUser(row);
}

export async function userExists(id: string): Promise<boolean> {
  return (await query("select 1 from users where id = $1", [id])).length > 0;
}
