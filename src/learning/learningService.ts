export type LearningSubject = "ELA" | "Math";
export type LearningQuestion = { id: string; templateId: string; standardId: string; subject: LearningSubject; skill: string; prompt: string; audioText: string; choices: string[]; answer: string; explanation: string; domain: string };
export type LearningAttempt = { questionId: string; standardId: string; subject: LearningSubject; correct: boolean; at: string };

export const reviewedTemplateMetadata = [
  ["K.RF.1.d", "letter-match", "Recognize letter pairs", "ELA", "Reading foundational skills"], ["K.RF.1.d", "letter-name", "Name a letter", "ELA", "Reading foundational skills"],
  ["K.RF.2.a", "rhyme", "Find rhymes", "ELA", "Reading foundational skills"], ["K.RF.2.a", "rhyme-picture", "Hear rhymes", "ELA", "Reading foundational skills"],
  ["K.RF.2.d", "middle-vowel", "Hear middle sounds", "ELA", "Reading foundational skills"], ["K.RF.2.d", "cvc-sound", "Hear CVC sounds", "ELA", "Reading foundational skills"],
  ["K.CC.A.1", "count-sequence", "Count in order", "Math", "Counting and cardinality"], ["K.CC.A.1", "count-forward", "Keep counting", "Math", "Counting and cardinality"],
  ["K.CC.A.2", "next-number", "Continue counting", "Math", "Counting and cardinality"], ["K.CC.A.2", "number-after", "Find the next number", "Math", "Counting and cardinality"],
  ["K.CC.A.3", "count-objects", "Match numerals to quantities", "Math", "Counting and cardinality"], ["K.CC.A.3", "numeral-choice", "Choose the numeral", "Math", "Counting and cardinality"]
] as const;
export const REVIEW_NOTE = "Internal project review; not professional educator certification.";
const storageKey = "molly-learning-attempts-v1";
const pick = <T,>(values: readonly T[], seed: number): T => values[Math.abs(seed) % values.length];

export function nextQuestion(seed: number, subject: LearningSubject | "Mixed" = "Mixed"): LearningQuestion {
  const isEla = subject === "Mixed" ? seed % 2 === 0 : subject === "ELA";
  if (isEla) {
    const letters = [["B", "b"], ["M", "m"], ["T", "t"]] as const; const pair = pick(letters, seed); const rhymes = [["cat", "hat", "sun"], ["pig", "wig", "map"], ["bug", "rug", "pen"]] as const;
    if (seed % 3 === 0) return { id: `letter-${seed}`, templateId: "k.rf.1.d.letter-match", standardId: "K.RF.1.d", subject: "ELA", skill: "Letter matching", prompt: `Which lowercase letter matches ${pair[0]}?`, audioText: `Which lowercase letter matches ${pair[0]}?`, choices: [pair[1], "n", "p"], answer: pair[1], explanation: `The matching lowercase letter is ${pair[1]}.`, domain: "Reading foundational skills" };
    const words = pick(rhymes, seed); return { id: `rhyme-${seed}`, templateId: "k.rf.2.a.rhyme", standardId: "K.RF.2.a", subject: "ELA", skill: "Rhyming words", prompt: `Which word rhymes with ${words[0]}?`, audioText: `Which word rhymes with ${words[0]}?`, choices: [words[1], words[2], "dog"], answer: words[1], explanation: `${words[0]} rhymes with ${words[1]} because both words end with the same sound.`, domain: "Reading foundational skills" };
  }
  const start = (seed % 12) + 1; const answer = String(start + 1); return { id: `count-${seed}`, templateId: "k.cc.a.2.next-number", standardId: "K.CC.A.2", subject: "Math", skill: "Continue counting", prompt: `What number comes after ${start}?`, audioText: `What number comes after ${start}?`, choices: [String(start), answer, String(start + 3)], answer, explanation: `${answer} comes after ${start}.`, domain: "Counting and cardinality" };
}
export function evaluateLearningAnswer(question: LearningQuestion, answer: string): boolean { return question.answer.trim().toLowerCase() === answer.trim().toLowerCase(); }
export function loadAttempts(): LearningAttempt[] { try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as LearningAttempt[]; } catch { return []; } }
export function saveAttempt(attempt: LearningAttempt): void { const all = loadAttempts(); if (all.some((item) => item.questionId === attempt.questionId)) return; localStorage.setItem(storageKey, JSON.stringify([...all, attempt])); }
