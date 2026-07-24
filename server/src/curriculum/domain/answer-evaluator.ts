import type { QuestionInstance } from "./question-template";

export interface AnswerEvaluation { correct: boolean; requiresHumanReview: boolean; }

function normalize(value: unknown): unknown {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (Array.isArray(value)) return value.map(normalize).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

export function evaluateAnswer(instance: QuestionInstance, submittedAnswer: unknown): AnswerEvaluation {
  if (instance.responseType === "constructedResponse") return { correct: false, requiresHumanReview: true };
  return { correct: JSON.stringify(normalize(submittedAnswer)) === JSON.stringify(normalize(instance.canonicalAnswer)), requiresHumanReview: false };
}
