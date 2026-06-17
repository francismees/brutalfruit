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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Milan Brunch — RSVP / Check-in / Comms

A self-contained module for the 2026 Milan Brunch activation. All event copy
lives in `lib/milan-brunch/config.ts` — change dates and venue there, not in
the templates.

### Routes

| Path | Purpose |
| --- | --- |
| `/milan-brunch` | Public RSVP form (mobile-first). |
| `/milan-brunch/confirmed?token=…` | QR confirmation + add-to-calendar. |
| `/dashboard/login` | Magic-link sign in for team. |
| `/dashboard/milan-brunch` | RSVP table + CSV export. |
| `/dashboard/milan-brunch/check-in` | Door check-in (QR scanner + manual). |
| `/dashboard/milan-brunch/comms` | Markdown email composer + history. |

### API

| Method · Path | Auth | Notes |
| --- | --- | --- |
| `POST /api/rsvp` | anon | Validates with zod, normalises phone to E.164, sends confirmation email. `409 { reason }` on duplicate, `403` after deadline. |
| `POST /api/resend-confirmation` | anon (rate-limited) | Re-sends confirmation, 1/min per email. |
| `POST /api/check-in` | dashboard allowlist | Atomic update — `409` if already checked in, `404` if unknown token. |
| `POST /api/comms/send` | dashboard allowlist | Resend batches of 50, `{{first_name}}` merge. SMS channel returns `501`. |
| `GET /api/export-csv` | dashboard allowlist | Streams CSV of all RSVPs. |
| `GET /auth/callback` | — | Magic-link code exchange, then redirects to `next` param (default `/dashboard/milan-brunch`). |

### Required env

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL          # e.g. brunch@brutalfruit.co.tz — verified Resend sender
DASHBOARD_ALLOWED_EMAILS   # comma-separated allowlist for /dashboard
NEXT_PUBLIC_SITE_URL       # absolute URL used in emails + ICS
```

### Database

Apply the migration `supabase/migrations/20260617000000_milan_brunch.sql`.
Creates `milan_brunch_rsvps` and `milan_brunch_messages` with RLS — anon may
insert RSVPs only; everything else is `authenticated`-gated. The dashboard API
routes use the service-role client for cross-cutting reads/writes after their
own allowlist check.

### Smoke test

1. `/milan-brunch` on a 375px viewport → submit form → confirmation page with QR.
2. Inbox receives branded email with QR (open in image-enabled mail client).
3. Re-submit same email → inline "already on the list" + resend button.
4. `/dashboard/login` → magic link → land on RSVP table → CSV downloads.
5. `/dashboard/milan-brunch/check-in` on mobile → scan QR from email → success.
6. `/dashboard/milan-brunch/comms` → send to "Checked in" → email arrives, row in history table.
7. After `RSVP_DEADLINE_ISO`, public form swaps to closed copy and `POST /api/rsvp` returns 403.
