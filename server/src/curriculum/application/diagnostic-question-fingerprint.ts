import type { QuestionInstance } from "../domain/question-template";

function normalizedValue(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => normalizedValue(item));
    return key === "choices"
      ? items.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
      : items;
  }
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entryKey, entryValue]) => [entryKey, normalizedValue(entryValue, entryKey)]));
}

export function diagnosticQuestionFingerprint(question: QuestionInstance): string {
  return JSON.stringify(normalizedValue({
    responseType: question.responseType,
    prompt: question.prompt,
    interaction: question.interaction,
    canonicalAnswer: question.canonicalAnswer
  }));
}
