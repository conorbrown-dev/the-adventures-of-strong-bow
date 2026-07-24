export type LearningSubject = "ELA" | "Math";
export type LearningGrade = "K" | "1" | "2";
export type LearningQuestion = { id: string; templateId: string; standardId: string; subject: LearningSubject; grade: LearningGrade; skill: string; prompt: string; audioText: string; choices: string[]; answer: string; explanation: string; domain: string; passage?: string; visual?: string };
export type LearningAttempt = { questionId: string; standardId: string; subject: LearningSubject; correct: boolean; at: string };

export const reviewedTemplateMetadata = [
  ["K.RF.1.d", "letter-match", "Recognize letter pairs", "ELA", "Reading foundational skills"], ["K.RF.1.d", "letter-name", "Name a letter", "ELA", "Reading foundational skills"],
  ["K.RF.2.a", "rhyme", "Find rhymes", "ELA", "Reading foundational skills"], ["K.RF.2.a", "rhyme-picture", "Hear rhymes", "ELA", "Reading foundational skills"],
  ["K.RF.2.d", "middle-vowel", "Hear middle sounds", "ELA", "Reading foundational skills"], ["K.RF.2.d", "cvc-sound", "Hear CVC sounds", "ELA", "Reading foundational skills"],
  ["K.CC.A.1", "count-sequence", "Count in order", "Math", "Counting and cardinality"], ["K.CC.A.1", "count-forward", "Keep counting", "Math", "Counting and cardinality"],
  ["K.CC.A.2", "next-number", "Continue counting", "Math", "Counting and cardinality"], ["K.CC.A.2", "number-after", "Find the next number", "Math", "Counting and cardinality"],
  ["K.CC.A.3", "count-objects", "Match numerals to quantities", "Math", "Counting and cardinality"], ["K.CC.A.3", "numeral-choice", "Choose the numeral", "Math", "Counting and cardinality"]
  , ["1.RF.3", "silent-e-decode", "Decode silent-e words", "ELA", "Reading foundational skills"], ["1.RF.3", "digraph-decode", "Decode common digraphs", "ELA", "Reading foundational skills"]
  , ["1.NBT.B.2", "tens-and-ones", "Build two-digit numbers", "Math", "Number and operations in base ten"], ["1.OA.A.1", "add-word-problem", "Solve addition stories", "Math", "Operations and algebraic thinking"]
  , ["2.RL.1", "passage-detail", "Find a detail in a passage", "ELA", "Reading literature"], ["2.L.2", "sentence-punctuation", "Choose sentence punctuation", "ELA", "Language"]
  , ["2.NBT.A.1", "hundreds-tens-ones", "Build three-digit numbers", "Math", "Number and operations in base ten"], ["2.MD.C.7", "clock-time", "Read time to five minutes", "Math", "Measurement and data"], ["2.MD.C.8", "money-total", "Count U.S. coins", "Math", "Measurement and data"]
] as const;
export const REVIEW_NOTE = "Internal project review; not professional educator certification.";
const storageKey = "molly-learning-attempts-v1";
const pick = <T,>(values: readonly T[], seed: number): T => values[Math.abs(seed) % values.length];

export const originalPassages = [{ id: "quiet-nest", title: "A Quiet Nest", gradeBand: "2", wordCount: 32, provenance: "Project original", review: "reviewed", text: "Mina found a small nest in the willow tree. She watched from far away. A blue bird brought soft grass to the nest. Mina whispered, 'The bird is making a safe home.'" }];

export function nextQuestion(seed: number, subject: LearningSubject | "Mixed" = "Mixed", grade: LearningGrade = "K"): LearningQuestion {
  if (grade === "1") {
    if (subject === "ELA" || (subject === "Mixed" && seed % 2 === 0)) return { id: `g1-decode-${seed}`, templateId: "1.rf.3.silent-e-decode", standardId: "1.RF.3", subject: "ELA", grade, skill: "Silent-e decoding", prompt: "Which word has a long a sound?", audioText: "Which word has a long a sound?", choices: ["cap", "cape", "cat"], answer: "cape", explanation: "Cape ends with silent e, so the a says its name.", domain: "Reading foundational skills" };
    const tens = (seed % 8 + 2) * 10; return { id: `g1-tens-${seed}`, templateId: "1.nbt.b.2.tens-and-ones", standardId: "1.NBT.B.2", subject: "Math", grade, skill: "Tens and ones", prompt: `What number is ${tens} and 4 ones?`, audioText: `What number is ${tens} and 4 ones?`, choices: [String(tens + 4), String(tens + 40), String(tens - 4)], answer: String(tens + 4), explanation: `${tens} and 4 ones is ${tens + 4}.`, domain: "Number and operations in base ten", visual: `${tens / 10} tens + 4 ones` };
  }
  if (grade === "2") {
    if (subject === "ELA" || (subject === "Mixed" && seed % 3 === 0)) { const passage = originalPassages[0]; return { id: `g2-passage-${seed}`, templateId: "2.rl.1.passage-detail", standardId: "2.RL.1", subject: "ELA", grade, skill: "Find key details", prompt: "What did the blue bird bring to the nest?", audioText: "Listen to the passage. What did the blue bird bring to the nest?", choices: ["soft grass", "a red ball", "a sandwich"], answer: "soft grass", explanation: "The passage says the blue bird brought soft grass to the nest.", domain: "Reading literature", passage: passage.text }; }
    if (seed % 2 === 0) return { id: `g2-clock-${seed}`, templateId: "2.md.c.7.clock-time", standardId: "2.MD.C.7", subject: "Math", grade, skill: "Read a clock", prompt: "What time does this clock show?", audioText: "What time does this clock show?", choices: ["3:00", "3:05", "3:30"], answer: "3:05", explanation: "The minute hand is on the 1, so it is five minutes after 3.", domain: "Measurement and data", visual: "🕒 3:05" };
    return { id: `g2-money-${seed}`, templateId: "2.md.c.8.money-total", standardId: "2.MD.C.8", subject: "Math", grade, skill: "Count coins", prompt: "How much money is shown?", audioText: "How much money is shown?", choices: ["30¢", "25¢", "35¢"], answer: "30¢", explanation: "One quarter and one nickel equal 30 cents.", domain: "Measurement and data", visual: "25¢ + 5¢" };
  }
  const isEla = subject === "Mixed" ? seed % 2 === 0 : subject === "ELA";
  if (isEla) {
    const letters = [["B", "b"], ["M", "m"], ["T", "t"]] as const; const pair = pick(letters, seed); const rhymes = [["cat", "hat", "sun"], ["pig", "wig", "map"], ["bug", "rug", "pen"]] as const;
    if (seed % 3 === 0) return { id: `letter-${seed}`, templateId: "k.rf.1.d.letter-match", standardId: "K.RF.1.d", subject: "ELA", grade, skill: "Letter matching", prompt: `Which lowercase letter matches ${pair[0]}?`, audioText: `Which lowercase letter matches ${pair[0]}?`, choices: [pair[1], "n", "p"], answer: pair[1], explanation: `The matching lowercase letter is ${pair[1]}.`, domain: "Reading foundational skills" };
    const words = pick(rhymes, seed); return { id: `rhyme-${seed}`, templateId: "k.rf.2.a.rhyme", standardId: "K.RF.2.a", subject: "ELA", grade, skill: "Rhyming words", prompt: `Which word rhymes with ${words[0]}?`, audioText: `Which word rhymes with ${words[0]}?`, choices: [words[1], words[2], "dog"], answer: words[1], explanation: `${words[0]} rhymes with ${words[1]} because both words end with the same sound.`, domain: "Reading foundational skills" };
  }
  const start = (seed % 12) + 1; const answer = String(start + 1); return { id: `count-${seed}`, templateId: "k.cc.a.2.next-number", standardId: "K.CC.A.2", subject: "Math", grade, skill: "Continue counting", prompt: `What number comes after ${start}?`, audioText: `What number comes after ${start}?`, choices: [String(start), answer, String(start + 3)], answer, explanation: `${answer} comes after ${start}.`, domain: "Counting and cardinality" };
}
export function evaluateLearningAnswer(question: LearningQuestion, answer: string): boolean { return question.answer.trim().toLowerCase() === answer.trim().toLowerCase(); }
export function loadAttempts(): LearningAttempt[] { try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as LearningAttempt[]; } catch { return []; } }
export function saveAttempt(attempt: LearningAttempt): void { const all = loadAttempts(); if (all.some((item) => item.questionId === attempt.questionId)) return; localStorage.setItem(storageKey, JSON.stringify([...all, attempt])); }
