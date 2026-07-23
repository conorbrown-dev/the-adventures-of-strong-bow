export type CurriculumGrade = "K" | "GRADE_1" | "GRADE_2" | "GRADE_3" | "GRADE_4" | "GRADE_5";
export type CurriculumSubject = "ELA" | "MATH";

export interface CurriculumQuestion {
  prompt: string;
  choices: string[];
  answerIndex: number;
  standardCode: string;
}

export interface CurriculumQuiz {
  id: string;
  title: string;
  grade: CurriculumGrade;
  subject: CurriculumSubject;
  questions: CurriculumQuestion[];
}

const q = (prompt: string, choices: string[], answerIndex: number, standardCode: string): CurriculumQuestion => ({ prompt, choices, answerIndex, standardCode });

// Representative, teacher-friendly checks mapped to the official Common Core
// identifiers. More quizzes can be added to this catalogue without changing UI.
export const commonCoreQuizzes: CurriculumQuiz[] = [
  { id: "k-math-counting", title: "Kindergarten Counting", grade: "K", subject: "MATH", questions: [
    q("What number comes after 6?", ["5", "7", "8"], 1, "K.CC.A.2"), q("Which group has 5 stars?", ["★★★", "★★★★★", "★★★★★★"], 1, "K.CC.B.4"), q("2 apples and 1 apple make…", ["2", "3", "4"], 1, "K.OA.A.1") ] },
  { id: "k-ela-letters", title: "Kindergarten Letters & Stories", grade: "K", subject: "ELA", questions: [
    q("Which letter makes the /m/ sound?", ["m", "s", "t"], 0, "RF.K.3.A"), q("What is the first sound in sun?", ["/s/", "/n/", "/u/"], 0, "RF.K.2.D"), q("After listening to a story, what can you do?", ["Ask and answer questions about it", "Read only numbers", "Skip every page"], 0, "RL.K.1") ] },
  { id: "1-math-add-subtract", title: "Grade 1 Addition & Subtraction", grade: "GRADE_1", subject: "MATH", questions: [
    q("7 + 5 =", ["11", "12", "13"], 1, "1.OA.C.6"), q("14 − 6 =", ["8", "9", "10"], 0, "1.OA.C.6"), q("Which equation has a sum of 10?", ["4 + 5", "6 + 4", "8 + 3"], 1, "1.OA.A.1") ] },
  { id: "1-ela-phonics", title: "Grade 1 Phonics & Reading", grade: "GRADE_1", subject: "ELA", questions: [
    q("Which word has a short a sound?", ["cake", "cat", "rain"], 1, "RF.1.3.C"), q("What does a reader do to understand a story?", ["Ask and answer questions", "Guess every word", "Ignore the pictures and words"], 0, "RL.1.1"), q("Which is a complete sentence?", ["The dog ran.", "dog the ran", "ran dog the"], 0, "L.1.1") ] },
  { id: "2-math-place-value", title: "Grade 2 Place Value", grade: "GRADE_2", subject: "MATH", questions: [
    q("What is 36 + 27?", ["53", "63", "73"], 1, "2.NBT.B.5"), q("In 472, the 7 means…", ["7 ones", "7 tens", "7 hundreds"], 1, "2.NBT.A.1"), q("90 − 40 =", ["40", "50", "60"], 1, "2.NBT.B.5") ] },
  { id: "2-ela-reading", title: "Grade 2 Reading & Word Study", grade: "GRADE_2", subject: "ELA", questions: [
    q("What does the prefix re- mean in reread?", ["again", "before", "not"], 0, "RF.2.3.D"), q("A reader can show understanding by…", ["asking and answering questions", "only looking at the cover", "skipping the ending"], 0, "RI.2.1"), q("Which word means almost the same as happy?", ["glad", "sad", "slow"], 0, "L.2.5.B") ] },
  { id: "3-math-multiply", title: "Grade 3 Multiplication", grade: "GRADE_3", subject: "MATH", questions: [
    q("4 × 6 =", ["10", "20", "24"], 2, "3.OA.C.7"), q("24 ÷ 4 =", ["5", "6", "7"], 1, "3.OA.C.7"), q("There are 3 bags with 5 marbles each. How many marbles?", ["8", "15", "25"], 1, "3.OA.A.1") ] },
  { id: "3-ela-comprehension", title: "Grade 3 Comprehension", grade: "GRADE_3", subject: "ELA", questions: [
    q("Which detail best supports an answer about a story?", ["A detail from the text", "A random guess", "The book's color"], 0, "RL.3.1"), q("What can context clues help a reader find?", ["A word's meaning", "The page number only", "The author's address"], 0, "L.3.4"), q("The central message of a story is often called its…", ["lesson", "cover", "setting only"], 0, "RL.3.2") ] },
  { id: "4-math-multidigit", title: "Grade 4 Multi-Digit Math", grade: "GRADE_4", subject: "MATH", questions: [
    q("3,406 + 1,208 =", ["4,514", "4,614", "5,614"], 1, "4.NBT.B.4"), q("Which number is greatest?", ["6,305", "6,350", "6,035"], 1, "4.NBT.A.2"), q("18 × 4 =", ["62", "72", "82"], 1, "4.NBT.B.5") ] },
  { id: "4-ela-information", title: "Grade 4 Informational Reading", grade: "GRADE_4", subject: "ELA", questions: [
    q("What is a summary?", ["The main ideas and key details", "Every word copied", "Only a title"], 0, "RI.4.2"), q("What can a glossary help explain?", ["Important words", "The weather", "A character's voice"], 0, "RI.4.4"), q("Good evidence for an answer comes from…", ["the text", "a guess", "a different book"], 0, "RI.4.1") ] },
  { id: "5-math-decimals", title: "Grade 5 Decimals", grade: "GRADE_5", subject: "MATH", questions: [
    q("3.4 + 0.6 =", ["3.10", "4.0", "4.6"], 1, "5.NBT.B.7"), q("Which is greater?", ["0.8", "0.08", "They are equal"], 0, "5.NBT.A.3"), q("5.0 − 1.7 =", ["3.3", "4.3", "3.7"], 0, "5.NBT.B.7") ] },
  { id: "5-ela-evidence", title: "Grade 5 Reading Evidence", grade: "GRADE_5", subject: "ELA", questions: [
    q("What should support an answer about a text?", ["Accurate quotations or details", "Only an opinion", "A made-up ending"], 0, "RI.5.1"), q("How can context help with an unknown word?", ["Nearby words give clues", "It changes the alphabet", "It removes punctuation"], 0, "L.5.4"), q("A theme is…", ["a message or lesson", "the page number", "the author's signature"], 0, "RL.5.2") ] }
];

export const gradeLabel = (grade: CurriculumGrade): string => grade === "K" ? "Kindergarten" : `Grade ${grade.replace("GRADE_", "")}`;
