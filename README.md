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

## Payments

The last step of the console sells two plans through Stripe Checkout: Telegram alerts (default $5) and automatic booking (default $25). Prices are placeholders until the client confirms a price list; change them with `PLAN_NOTIFY_CENTS` and `PLAN_AUTOBOOK_CENTS`. See `.env.example` for `STRIPE_SECRET_KEY` and `TELEGRAM_BOT_USERNAME`. Without a Stripe key checkout runs in demo mode and nobody is charged. When `NEXT_PUBLIC_API_BASE_URL` points at the real backend, that backend needs to implement `GET /plans`, `POST /checkout` and `POST /checkout/confirm` (see `src/lib/api.ts`).

> **Backend.** This branch (main) runs on the bundled in-memory demo API in src/server/mock-backend.ts, so it needs no database and cannot fail for lack of one.
> The real backend (Postgres via DATABASE_URL, email and password accounts, the Stripe webhook and the bot API) lives on the **ackend** branch. See docs/BACKEND_BRANCH.md for how it is kept apart and merged back.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
