import { describe, expect, it } from "vitest";
import { commonCoreQuizzes } from "../game/data/commonCoreQuizzes";
import type { StudentSession } from "../game/utils/studentSession";
import { chooseQuiz, isCorrectAnswer, normalizeAnswer } from "./quizLogic";

const kindergartenMathStudent: StudentSession = {
  token: "test-token",
  student: { id: "student-1", username: "Molly", grade: "K", subjects: ["MATH"] }
};

describe("quiz answer evaluation", () => {
  it("accepts spoken number words, punctuation, and phonetic letter names", () => {
    expect(normalizeAnswer("Seven!")).toBe("7");
    expect(isCorrectAnswer("seven", ["7"])).toBe(true);
    expect(isCorrectAnswer("ess", ["s"])).toBe(true);
  });

  it("does not accept a wrong spoken answer", () => {
    expect(isCorrectAnswer("eight", ["7", "seven"])).toBe(false);
  });
});

describe("quiz assignment", () => {
  it("never selects an unassigned grade or subject", () => {
    const quiz = chooseQuiz(kindergartenMathStudent, undefined, () => 0.9);
    expect(quiz.grade).toBe("K");
    expect(quiz.subject).toBe("MATH");
  });

  it("lets demo mode choose from every grade", () => {
    const demo: StudentSession = { ...kindergartenMathStudent, demo: true };
    const quiz = chooseQuiz(demo, "ELA", () => 0.99);
    expect(quiz.subject).toBe("ELA");
    const elaQuizzes = commonCoreQuizzes.filter((item) => item.subject === "ELA");
    expect(quiz).toBe(elaQuizzes[elaQuizzes.length - 1]);
  });
});
