# AI Conversations

Freeform speaking and typing practice against an AI partner. A student picks a
scenario (or writes their own), talks to a character for as long as they like,
and gets a written report at the end.

The design goal is **low pressure**. A student can speak badly, mix languages,
or stop mid-sentence, and the partner will keep the conversation going rather
than correcting them mid-turn. Corrections are collected quietly and shown
beside the student's own message.

---

## What a student does

1. `/conversations` — pick a topic card, or *Create a conversation on any topic*.
2. The chat opens immediately with the partner's first line.
3. Speak (press the microphone) or type. Both go through the same turn logic.
4. Press *Listen* on any partner turn to hear it, or tick **Read aloud** to have
   every reply spoken automatically.
5. After at least 3 turns, press **Finish** to get a report.

Staff author the topics at `/admin/conversations`.

---

## Shape of the data

| Model | Holds |
|---|---|
| `ConversationTopic` | The reusable scenario staff author: persona, scene, opening line, goals. |
| `Conversation` | One student's run of it. Carries a **copy** of the scenario. |
| `ConversationMessage` | One turn. Student turns may carry a correction and an audio key. |
| `ConversationReport` | Written once when the conversation is finished. |

`Conversation` denormalises `title`, `scenario`, `personaName`, `personaRole`,
`level` and `goals` from the topic. This is deliberate: a student keeps reading
their transcript and report long after staff have edited or archived the topic,
and history must not silently rewrite itself. It is also what lets a custom
conversation exist with no topic row at all (`topicId` is null, `isCustom` true).

Archiving a topic hides it from students; it is never deleted, because
conversations reference it.

---

## Provider contract

Conversation is a **separate contract** from `AIProvider`, in
`src/lib/ai/conversation/`:

```ts
interface ConversationProvider {
  reply(input: ConversationReplyInput): Promise<AiResult<ConversationReply>>
  report(input: ConversationReportInput): Promise<AiResult<ConversationReport>>
}
```

Scoring is single-shot — one response in, one verdict out. A conversation is
multi-turn and stateful, and the two have almost nothing in common beyond the
transport. Keeping them apart means a provider can support scoring without
supporting chat, and the scoring contract stays small.

Implementations: `anthropic`, `openai`, `gemini`, `demo`. Selection follows
`AI_PROVIDER`, with the same degrade-to-simulated policy as scoring.

`runConversationAi()` applies budget enforcement, bounded retries, provider
fallback and usage accounting — the same policy `runAi()` applies to scoring.
The two runners are separate only because `runAi()` is typed against
`AIProvider`. **If a third contract appears, hoist the policy into one generic
runner rather than copying it a third time.**

### Model choice

Chat turns are latency-sensitive and the student feels every second, so the
Anthropic and OpenAI conversation providers default to a faster model than the
scoring default. Override with `AI_CONVERSATION_MODEL`.

---

## Speech

Two independent directions, both optional:

**In (speech-to-text)** reuses the existing `transcriptionProvider()` —
`AI_TRANSCRIPTION_PROVIDER`. A spoken turn is uploaded, stored under
`conversations/<userId>/…`, transcribed, and then follows exactly the same path
as a typed turn. If nothing intelligible comes back the recording is kept and
the student is told, rather than an empty turn reaching the model.

**Out (text-to-speech)** is `src/lib/ai/speech/`, selected by
`AI_SPEECH_PROVIDER`.

There is deliberately **no simulated speech provider**. A fake voice would be
silence or a tone, and neither helps anyone practise listening. When no provider
is configured, `POST /api/conversations/speech` returns `{ mode: 'client' }` and
the browser reads the text with its own `speechSynthesis` voice. That path needs
no credentials, costs nothing and works offline — which is what keeps spoken
replies working in demo mode.

---

## Cost control

Two ceilings, doing different jobs:

- **`ai_conversation` quota** — counted per *conversation started*, not per turn.
  Free tier gets 2 a month; plan limits set `aiConversationsPerMonth`
  (`-1` = unlimited).
- **`MAX_USER_TURNS` (30)** — because the quota counts conversations, a single
  conversation could otherwise run indefinitely on one unit of allowance.

Prompt size is bounded separately by `HISTORY_MESSAGES` (16), so a long
conversation does not grow the prompt — and the bill — without limit.

Every call is logged to `AiUsageLog` under `CONVERSATION`,
`CONVERSATION_REPORT` or `SPEECH_SYNTHESIS`, so the admin cost dashboard stays
complete. Speech is billed per character rather than per token; `costMicros` is
still millionths of a USD so it aggregates with everything else.

---

## Correction policy

The partner **never** corrects inside its spoken reply. Corrections go in a
separate field and are rendered beside the student's own message.

A correction is stored only when it actually differs from what the student
wrote, and the prompt tells the model to leave it null for punctuation and
capitalisation on a turn that was spoken aloud — transcription does not produce
either, so correcting them would be correcting the transcriber.

The simulated provider's rule set is deliberately tiny, and every rule fires
only on a pattern that is wrong in every context. **A false correction in a
confidence-building exercise costs far more than a missed one.**

---

## Scores are estimates

`ConversationReport.estimatedScore` is an AI Estimated Score on the 10–90 scale,
for practice only. It is never written into `Progress`, never mixed into the
overall estimate, and always rendered with `AiEstimateBadge`. A simulated report
says so in its own summary text.

---

## Files

```
src/lib/ai/conversation/     provider contract, prompts, 4 providers, runner
src/lib/ai/speech/           TTS contract + openai provider
src/lib/conversations/       service layer (start, turn, finish) + admin schemas
src/app/api/conversations/   student API
src/app/api/admin/conversation-topics/   staff CRUD
src/app/(app)/conversations/ student pages
src/app/admin/conversations/ staff pages
src/components/conversations/ chat, push-to-talk, report, gallery
prisma/seed-data/conversation-topics.ts   starter catalogue (14 topics)
```
