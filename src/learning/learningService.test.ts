import { describe, expect, it } from "vitest";
import { evaluateLearningAnswer, nextQuestion, reviewedTemplateMetadata } from "./learningService";

describe("standalone Learning service", () => {
  it("creates deterministic, answerable questions from reviewed starter forms", () => {
    expect(nextQuestion(12, "ELA")).toEqual(nextQuestion(12, "ELA"));
    const question = nextQuestion(7, "Math");
    expect(evaluateLearningAnswer(question, question.answer)).toBe(true);
    expect(reviewedTemplateMetadata).toHaveLength(12);
  });
});
