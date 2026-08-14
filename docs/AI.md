# AI scoring

## The rule that shapes everything here

**Objectively-scored tasks never reach an AI provider.** Multiple choice,
re-order, fill-in-the-blanks, highlight-incorrect-words and write-from-dictation
are marked by the published PTE rules in `src/lib/pte/scoring.ts`. Those rules
are deterministic, free, instant, and more accurate than a language model at
this job.

AI is used for exactly two things: evaluating speaking and writing, where there
is no answer key.

---

## Providers

Configured with `AI_PROVIDER`. The application talks only to the `AIProvider`
interface in `src/lib/ai/types.ts`, so switching providers requires no change
outside `src/lib/ai/providers/`.

| Provider | Notes |
|---|---|
| `anthropic` | Official SDK, structured output via JSON schema |
| `openai` | OpenAI-compatible endpoint over `fetch` |
| `gemini` | Google Generative Language API over `fetch` |
| `demo` | Built-in deterministic scorer — no credentials, no network |

### The demo provider is not a stub

It scores from measurable signals: word count against the task's limit, filler
rate, speaking pace, lexical variety, and content overlap with the source text
or prompt. That makes the entire product usable and demonstrable without
credentials, and gives a student something defensible rather than a random
number.

Every surface labels a simulated result — the attempt result card, the AI tools
page, and the provider column in Admin → AI usage. A silent downgrade would be
worse than an error.

---

## How a request flows

Every AI call in the product goes through `runAi()` in `src/lib/ai/index.ts`:

```
budget guard → primary provider → bounded retries with backoff
             → fallback provider → simulated last resort
             → usage logged either way
```

- **Budget guard.** If this month's spend has reached
  `AI_MONTHLY_BUDGET_USD`, the request is refused with a 503 and the student is
  told their response was saved and can be scored later. `0` disables the cap.
- **Retries.** Only for errors the provider marked retryable, with exponential
  backoff, bounded by `AI_MAX_RETRIES`.
- **Fallback.** `AI_FALLBACK_PROVIDER` is tried if the primary exhausts its
  retries.
- **Last resort.** If everything fails, the simulated provider runs so the
  student is not left with nothing — logged as a degraded result.
- **Accounting.** Every attempt writes an `AiUsageLog` row with provider, model,
  tokens, latency, cost in integer micros, and status. That is what makes the
  admin cost dashboard complete rather than approximate.

---

## Validation — the AI does not write to the database

A model response is untrusted input. Before anything is persisted:

1. The provider parses the response against a Zod schema
   (`speakingScoreSchema`, `writingScoreSchema`). A malformed reply is an error,
   not a partial write.
2. `src/lib/attempt-scoring.ts` re-clamps every numeric trait into 0–90.
3. Free-text feedback is filtered to strings, capped in count and length.
4. Deterministic rules are applied *on top* of the model's judgement:

   - **Writing Form.** A response outside the task's word limit scores zero for
     Form and the overall is capped, regardless of how good the prose is. This
     is a hard PTE rule, not a matter of opinion.
   - **Read Aloud content.** A transcript that barely overlaps the prompt is
     almost always a recording problem, not an 80-scoring performance, so the
     score is capped rather than reported with false confidence.

---

## Transcription

Speaking answers are transcribed before scoring, via
`AI_TRANSCRIPTION_PROVIDER` (`openai` uses Whisper; `demo` is heuristic).

If transcription fails, the attempt is still scored — against an empty
transcript, which scores very low. That is the honest outcome when nothing could
be heard, and it is better than dropping the student's attempt entirely.

**Transcription quality drives speaking scores.** With the demo transcriber,
speaking results are indicative only. Configure a real one before charging for
speaking feedback.

---

## Cost control

| Control | Where |
|---|---|
| Monthly ceiling | `AI_MONTHLY_BUDGET_USD`, or Admin → Settings |
| Per-student allowances | Plan limits — Admin → Plans |
| Free-tier limits | `FREE_LIMITS` in `src/lib/access.ts` |
| Spend visibility | Admin → AI usage — by day, feature and provider |

Quota is checked *before* a paid request and consumed *after* it succeeds, so a
failed call never costs a student one of their evaluations.

Rule-scored tasks consume no AI budget at all, which is why the majority of
practice volume costs nothing.

---

## Changing the model

Set `AI_MODEL`. Leave it blank for the provider's default.

For Anthropic the current default is `claude-opus-5`. Prompts live in
`src/lib/ai/prompts.ts` and ask for a strict JSON schema; if you change a model,
re-run a few real attempts and check the schema still validates before shipping.

---

## Honesty requirements

These are product requirements, not styling choices:

- Every machine-produced score is labelled **AI Estimated Score**
  (`src/components/dashboard/ai-estimate.tsx`).
- The AI disclaimer states plainly that these are not official Pearson scores
  and that Globify Consultants is not affiliated with Pearson.
- Simulated results are identified as simulated wherever they appear.

Do not remove these when editing copy.
