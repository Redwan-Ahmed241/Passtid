This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backend

Everything runs in this Next.js app: the pages, the route handlers in `src/app/api/v1`, and the data layer in `src/server`.

- **Database.** Postgres via `DATABASE_URL`. The tables (users, requests, slots, bookings, payments, alert subscriptions) are created on first use.
- **Accounts.** Email and password (scrypt hashes). The session is an HMAC-signed HttpOnly cookie; `AUTH_SECRET` is required in production. Accounts are created at the last step of the booking flow, right before payment.
- **Payments.** The last booking step sells two plans through Stripe Checkout: Telegram alerts (default $5) and automatic booking (default $25). Prices are placeholders until the client confirms a price list; change them with `PLAN_NOTIFY_CENTS` and `PLAN_AUTOBOOK_CENTS`. Set `STRIPE_SECRET_KEY`, and add a webhook endpoint at `/api/v1/stripe/webhook` (events `checkout.session.completed` and `checkout.session.async_payment_succeeded`) with its signing secret in `STRIPE_WEBHOOK_SECRET`. Fulfilment is idempotent, so the return redirect and the webhook can both run. In production, payments are refused without a Stripe key; elsewhere, without one, checkout runs in demo mode and nobody is charged.
- **Local setup.** Copy `.env.example` to `.env.local`, set `DATABASE_URL` and `AUTH_SECRET`, run `npm run dev`.

### Bot API

The booking bot talks to these endpoints with `Authorization: Bearer $BOT_API_KEY`. Without `BOT_API_KEY` they answer 503.

| Endpoint | Purpose |
| --- | --- |
| `PUT /api/v1/bot/slots/{system}` | Replace the free slots of `passport` or `migration`: `{ "slots": [{ "slot": "2026-10-23T09:30", "freeOnSite": 2 }] }`. Paid watchers whose window now matches are queued for booking. |
| `GET /api/v1/bot/jobs` | Bookings to make (`bookings`, with the stored applicant request), users still waiting for a slot (`watching`) and Telegram alerts to send (`alerts`). |
| `POST /api/v1/bot/bookings/{id}` | Report progress: `{ "status": "pending" \| "booked" \| "released", "reference": "SE-...", "reason": "failed" \| "cancelled" \| "timed_out" \| "slot_gone" }`. A booking that reports nothing for 15 minutes is released. |
| `POST /api/v1/bot/alerts/link` | Link a Telegram chat to an alert: `{ "code": "<24 hex from the deep link>", "chatId": "123" }`. |

Until the bot pushes slots, the booking page has no slots to show, and paid users are placed on the watch list.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
