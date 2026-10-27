# The backend branch

`main` is what Vercel serves. It must always deploy, so it runs on the bundled
in-memory demo API (`src/server/mock-backend.ts`) and needs no database and no
secrets. The real backend is built on the **`backend`** branch and joins `main`
when it is ready.

| Branch | Backend | Needs to run |
| --- | --- | --- |
| `main` | in-memory demo: any password signs in, data is lost on restart | nothing |
| `backend` | Postgres, email and password accounts, Stripe webhook, bot API | `DATABASE_URL`, `AUTH_SECRET`, Stripe and bot keys |

## What only exists on `backend`

- `src/server/db.ts`, `store.ts`, `auth.ts`, `errors.ts`: the Postgres data layer. Tables are created on first use.
- `src/app/api/v1/bot/*`: the bot API (slots in, jobs and alerts out), guarded by `BOT_API_KEY`.
- `src/app/api/v1/stripe/webhook`: Stripe fulfilment (`STRIPE_WEBHOOK_SECRET`).
- Real password checks, and payments refused in production without a Stripe key.
- `.env.example` and `README.md` describe those settings.

## Working on it

```bash
git fetch
git switch backend
cp .env.example .env.local      # fill in DATABASE_URL and AUTH_SECRET
npm ci && npm run dev
```

To try it on Vercel, set the same variables for the **Preview** environment (Project Settings, Environment Variables). Every push to `backend` gets its own preview URL; production is not touched.

## Keeping up with `main`

Front-end work keeps landing on `main`. Bring it in whenever you like:

```bash
git switch backend
git merge main
```

This is safe. `backend` already contains the commit that removed the backend from `main`, together with its undo, so nothing is deleted by the merge.

## Putting it live

1. Postgres is reachable from Vercel (TLS on, strong password, ideally PgBouncer in front).
2. These are set for **Production**: `DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BOT_API_KEY`, `NEXT_PUBLIC_SITE_URL`.
3. Register, sign in, save details, book and pay all work on a **Preview** deployment of `backend`.
4. Then:

```bash
git switch main
git pull
git merge backend
git push
```

The merge is clean. Vercel deploys it straight away, so do not skip step 2. If something goes wrong, undo it with `git revert -m 1 <merge commit>` and push.
