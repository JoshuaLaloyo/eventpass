# EventPass — MVP (Phase 1)

Digital ticketing for events in Uganda. Create event → sell ticket → QR → scan → attendance.

Built against the Phase 1 planning docs (SRS, ERD, API spec, test plan). Stack: Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · Auth.js · Flutterwave (or built-in mock payments) · pdf-lib · html5-qrcode.

---

## 1. Setup (10–15 minutes)

**Requirements:** Node 18+, a free [Neon](https://neon.tech) PostgreSQL database (or any Postgres).

```bash
npm install
cp .env.example .env
```

Edit `.env`:

1. `DATABASE_URL` — from Neon: create a project → copy the connection string.
2. `AUTH_SECRET` — run `openssl rand -base64 32` (or type any long random string).
3. Leave `PAYMENT_PROVIDER=mock` for now — you can test the entire flow with no Flutterwave account.

Then:

```bash
npm run db:push     # create tables
npm run db:seed     # create the admin + test accounts
npm run dev         # http://localhost:3000
```

### Optional: run Postgres locally instead of Neon (works offline)

By default `DATABASE_URL` points at Neon (cloud), so local dev needs internet even though the app itself runs on `localhost`. To remove that dependency, run Postgres in Docker and keep Neon only for staging/production:

```bash
docker compose up -d     # starts a postgres:16-alpine container (see docker-compose.yml)
```

Create `.env.local` (already in `.gitignore`, and Next.js loads it automatically, overriding `.env`):

```
DATABASE_URL="postgresql://eventpass:eventpass@localhost:5432/eventpass?schema=public"
```

Then push the schema and seed the local DB. The Prisma CLI only reads `.env` (not `.env.local`), so pass the URL inline for these two commands:

```bash
DATABASE_URL="postgresql://eventpass:eventpass@localhost:5432/eventpass?schema=public" npx prisma db push
DATABASE_URL="postgresql://eventpass:eventpass@localhost:5432/eventpass?schema=public" npx tsx prisma/seed.ts
```

`npm run dev` will then read `.env.local` and use the local DB. The container doesn't survive a machine reboot on its own — run `docker compose up -d` again before your next `npm run dev`. To go back to Neon, delete or rename `.env.local`.

### Seeded accounts (`SEED_TEST_ACCOUNTS=true`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@eventpass.test | admin12345 |
| Organizer | organizer@test.com | organizer1 |
| Customer 1 | customer1@test.com | customer11 |
| Customer 2 | customer2@test.com | customer22 |
| Gate staff | gate@test.com | gatestaff1 |

(Registration also works, so you can create accounts from scratch — the seeds just save time. The admin can ONLY be created by seeding, per the SRS.)

---

## 2. Testing the cwhole loop in mock mode

Mock mode replaces the Mobile Money prompt with a sandbox screen with two buttons — everything else (webhook-equivalent fulfillment, commission calc, ticket issuance, email, QR, scanning) is the real code path.

1. **Organizer** (`organizer@test.com`) → *My events* → *New event* → save draft → add ticket types (e.g. Ordinary 20,000 / VIP 50,000, small quantities like 3 so you can test sold-out) → *Publish*.
2. **Customer** (`customer1@test.com`) → home page → open the event → *Buy* → accept the refund policy → *Pay* → **Simulate successful payment**.
3. You land on the result page → *My tickets* shows the QR + PDF download. If SMTP is configured, the ticket PDF is also emailed.
4. **Gate staff** (`gate@test.com`, on your phone if possible) → *Scanner* → select the event → *Start scanning* → scan the QR from the customer's screen. First scan: green **ADMIT** with the attendee name. Second scan: red **REJECT — already used**.
5. **Admin** (`admin@eventpass.test`) → *Dashboard* → totals + 5% commission per event.

Phone camera note: the camera API needs HTTPS or `localhost`. To scan from a phone against your laptop, either deploy first (Vercel) or use a tunnel like `npx ngrok http 3000`.

### Mapping to the test plan

- **A1–A5** (auth/roles): register pages + try opening `/organizer`, `/scan`, `/admin` with wrong roles — you get redirected; API calls return 401/403.
- **E1–E4** (events): draft is invisible on home; publish without ticket types is blocked with a clear message.
- **P1–P6** (purchase): buy 2 → exactly 2 tickets; *Simulate failure* → FAILED order, no tickets; buy until sold out → the last over-quantity attempt is rejected; `quantitySold` never exceeds `quantity` (inventory is enforced with an atomic conditional UPDATE at fulfillment time).
- **S1–S6** (scanning): valid → ADMIT; rescan → REJECT used; a ticket for another event → REJECT wrong event; random QR text → REJECT not found; every attempt (including rejects) appears in the `Scan` table.
  - **S5** (unpaid ticket): tickets are only created after successful payment, so to test this one flip a paid order back: in Neon's SQL editor run `UPDATE "Order" SET "paymentStatus"='PENDING' WHERE id='<order id>';` then scan its ticket → REJECT unpaid.
- **D1–D3** (data): check the `Payment` row — `commissionAmount` + `organizerPayoutAmount` always sum to `amount`.

---

## 3. Going real: Flutterwave

1. Create a Flutterwave account → get **test keys**.
2. `.env`: `PAYMENT_PROVIDER=flutterwave`, `FLW_SECRET_KEY=FLWSECK_TEST-...`, `FLW_SECRET_HASH=<any long random string>`.
3. In the Flutterwave dashboard set the webhook URL to `https://<your-domain>/api/payments/webhook` and paste the same secret hash.
4. Webhooks can't reach `localhost` — deploy (Vercel) or tunnel with ngrok when testing. There is also a redirect-verification fallback (`/api/payments/verify`) so payments confirm even if a webhook is delayed, but the webhook is the source of truth — don't skip it in production.

⚠️ **Before building Phase 2 payouts:** confirm your Flutterwave account supports **split payments / subaccounts for Ugandan merchants** (the plan flags this). If not, Pesapal is the fallback — the processor code is isolated in `src/lib/flutterwave.ts` + `src/lib/fulfill.ts` to keep that swap contained.

## 4. Optional services

- **Email tickets:** set `SMTP_*` vars (Gmail + App Password works). Without SMTP the app logs "email skipped" and everything else still works — tickets are always available in *My tickets*.
- **Google login:** set `GOOGLE_CLIENT_ID/SECRET` (redirect URI `{APP_URL}/api/auth/callback/google`). Google accounts come in as CUSTOMER.
- **Poster uploads:** set `CLOUDINARY_*` vars. Without them, paste a poster image URL instead (the form supports both).

## 5. Deploying to Vercel

1. Push to GitHub → import in Vercel.
2. Add all `.env` values in Vercel project settings (set `APP_URL` and `AUTH_URL` to your Vercel URL).
3. Build command is already `prisma generate && next build`. Run `npm run db:push && npm run db:seed` once from your machine (pointing at the production `DATABASE_URL`).

---

## 6. Where things are

```
prisma/schema.prisma        all 7 tables + enums (matches the ERD doc)
src/lib/fulfill.ts          payment success → tickets (the money-critical path)
src/lib/flutterwave.ts      processor calls (create link, verify transaction)
src/app/api/scan/route.ts   gate verification logic (QR = ticket UUID only)
src/app/api/...             everything else per the API spec doc
docker-compose.yml          optional local Postgres, see "Optional: run Postgres locally" above
```

## 7. Deviations from the docs (flagging, per our workflow)

1. **`Order` gained `ticketTypeId` + `quantity`.** The webhook needs to know what to fulfill after payment; the ERD didn't carry this. MVP = one ticket type per order (buy VIP and Ordinary as two orders). Will update the ERD doc in the Phase 2 revision.
2. **Mock payment mode added** (`PAYMENT_PROVIDER=mock`) — not in the docs, exists so the full test plan is runnable without a processor account. Real mode is unchanged and uses the same fulfillment code.
3. **Ticket PDFs are generated on request**, not stored in S3 — no storage bill, nothing to configure, same result. Revisit if PDFs get heavy.
4. **shadcn/ui skipped** in favor of small custom Tailwind classes — fewer moving parts; easy to add later if you want the component library.
5. **Test S5** needs one manual DB edit (explained above) because the system itself never creates tickets on unpaid orders — which is the behavior the test is protecting.
