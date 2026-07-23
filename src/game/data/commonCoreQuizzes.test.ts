import { describe, expect, it } from "vitest";
import { commonCoreQuizzes } from "./commonCoreQuizzes";

describe("Common Core quiz catalogue", () => {
  it("provides a lesson and valid oral answer for every prompt", () => {
    expect(commonCoreQuizzes).toHaveLength(12);
    for (const quiz of commonCoreQuizzes) {
      expect(quiz.lesson.title).not.toHaveLength(0);
      expect(quiz.lesson.explanation).not.toHaveLength(0);
      expect(quiz.lesson.keyIdea).not.toHaveLength(0);
      for (const question of quiz.questions) {
        expect(question.standardCode).not.toHaveLength(0);
        expect(question.acceptedAnswers.length).toBeGreaterThan(0);
        expect(question.answerIndex).toBeGreaterThanOrEqual(0);
        expect(question.answerIndex).toBeLessThan(question.choices.length);
      }
    }
  });
});
