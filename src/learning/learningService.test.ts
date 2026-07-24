import { describe, expect, it } from "vitest";
import { deriveQuestionSeed, evaluateLearningAnswer, nextQuestion, reviewedTemplateMetadata } from "./learningService";

describe("standalone Learning service", () => {
  it("creates deterministic, answerable questions from reviewed starter forms", () => {
    expect(nextQuestion(12, "ELA")).toEqual(nextQuestion(12, "ELA"));
    const question = nextQuestion(7, "Math");
    expect(evaluateLearningAnswer(question, question.answer)).toBe(true);
    expect(reviewedTemplateMetadata).toHaveLength(8);
  });

  it("derives stable, distinct question seeds across a session", () => {
    const seeds = Array.from({ length: 10 }, (_, index) => deriveQuestionSeed(12345, index));
    expect(new Set(seeds).size).toBe(10);
    expect(seeds).toEqual(Array.from({ length: 10 }, (_, index) => deriveQuestionSeed(12345, index)));
  });
});
