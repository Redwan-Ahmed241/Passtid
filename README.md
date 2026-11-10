# Passtid

**Swedish embassy appointments in London, without refreshing the calendar all day.**

[www.passtid.nu](https://www.passtid.nu)

Tell Passtid the days you can attend. It watches the Embassy of Sweden's booking calendar in London around the clock, then alerts you or books the first slot that fits.

## What it covers

- Passports
- National ID cards
- Coordination numbers (samordningsnummer)

Passtid looks up to 12 weeks ahead for passports and ID cards, and 8 weeks ahead for coordination numbers. All times are the embassy's local time in London, wherever you are.

## How it works

1. **Choose your dates.** Pick the service, a date range and the time of day you can attend. You can also switch on "As soon as possible" to take the first slot that appears.
2. **Add your details.** For each person, enter a first and last name, plus a personal (security) number for passports and ID cards or a phone number for coordination numbers. One email covers the whole booking. You can add up to 10 people.
3. **We do the waiting.** Passtid checks every slot and acts on the first one inside your dates. If nothing fits, nothing is booked and it keeps looking.

You only create an account at the end, right before you pay.

## Backend

Everything runs in this Next.js app: the pages, the route handlers in `src/app/api/v1`, and the data layer in `src/server`.

- **Database.** Postgres via `DATABASE_URL`. The tables (users, requests, slots, bookings, payments, alert subscriptions) are created on first use.
- **Accounts.** Email and password (scrypt hashes). The session is an HMAC-signed HttpOnly cookie; `AUTH_SECRET` is required in production. Accounts are created at the last step of the booking flow, right before payment.
- **Payments.** The last booking step sells two plans through Stripe Checkout: Telegram alerts (default £4 a month, a Stripe subscription) and automatic booking (default £30, paid once). Up to 10 people can be added to one booking. Prices are in GBP; change them (in pence) with `PLAN_NOTIFY_CENTS` and `PLAN_AUTOBOOK_CENTS`. Set `STRIPE_SECRET_KEY`, and add a webhook endpoint at `/api/v1/stripe/webhook` (events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `customer.subscription.deleted`, which switches the alerts off when a customer cancels) with its signing secret in `STRIPE_WEBHOOK_SECRET`. Fulfilment is idempotent, so the return redirect and the webhook can both run. In production, payments are refused without a Stripe key; elsewhere, without one, checkout runs in demo mode and nobody is charged.
- **Local setup.** Copy `.env.example` to `.env.local`, set `DATABASE_URL` and `AUTH_SECRET`, run `npm run dev`.

### Bot API

The booking bot talks to these endpoints with `Authorization: Bearer $BOT_API_KEY`. Without `BOT_API_KEY` they answer 503.

| Endpoint | Purpose |
| --- | --- |
| `PUT /api/v1/bot/slots/{system}` | Replace the free slots of `passport` or `coordination_number`: `{ "slots": [{ "slot": "2026-10-23T09:30", "freeOnSite": 2 }] }`. Paid watchers whose window now matches are queued for booking. |
| `GET /api/v1/bot/jobs` | Bookings to make (`bookings`, with the stored applicant request), users still waiting for a slot (`watching`) and Telegram alerts to send (`alerts`). |
| `POST /api/v1/bot/bookings/{id}` | Report progress: `{ "status": "pending" \| "booked" \| "released", "reference": "SE-...", "reason": "failed" \| "cancelled" \| "timed_out" \| "slot_gone" }`. A booking that reports nothing for 15 minutes is released. |
| `POST /api/v1/bot/alerts/link` | Link a Telegram chat to an alert: `{ "code": "<24 hex from the deep link>", "chatId": "123" }`. |

Until the bot pushes slots, the booking page has no slots to show, and paid users are placed on the watch list.

## Plans

| Plan | What you get | Price |
|---|---|---|
| **Alerts** | A Telegram message the moment a slot matches your dates. You book it yourself. | £4 a month, cancel any time |
| **Automatic booking** | Passtid books the earliest slot that fits your dates and tells you when it's done. | £30, paid once |

Both plans cover 1–10 people and run around the clock.

## Languages

The site is available in English and Swedish.

## Disclaimer

Passtid is an independent booking assistant. It is not affiliated with, endorsed by or operated by the Embassy of Sweden or the Swedish Migration Agency.

---

Built by [FazeSoft](https://www.fazesoft.com/).
