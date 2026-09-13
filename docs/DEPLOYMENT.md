# Deployment — Hostinger Node.js Web Apps

This is the exact sequence for putting Globify PTE Premium live on Hostinger
Business hosting. Follow it in order; each step assumes the previous one
succeeded.

Repository: `https://github.com/bitsolmarketing/globify_consultants_pte`

---

## Before you start

Three things must be ready. None of them can be done from the codebase.

### 1. Rotate the database password

The development password was shared in plain text and must be treated as
compromised.

1. Neon console → your project → **Roles** → `neondb_owner` → **Reset password**
2. Copy the new connection string. Use the **pooled** endpoint — the host
   contains `-pooler`. A managed runtime opens and closes connections
   constantly and will exhaust a direct endpoint.
3. Keep it only in Hostinger's environment variables. Never in the repository.

### 2. Create the object storage bucket

Speaking recordings and payment receipts need durable storage. A managed host
replaces the filesystem on every deploy, so local disk would silently discard
every recording a student makes.

**Cloudflare R2** is the recommended choice — S3-compatible, no egress fees.

1. Cloudflare dashboard → **R2** → **Create bucket** → name it `globify-pte`
2. **Settings → Public access: keep it disabled.** The application serves every
   object through a short-lived signed URL. A public bucket would make one
   student's recordings readable by anyone who guesses a key.
3. **Manage R2 API Tokens** → create a token with *Object Read & Write*
4. Note the Access Key ID, Secret Access Key, and the endpoint
   `https://<account-id>.r2.cloudflarestorage.com`

AWS S3 and Backblaze B2 work identically — set `STORAGE_ENDPOINT` accordingly
(blank for AWS).

### 3. Point the domain at Hostinger

In your registrar's DNS, create the record Hostinger asks for when you attach
the domain (step 4 below). Propagation is usually minutes but can take hours.

---

## Step 1 — Create the app in hPanel

1. hPanel → **Websites** → **Add Website** → **Deploy Web App**
2. Choose **GitHub** and authorise Hostinger to read your repositories
3. Select `bitsolmarketing/globify_consultants_pte`, branch `main`
4. Hostinger detects Next.js automatically
5. Set the Node version to **22.x** (the project requires ≥ 20.9)

Every push to `main` now triggers a rebuild.

---

## Step 2 — Set the environment variables

hPanel → your app → **Environment Variables**. Copy from
[`.env.production.example`](../.env.production.example), which lists every
variable with an explanation.

The minimum set for a working deployment:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://pte.globifytech.com` — no trailing slash, https |
| `NODE_ENV` | `production` |
| `DEMO_MODE` | `false` |
| `DATABASE_URL` | the **rotated**, pooled Neon string |
| `AUTH_SECRET` | the generated value in `.env.production.example` |
| `PAYMENT_WEBHOOK_SECRET` | the generated value, or Stripe's signing secret |
| `STORAGE_DRIVER` | `s3` |
| `STORAGE_BUCKET` / `STORAGE_ENDPOINT` / `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | from step 2 above |
| `EMAIL_PROVIDER` / `EMAIL_API_KEY` / `EMAIL_FROM` | `resend` + your key |
| `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` | your provider key |
| `AI_MONTHLY_BUDGET_USD` | a real ceiling, e.g. `50` |
| Bank / Easypaisa / JazzCash fields | your actual account details |

> **`DEMO_MODE` must be `false`.** The application refuses to start with demo
> mode on in production — see `assertRuntimeEnv` in `src/lib/env.ts` — because
> demo mode simulates payments and would activate subscriptions nobody paid for.

### What deliberately is *not* configurable from the admin panel

API keys and secrets live only in environment variables. A Super Admin with a
compromised session cannot read them through the application. The admin
Settings page shows whether each one is configured, never its value.

---

## Step 3 — First deploy

Hostinger runs `npm install`, then `npm run build`, then `npm start`.

```
build:  prisma generate && next build
start:  prisma migrate deploy && next start
```

**The build never touches the database.** Build environments frequently have no
`DATABASE_URL` and no network route to Postgres, and a build that needs one
fails before Next.js compiles anything. This build is verified to complete with
`DATABASE_URL` and `AUTH_SECRET` entirely unset.

**Migrations run at start instead**, in the runtime environment where the
variables are guaranteed to exist. `prisma migrate deploy` is idempotent, takes
a Postgres advisory lock so concurrent instances are safe, and never resets
data.

If you would rather run migrations by hand, use `npm run start:no-migrate` as
the start command and run `npm run db:deploy` from the terminal yourself.

**Watch the logs.** Failures are almost always one of:

| Symptom | Where | Cause |
|---|---|---|
| `Environment variable not found: DATABASE_URL` | start | The variable is not set on the app |
| `P1001 Can't reach database server` | start | Wrong host, or you used the non-pooled endpoint |
| `DEMO_MODE must not be enabled in production` | start | `DEMO_MODE` is still `true` |
| `AUTH_SECRET is required in production` | start | The variable is missing |
| Type or lint errors | build | Should not happen — the build passes from a clean clone; re-pull |

---

## Step 4 — Attach your domain

1. hPanel → your app → **Domains** → add your domain
2. Add the DNS record Hostinger displays, at your registrar
3. Wait for the SSL certificate to issue — the padlock must appear before you
   continue, because cookies are `secure` in production and sign-in will fail
   over plain http
4. Confirm `NEXT_PUBLIC_APP_URL` matches the final domain **exactly**, including
   `https://` and no trailing slash. It drives canonical URLs, the sitemap,
   checkout return URLs and the Google OAuth redirect.

---

## Step 5 — Seed the first admin

The schema was applied when the app started. It needs one administrator.

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (a strong one) in the
environment, then run the seed once from Hostinger's terminal:

```bash
npm run db:seed
```

This creates the question types, plans, question bank, mock tests and your
admin account. It is idempotent — every write is an upsert on a natural key —
so re-running it will not duplicate anything.

**Then remove `SEED_ADMIN_PASSWORD` from the environment** so it is not sitting
in your host's configuration, and change the password from the profile page.

> The seed also creates ten demo students with practice history. Delete them
> before launch if you do not want them in your analytics:
> hPanel terminal → `npx prisma studio`, or remove the `STUDENTS` block from
> `prisma/seed.ts` before seeding a production database.

---

## Step 6 — Verify storage

```bash
npm run verify:storage
```

This writes an object, reads it back, checks the bytes match, produces a signed
URL and fetches it, confirms the bucket is **not** publicly readable, then
deletes the object. It exits non-zero on any failure.

Do not skip this. If storage is misconfigured, students record answers that are
silently lost, and uploaded payment receipts vanish before you can review them.

---

## Step 7 — Configure the payment webhook

Only needed if you use a card gateway. Manual bank transfer needs no webhook —
it is confirmed by an administrator in the dashboard.

For Stripe:

1. Stripe dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://pte.globifytech.com/api/webhooks/payments/stripe`
3. Events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `charge.refunded`
4. Copy the **signing secret** into `PAYMENT_WEBHOOK_SECRET`
5. Set `PAYMENT_PROVIDER=stripe` and `PAYMENT_API_KEY` to your secret key

Send a test event from the Stripe dashboard and check
**Admin → Audit log** for a `subscription.activated` entry.

The endpoint verifies the signature before trusting anything in the body,
rejects events older than five minutes, and deduplicates on Stripe's event id.
A replayed delivery cannot activate a subscription twice.

---

## Step 8 — Google sign-in (optional)

1. Google Cloud Console → **APIs & Services → Credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorised redirect URI, exactly:
   `https://pte.globifytech.com/api/auth/google/callback`
4. Put the client ID and secret in the environment

Leave both blank and the Google button does not render at all.

---

## Step 9 — Post-deploy checks

Work through [`docs/GO-LIVE.md`](./GO-LIVE.md). At minimum, before you tell
anyone the site exists:

- [ ] Register a brand-new account and sign in
- [ ] Answer one reading question — the score must appear immediately
- [ ] Record one speaking answer — then confirm the recording is in your bucket
- [ ] Complete a checkout with the real payment method you intend to use
- [ ] Approve that payment in **Admin → Payments** and confirm the subscription
      goes active
- [ ] Trigger a password reset and confirm the email actually arrives
- [ ] Check **Admin → AI usage** shows a real provider, not `demo`

---

## Rolling back

Hostinger keeps previous deployments. To roll back the application, redeploy an
earlier commit from the Deployments panel.

**Migrations do not roll back automatically.** If a release included a
destructive migration, restore the database from a Neon branch or point-in-time
restore *first*, then redeploy the matching code. Neon retains history for the
window on your plan — check it is long enough before you rely on it.

---

## Ongoing operations

| Task | Where |
|---|---|
| Approve bank transfers | Admin → Payments |
| Watch AI spend against the budget | Admin → AI usage |
| Change prices, plans, allowances | Admin → Plans — no deploy needed |
| Pause new sign-ups | Admin → Settings → Registration open |
| Maintenance notice | Admin → Settings → Maintenance mode |
| Review admin actions | Admin → Audit log |

### Two limits worth knowing

**Rate limiting is per instance.** `src/lib/rate-limit.ts` keeps counters in
process memory, which is correct for a single Hostinger app. If you ever scale
to multiple instances, move it to Redis — the call sites do not change.

**Sessions are database-backed.** Signing out everywhere genuinely revokes
every session, and a stolen cookie stops working the moment its row is revoked.
The cost is one indexed lookup per request.
