/**
 * PostgreSQL access. Set DATABASE_URL to any Postgres (Neon, Supabase, Vercel Postgres, a local server).
 * The schema is created on first use, so a fresh database needs no manual migration.
 */
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { ApiError } from "./errors";

const SCHEMA = `
create table if not exists users (
  id text primary key,
  name text not null default '',
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);
alter table users alter column name set default '';
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
alter table alert_subscriptions add column if not exists stripe_subscription_id text;
alter table alert_subscriptions add column if not exists active boolean not null default true;
create index if not exists alert_subscriptions_stripe_subscription on alert_subscriptions (stripe_subscription_id);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,  -- null = admin
  kind text not null,          -- slot_alert | booked | needs_attention
  dedupe_key text not null unique,
  channel text not null,       -- telegram (later: email, sms)
  address text not null,       -- chat id / email / phone for that channel
  message text not null,
  status text not null default 'pending',  -- pending | sent | failed
  attempts int not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notifications_due on notifications (next_attempt_at) where status = 'pending';
alter table users add column if not exists telegram_code text unique, add column if not exists telegram_chat_id text;
alter table users add column if not exists phone text;
-- Phones are not unique: a unique index let one account block another's number and revealed which numbers exist.
drop index if exists users_phone_key;
create index if not exists users_phone_idx on users (phone) where phone is not null;
-- Slots already announced to each alert subscription, so a slot is never announced twice.
create table if not exists alert_seen (
  subscription_id uuid not null references alert_subscriptions(id) on delete cascade,
  slot text not null,
  primary key (subscription_id, slot)
);
-- Raised when a password is reset: session cookies carrying an older number stop working.
alter table users add column if not exists session_version int not null default 0;
-- One-time password reset links. Only the hash of the token is kept here (the outbox row for the email has the link).
create table if not exists password_resets (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user on password_resets (user_id, created_at);
create table if not exists tickets (
  token text primary key,      -- e.g. PT-4F2K9Q, quoted by the user to support
  user_id text not null references users(id) on delete cascade,
  email text not null,
  category text not null,      -- booking | payment | account | other
  system text,
  message text not null,
  status text not null default 'open',  -- open | resolved
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_user_idx on tickets (user_id, status);
create table if not exists site_texts (
  lang text not null,          -- en | sv
  key text not null,           -- t.<key>, c.<path> or l.<path>
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (lang, key)
);
`;

const g = globalThis as unknown as { __pool?: Pool; __schema?: Promise<void> };

function pool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new ApiError(503, "database_unavailable", "The database is not configured.");
  if (!g.__pool) {
    // Without a time limit a request waits for ever when every connection is busy.
    g.__pool = new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 10_000 });
    // The server or its pooler may drop an idle connection; unhandled, that error ends the process.
    g.__pool.on("error", (err) => console.error("Idle database connection failed", err.message));
  }
  return g.__pool;
}

async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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

/**
 * Create the tables once per server instance. An advisory lock keeps parallel cold starts from racing.
 * It is a transaction lock because a pooled connection string (Neon's "-pooler") may send each statement
 * outside a transaction to a different server session, which would leave a session lock held for good.
 */
function ensureSchema(): Promise<void> {
  return (g.__schema ??= inTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(727001)");
    await client.query(SCHEMA);
  }).catch((err) => {
    g.__schema = undefined;
    throw err;
  }));
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  return (await pool().query<T>(text, params)).rows;
}

/**
 * Run `fn` with a dedicated connection inside a transaction. Inside `fn`, query only through that client:
 * asking the pool for a second connection while holding one can leave every request waiting on the others.
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  return inTransaction(fn);
}

export const isUniqueViolation = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
