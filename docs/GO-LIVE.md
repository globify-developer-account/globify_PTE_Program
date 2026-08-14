# Go-live checklist

Work top to bottom. The **blocking** items can lose money, leak data or lock
users out — do not launch with any of them unticked.

---

## Blocking — security

- [ ] **Neon password rotated.** The development password was shared in plain
      text. Reset it in the Neon console and update `DATABASE_URL`.
- [ ] **`AUTH_SECRET` is the generated production value**, not the development
      placeholder. It signs sessions, password-reset tokens and storage URLs.
      Anyone holding the old one could forge all three.
- [ ] **`DEMO_MODE=false`.** With it on, the simulated gateway activates
      subscriptions without payment. The app refuses to start in production
      with demo mode enabled, but confirm it anyway.
- [ ] **`PAYMENT_WEBHOOK_SECRET` set** to the generated value, or to your
      gateway's signing secret. Without it a forged webhook is indistinguishable
      from a real one.
- [ ] **Storage bucket is private.** Run `npm run verify:storage` — it fails
      loudly if an object is readable without a signature. A public bucket
      exposes every student's voice recording.
- [ ] **HTTPS is live and the certificate valid.** Session cookies are `secure`
      in production, so sign-in silently fails over plain http.
- [ ] **`SEED_ADMIN_PASSWORD` removed** from the environment after seeding, and
      the admin password changed from the profile page.
- [ ] **`.env` is not in the repository.** `git log --all --full-history -- .env`
      must return nothing.

## Blocking — money

- [ ] **Bank, Easypaisa and JazzCash details are your real accounts.** The
      manual payment page shows them verbatim; a leftover `TODO` means students
      transfer money nowhere.
- [ ] **Prices are correct** in Admin → Plans, in the right currency.
- [ ] **A real end-to-end payment tested** with the method you will actually
      offer, then approved in Admin → Payments, with the subscription confirmed
      active.
- [ ] **`AI_MONTHLY_BUDGET_USD` is a real ceiling.** `0` means unlimited spend.
      When the cap is hit, scoring pauses and students are told their answer was
      saved — it never fails silently or runs up an unbounded bill.

## Blocking — users can actually use it

- [ ] **Email actually sends.** `EMAIL_PROVIDER=console` only writes to the log,
      so password resets never arrive and users cannot recover accounts. Trigger
      a real reset and confirm the email lands.
- [ ] **Registration works** for a brand-new address.
- [ ] **A speaking recording persists.** Record an answer, then confirm the
      object exists in your bucket and plays back on the result screen.
- [ ] **`NEXT_PUBLIC_APP_URL` exactly matches the live domain**, `https://`, no
      trailing slash. It drives canonical URLs, the sitemap, checkout return
      URLs and the OAuth redirect.

---

## Important — content and correctness

- [ ] Demo students removed, if you do not want them in your analytics. The seed
      creates ten with practice history.
- [ ] Question bank reviewed. The seed ships 35 questions; check the answer keys
      on anything you have edited, especially Highlight Incorrect Words, whose
      key is word *indexes* into the passage and breaks if the passage is edited
      without re-selecting.
- [ ] Legal pages read and corrected: Terms, Privacy, Refund Policy, AI
      Disclaimer. They are written for this product but are not legal advice —
      have someone qualified review them for your jurisdiction.
- [ ] Contact details in `src/lib/site.ts` and Admin → Settings are current.
- [ ] Every AI-produced score is labelled *AI Estimated Score* and the product
      makes no claim of Pearson affiliation. This is deliberate — do not remove
      those labels when editing copy.

## Important — operations

- [ ] Neon backups / point-in-time restore window checked, and long enough to be
      useful.
- [ ] Someone is responsible for checking Admin → Payments daily. Bank transfers
      sit unactivated until a human approves them, and a student who has paid is
      waiting.
- [ ] Admin → AI usage reviewed after the first day of real traffic. Confirm the
      provider column shows your real provider, not `demo`.
- [ ] Google Analytics / Meta Pixel IDs set, if you want them.

---

## Nice to have

- [ ] Google sign-in configured.
- [ ] Uptime monitor pointed at `/` (a plain GET, no auth required).
- [ ] A second admin account, so one lost password does not lock you out.
- [ ] Custom favicon and social share image replacing the generated ones.

---

## Known limits — decide if they matter to you

**Rate limiting is per instance.** Counters live in process memory. Correct for
a single Hostinger app; move to Redis before scaling horizontally.
`src/lib/rate-limit.ts`, call sites unchanged.

**Notifications are in-app only.** Email, WhatsApp and SMS rows can already be
written and stay unsent until a dispatcher for those channels is added. The data
model does not change when you add one.

**Teacher review is queue-only.** Requests are listed in Admin → Reviews with
status and assignment; the teacher's scoring interface is not built. Plans that
advertise teacher reviews should say so honestly until it is.

**Transcription quality drives speaking scores.** With
`AI_TRANSCRIPTION_PROVIDER=demo` the transcript is heuristic and speaking scores
are indicative only. Set a real provider before charging for speaking feedback.
