import { describe, expect, it } from "vitest";
import { commonCoreQuizzes } from "./commonCoreQuizzes";

describe("Oklahoma-aligned quiz catalogue", () => {
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

  it("uses Oklahoma identifiers and Grade 1 addition and subtraction ranges for K–2 mini-quizzes", () => {
    const kindergartenThroughSecond = commonCoreQuizzes.filter((quiz) => ["K", "GRADE_1", "GRADE_2"].includes(quiz.grade));
    expect(kindergartenThroughSecond.flatMap((quiz) => quiz.questions).every((question) => !/^(?:K\.CC|K\.OA|RF\.|RL\.|RI\.|L\.|\d\.OA|\d\.NBT)/.test(question.standardCode))).toBe(true);
    expect(commonCoreQuizzes.find((quiz) => quiz.id === "1-math-add-subtract")?.questions.map((question) => question.prompt)).toEqual(["5 + 4 =", "9 − 4 =", "Which equation has a sum of 10?"]);
  });
});
