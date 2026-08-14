# Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
```

---

## What is covered, and why those things

**59 unit tests** across four files. They were chosen by consequence, not by
coverage percentage — these are the places where a bug is expensive and silent.

### `src/lib/pte/scoring.test.ts` — 26 tests

The published PTE marking rules. **If one of these fails, a student's score is
wrong**, which is the most damaging bug this product can ship. So the rules are
asserted rather than assumed:

- Multiple-answer partial credit: +1 per correct, −1 per incorrect, floored at
  zero — including the case that selecting *everything* does not score well.
- Re-order paragraphs scored on adjacent pairs, not absolute positions.
- Fill-in-the-blanks matching after case and whitespace normalisation.
- Write From Dictation word-by-word, including that repeating a word does not
  earn the mark twice.
- Highlight Incorrect Words false-positive penalty.
- That AI-scored task types correctly return `null` rather than a wrong number.

### `src/lib/money.test.ts` — 10 tests

Discount-before-tax ordering, the discount floor, integer output for awkward tax
rates, and that subtotal − discount + tax always equals the total. A rounding
bug here becomes a billing dispute.

### `src/lib/pte/schemas.test.ts` — 13 tests

Question content comes from JSON columns an admin can edit; answers come off the
wire. Both are untrusted. These tests assert that malformed input **degrades to
an empty state rather than throwing inside a renderer** — a broken question
should show an empty state, never crash the practice engine.

Also pins `tokenizeWords` and `segmentPassage`, because the Highlight Incorrect
Words answer key is word *indexes* into the passage: if tokenisation changes,
every existing key silently becomes wrong.

### `src/lib/utils.test.ts` — 10 tests

Word counting against PTE limits, duration formatting, date boundaries.

---

## What is verified end to end, and how

The following were exercised against a live PostgreSQL database with the dev
server running. They are not in the automated suite because they need a real
database, a real HTTP server and seeded content.

| Flow | Result |
|---|---|
| Reading MCQ, correct answer | 90, source `RULE`, `isCorrect: true` |
| Write From Dictation, half the words | 54 — 5/9 words credited |
| Essay at 167 words (limit 200–300) | 40, `form: 0`, feedback explains the cap |
| Progress rollup after scoring | Per-section estimates updated |
| Coupon `WELCOME15` on PKR 5,999 | Discount 899.85, total 5,099.15 |
| Forged webhook signature | `400` rejected |
| Valid webhook | `activated` |
| Same webhook event replayed | `duplicate_event` |
| New event id, same payment | `already_paid` — no double activation |
| Mock test start twice | Same session resumed, not duplicated |
| Mock test finish twice | One result row |

### Reproducing them

Start the dev server, then use the seeded accounts:

```bash
npm run dev
```

Sign in as `adnan@example.com` (premium, with history) or `bilal@example.com`
(free tier, to see the paywalls). Admin at `/admin/login`.

For the payment path, set `DEMO_MODE=true` and use **Simulated payment** at
checkout — it sends a genuinely signed webhook to the real endpoint, so the
whole verification and idempotency path runs.

---

## Storage

```bash
npm run verify:storage
```

Writes an object, reads it back, compares the bytes, produces a signed URL and
fetches it, confirms the bucket is **not** publicly readable, then deletes the
object. Exits non-zero on any failure.

Run this after any change to storage configuration. A misconfigured bucket loses
student recordings silently.

---

## Where to add tests next

In rough order of value:

1. **`src/lib/access.ts`** — quota arithmetic and window boundaries. Needs a
   database or a Prisma mock; worth the setup because it gates paid features.
2. **`activateSubscription()`** — the idempotency guards are verified manually
   but deserve an automated test against a test database.
3. **`src/lib/recommendations.ts`** — the rules are pure apart from three
   queries; extracting the ranking would make it directly testable.
4. **Renderer interaction tests** — Testing Library over the 11 renderers,
   particularly Re-order (drag *and* keyboard produce the same ordered list) and
   Highlight (index correctness).

---

## Conventions

- Colocate unit tests as `*.test.ts` beside the module.
- Assert behaviour that matters to a student or to the money, not implementation
  detail.
- Name tests as statements of the rule they protect — `floors at zero rather
  than going negative`, not `test scoreMultipleChoice 3`.
