/**
 * PostgreSQL access. Set DATABASE_URL to any Postgres (Neon, Supabase, Vercel Postgres, a local server).
 * The schema is created on first use, so a fresh database needs no manual migration.
 */
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { ApiError } from "./errors";

const SCHEMA = `
create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists booking_requests (
  user_id text not null references users(id) on delete cascade,
  system text not null,
  request jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, system)
);
create table if not exists slots (
  system text not null,
  slot text not null,
  free_on_site int,
  primary key (system, slot)
);
create table if not exists slot_sync (
  system text primary key,
  synced_at timestamptz not null
);
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  system text not null,
  slot text not null,
  status text not null,
  reason text,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  heartbeat timestamptz not null default now()
);
create index if not exists bookings_slot_idx on bookings (system, slot);
create unique index if not exists bookings_one_active on bookings (user_id, system) where status in ('pending', 'booked');
create table if not exists payments (
  session_id text primary key,
  user_id text not null references users(id) on delete cascade,
  system text not null,
  plan text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  system text not null,
  telegram_code text not null unique,
  telegram_chat_id text,
  created_at timestamptz not null default now()
);
`;

const g = globalThis as unknown as { __pool?: Pool; __schema?: Promise<void> };

function pool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new ApiError(503, "database_unavailable", "The database is not configured.");
  return (g.__pool ??= new Pool({ connectionString: url, max: 5 }));
}

/** Create the tables once per server instance. An advisory lock keeps parallel cold starts from racing. */
function ensureSchema(): Promise<void> {
  return (g.__schema ??= (async () => {
    const client = await pool().connect();
    try {
      await client.query("select pg_advisory_lock(727001)");
      await client.query(SCHEMA);
      await client.query("select pg_advisory_unlock(727001)");
    } finally {
      client.release();
    }
  })().catch((err) => {
    g.__schema = undefined;
    throw err;
  }));
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  return (await pool().query<T>(text, params)).rows;
}

/** Run `fn` with a dedicated connection inside a transaction. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await pool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Serialise work on one key across all server instances (e.g. a payment handled by two requests at once). */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await pool().connect();
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [key]);
    try {
      return await fn();
    } finally {
      await client.query("select pg_advisory_unlock(hashtext($1))", [key]);
    }
  } finally {
    client.release();
  }
}

export const isUniqueViolation = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
