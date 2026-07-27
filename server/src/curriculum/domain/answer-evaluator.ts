import type { QuestionInstance } from "./question-template";

export interface AnswerEvaluation { correct: boolean; requiresHumanReview: boolean; }

function normalize(value: unknown, preserveArrayOrder = false): unknown {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
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
