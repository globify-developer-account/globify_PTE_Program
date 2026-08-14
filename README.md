# Globify PTE Premium

An AI-assisted PTE Academic preparation platform built for
**Globify Consultants** — practice across all 18 task types, immediate scoring,
full-length mock tests, progress analytics and subscription billing.

> Scores produced by this platform are **AI Estimated Scores**, generated for
> practice. They are not official Pearson PTE scores, and Globify Consultants is
> not affiliated with, endorsed by, or connected to Pearson.

---

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4, CSS-first `@theme` tokens |
| Database | PostgreSQL via Prisma 6 |
| Auth | Email/password + Google OAuth over database-backed sessions |
| AI | Provider abstraction — Anthropic, OpenAI, Gemini, or a built-in deterministic scorer |
| Payments | Provider abstraction — Stripe, manual bank/Easypaisa/JazzCash, or a simulated gateway |
| Storage | S3-compatible or local disk, always behind signed URLs |
| Tests | Vitest |

---

## Quick start

```bash
npm install
cp .env.example .env          # set DATABASE_URL at minimum
npm run db:deploy             # apply migrations
npm run db:seed               # question bank, plans, mock tests, demo accounts
npm run dev
```

Open <http://localhost:3000>.

With `DEMO_MODE=true` (the default outside production) the whole product works
without any AI or payment credentials: scoring falls back to a deterministic
heuristic scorer and checkout uses a simulated gateway. Every simulated result
is labelled as such in the UI.

**Seeded accounts** — passwords come from `SEED_ADMIN_PASSWORD` /
`SEED_STUDENT_PASSWORD`, defaulting to `GlobifyAdmin!2026` and
`GlobifyStudent!2026`:

| Role | Email |
|---|---|
| Super Admin | `admin@globifyconsultants.com` |
| Teacher | `teacher@globifyconsultants.com` |
| Student (premium, with history) | `adnan@example.com` |
| Student (free tier) | `bilal@example.com` |

---

## What it does

**Practice.** All 18 PTE Academic task types across 11 renderers. Speaking tasks
use a browser recorder that reproduces the exam's preparation countdown and
auto-stop, because a student who has only practised with a manual start button
is not ready for the test.

**Scoring.** Objectively-scored tasks are marked by the published PTE rules —
adjacent-pair scoring for Re-order Paragraphs, +1/−1 with a floor of zero for
multiple-answer questions, word-by-word for Write From Dictation. These never
reach an AI provider; the rules are cheaper and more accurate. Speaking and
writing go to the AI abstraction, and the Form word-limit rule is enforced in
code afterwards rather than left to the model's judgement.

**Mock tests.** Full-length papers with per-section timing, no feedback between
questions, and unanswered questions scored as the minimum — as in a real
sitting. Answers run through the same scoring pipeline as practice, so results
are directly comparable to a student's own history.

**Progress.** Section estimates, a 60-day trend, per-task-type breakdowns and a
deterministic rules-based recommendation engine. The rules are deliberately not
an AI call: a student should see *why* something was recommended, and the reason
must not change between page loads.

**Commerce.** Database-driven plans, coupons, and checkout supporting cards,
bank transfer, Easypaisa and JazzCash. Manual payments are reviewed by an
administrator; card payments activate through a verified webhook.

**Admin.** Fifteen areas including a full question editor, payment review,
plan pricing, AI cost tracking, analytics and an append-only audit log.

---

## Design decisions worth knowing

**Money is integer minor units throughout.** No float touches a price, and no
Prisma `Decimal` crosses the server/client boundary.

**Payment activation is idempotent at two layers** — a unique
`(provider, eventId)` webhook key, and a payment-status guard inside the
activation transaction. A provider that retries with a *fresh* event id still
cannot extend a subscription twice.

**Answer keys never reach the browser before submission.** `toPublicQuestion` is
the only path a question takes to the client, and it strips `correctAnswer`,
`explanation` and `sampleAnswer`. They come back from the submit endpoint after
an answer is recorded.

**AI output is untrusted input.** Every provider response is schema-validated,
and each numeric trait is clamped into the 0–90 band before it is written.

**The UI is never the enforcement point.** Middleware only redirects visitors
without a session cookie, for a nicer experience. Every private page and API
route independently verifies the session and permission against the database.

**Prices, plans, allowances and platform settings are data.** An administrator
changes them without a deploy. API keys are the deliberate exception — they live
only in environment variables, so a compromised admin session cannot read them.

---

## Commands

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build — never touches the database |
| `npm start` | Apply pending migrations, then serve |
| `npm run start:no-migrate` | Serve without running migrations |
| `npm test` | Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:deploy` | Apply migrations |
| `npm run db:seed` | Seed content and demo accounts (idempotent) |
| `npm run db:studio` | Prisma Studio |
| `npm run verify:storage` | Prove object storage round-trips and is private |

---

## Documentation

| | |
|---|---|
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploying to Hostinger, step by step |
| [`docs/GO-LIVE.md`](docs/GO-LIVE.md) | Pre-launch checklist |
| [`docs/AI.md`](docs/AI.md) | AI providers, prompts, cost control |
| [`docs/PAYMENTS.md`](docs/PAYMENTS.md) | Payment flows and webhook contract |
| [`docs/TESTING.md`](docs/TESTING.md) | What is tested and how to extend it |
| [`.env.production.example`](.env.production.example) | Every production variable, explained |

---

## Originality

This product was built for Globify Consultants. Its user journey is informed by
what works in PTE preparation generally, but its architecture, database schema,
components, visual system, copy and question content are original to this
codebase. No third-party proprietary source, assets or text were copied.
