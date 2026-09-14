/**
 * Chooses a session's questions from the eligible pool.
 *
 * Questions the student has never answered come first, in random order, so
 * two sessions over a large pool do not open on the same items. Once those run
 * out, the questions practised longest ago fill the rest — never the same few
 * every time, which is what ordering by a global attempt counter produced.
 *
 * Pure, so it can be tested without a database; `startPracticeSession` supplies
 * the pool and the student's history.
 */
export function pickSessionQuestions(
  poolIds: string[],
  practisedAt: Map<string, Date>,
  count: number,
  random: () => number = Math.random,
): string[] {
  const unseen = poolIds.filter((id) => !practisedAt.has(id))
  const seen = poolIds
    .filter((id) => practisedAt.has(id))
    .map((id) => ({ id, at: practisedAt.get(id)!.getTime(), tie: random() }))
    .sort((a, b) => a.at - b.at || a.tie - b.tie)
    .map((entry) => entry.id)

  return [...randomOrder(unseen, random), ...seen].slice(0, count)
}

function randomOrder<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
