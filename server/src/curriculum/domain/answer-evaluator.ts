import type { QuestionInstance } from "./question-template";

export interface AnswerEvaluation { correct: boolean; requiresHumanReview: boolean; }

const phonemeWords: Record<string, string> = {
  ah: "a", ay: "a", eh: "e", ee: "e", ih: "i", eye: "i", oh: "o", oo: "u", uh: "u",
  buh: "b", duh: "d", fff: "f", guh: "g", huh: "h", mmm: "m", nnn: "n", puh: "p", rrr: "r", sss: "s", tuh: "t"
};

function numberWordValue(value: string): string | null {
  const tens: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  const ones: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  for (const [word, amount] of Object.entries(tens)) { if (value === word) return String(amount); const suffix = value.slice(word.length); if (value.startsWith(word) && ones[suffix]) return String(amount + ones[suffix]); }
  return null;
}

function normalize(value: unknown, preserveArrayOrder = false): unknown {
  if (typeof value === "string") { const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase(); const compact = normalized.replace(/[^a-z0-9]/g, ""); return numberWordValue(compact) ?? phonemeWords[normalized] ?? normalized; }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const normalized = value.map((item) => normalize(item, preserveArrayOrder));
    return preserveArrayOrder ? normalized : normalized.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

export function evaluateAnswer(instance: QuestionInstance, submittedAnswer: unknown): AnswerEvaluation {
  if (instance.responseType === "constructedResponse") return { correct: false, requiresHumanReview: true };
  const preserveArrayOrder = instance.responseType === "sequence";
  return { correct: JSON.stringify(normalize(submittedAnswer, preserveArrayOrder)) === JSON.stringify(normalize(instance.canonicalAnswer, preserveArrayOrder)), requiresHumanReview: false };
}
