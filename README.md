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

### Booking bots

The Python bots (separate `sweden` repo) share this app's Postgres database: they write free slots and booking results to the tables directly. There is no HTTP bot API.

## Plans

| Plan | What you get | Price |
|---|---|---|
| **Alerts** | A Telegram message the moment a slot matches your dates. You book it yourself. | £4 a month, cancel any time |
| **Automatic booking** | Passtid books the earliest slot that fits your dates and tells you when it's done. | £30, paid once |

Both plans cover 1–10 people and run around the clock.

## Admin panel and support tickets

- **Admin panel.** `/admin` is not linked from anywhere, and anyone who is not an administrator gets the normal 404 page there. An administrator signs in through the ordinary login and opens `/admin` directly. With the bundled mock API, administrators are the emails in `ADMIN_EMAILS`; the real backend keeps the role in its database and returns `"admin": true` from `/auth/me`.
- **What it does.** Answer and resolve support tickets, see every customer with their saved requests, bookings and alerts, change a customer's request or a booking's status on their behalf, and change any text on the site in English or Swedish (interface strings, page content, privacy policy and terms).
- **Tickets.** A signed-in user can report a problem from the booking page. They get a token such as `PT-4F2K9Q`, and the ticket appears in the admin panel. With `TELEGRAM_BOT_TOKEN` and `ADMIN_TELEGRAM_CHAT_ID` set, the administrator also gets a Telegram message.
- **Storage.** In the mock API all of this is kept in memory, so it is lost on a redeploy or cold start. The real backend must implement the same endpoints (`/tickets`, `/texts`, `/admin/*`) with a database.

## Languages

The site is available in English and Swedish.

## Disclaimer

Passtid is an independent booking assistant. It is not affiliated with, endorsed by or operated by the Embassy of Sweden or the Swedish Migration Agency.

---

Built by [FazeSoft](https://www.fazesoft.com/).
