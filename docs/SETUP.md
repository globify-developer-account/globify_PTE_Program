# Local setup

## Requirements

- **Node 20.9+** (22.x recommended)
- **PostgreSQL** — a local instance, or a free hosted one from
  [Neon](https://neon.tech) or [Supabase](https://supabase.com)

Nothing else. No Docker, no Redis, no S3 account needed to develop.

---

## Getting running

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL`. Everything else has a working default.

```bash
npm run db:deploy    # apply migrations
npm run db:seed      # question bank, plans, mock tests, demo accounts
npm run dev
```

Open <http://localhost:3000>. If port 3000 is taken, Next picks the next free
one — **update `NEXT_PUBLIC_APP_URL` to match**, because it drives checkout
return URLs and the demo gateway's call to its own webhook.

### Seeded accounts

Passwords come from `SEED_ADMIN_PASSWORD` / `SEED_STUDENT_PASSWORD`, defaulting
to `GlobifyAdmin!2026` and `GlobifyStudent!2026`.

| Role | Email | Useful for |
|---|---|---|
| Super Admin | `admin@globifyconsultants.com` | The whole admin area |
| Teacher | `teacher@globifyconsultants.com` | Review-scoped permissions |
| Student, premium | `adnan@example.com` | Populated dashboard and charts |
| Student, free | `bilal@example.com` | Paywalls and quota limits |

The seed is idempotent — every write is an upsert on a natural key — so you can
re-run it safely.

---

## Demo mode

Outside production, `DEMO_MODE` defaults to `true`. That makes the entire
product work with **no AI or payment credentials**:

- Speaking and writing are scored by a built-in deterministic scorer that uses
  measurable signals — word count, filler rate, pace, lexical variety, source
  overlap. Not a stub, but clearly labelled as simulated everywhere it appears.
- Checkout offers a **Simulated payment** option that signs a payload and posts
  it to the real webhook endpoint, so the full verification and idempotency path
  runs.

To use real providers locally, set `AI_PROVIDER` and `AI_API_KEY`, and
`DEMO_MODE=false`.

---

## Project layout

```
prisma/
  schema.prisma          30 models
  migrations/            SQL, generated offline
  seed.ts                idempotent seed
  seed-data/questions.ts 35 original questions

src/
  app/
    (marketing)/         public site
    (auth)/              sign in, register, password reset
    (app)/               signed-in student area
    admin/               15 admin areas
    api/                 route handlers
  components/
    ui/                  design system primitives
    charts/              hand-drawn SVG charts
    practice/            player, recorder, 11 renderers
    admin/ checkout/ ... feature components
  lib/
    pte/                 task catalogue, marking rules, content schemas
    ai/                  provider abstraction + 4 providers
    payments/            provider abstraction + checkout/activation
    auth/                sessions, permissions, guards
    storage/             S3 + local drivers, URL signing
```

---

## Working on the schema

```bash
npm run db:migrate       # create a migration from schema changes
npm run db:studio        # browse data
npm run db:reset         # drop, re-migrate, re-seed  (destructive)
```

`prisma.config.ts` disables Prisma's implicit `.env` loading, which is why that
file imports `dotenv/config` on its first line. If you see "environment variable
not found" from a Prisma command, that import is the thing to check.

### Generating migrations without a database

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

On Windows, redirecting that output can add a UTF-8 BOM, which PostgreSQL
rejects with a syntax error at character 1. Strip it:

```bash
sed -i '1s/^\xEF\xBB\xBF//' prisma/migrations/<name>/migration.sql
```

---

## Before you commit

```bash
npm run typecheck
npm run lint
npm test
```

`npm run build` also runs `prisma migrate deploy`, so it needs a reachable
database. Use `npm run build:local` to build without touching one.

---

## Conventions

- **Money** is always integer minor units. Never a float, never a `Decimal`
  crossing to the client.
- **Untrusted input** — request bodies, JSON columns, AI responses — is parsed
  with Zod at the boundary. `parseJson` types the input as `unknown` for exactly
  this reason.
- **Authorisation is server-side.** Middleware only redirects on a missing
  cookie; every page and route re-checks with `requireUser` / `requireStaff` /
  `requireApiStaff`.
- **Comments explain why, not what.** If a line needs a comment to say what it
  does, rename something instead.
