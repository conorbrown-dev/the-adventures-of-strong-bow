import { commonCoreQuizzes, type CurriculumQuiz, type CurriculumSubject } from "../game/data/commonCoreQuizzes";
import type { StudentSession } from "../game/utils/studentSession";

/** Chooses only material the signed-in learner has been assigned. */
export function chooseQuiz(session: StudentSession, subject?: CurriculumSubject, random = Math.random): CurriculumQuiz {
  const available = session.demo
    ? commonCoreQuizzes
    : commonCoreQuizzes.filter((quiz) => quiz.grade === session.student.grade && session.student.subjects.includes(quiz.subject));
  const matchingSubject = subject ? available.filter((quiz) => quiz.subject === subject) : available;
  return matchingSubject[Math.floor(random() * matchingSubject.length)] ?? commonCoreQuizzes[0];
}

export function isCorrectAnswer(response: string, answers: string[]): boolean {
  const normalizedResponse = normalizeAnswer(response);
  return answers.some((answer) => normalizeAnswer(answer) === normalizedResponse);
}

export function normalizeAnswer(value: string): string {
  const numberWords: Record<string, string> = {
    zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
    twentyfour: "24", fifty: "50", sixtythree: "63", seventytwo: "72"
  };
  const compact = value.toLowerCase().replace(/[^a-z0-9.]/g, "");
  return numberWords[compact] ?? compact.replace("em", "m").replace("ess", "s").replace("tee", "t");
}
