export type CurriculumGrade = "K" | "GRADE_1" | "GRADE_2" | "GRADE_3" | "GRADE_4" | "GRADE_5";
export type CurriculumSubject = "ELA" | "MATH";

export interface CurriculumQuestion {
  prompt: string;
  choices: string[];
  answerIndex: number;
  standardCode: string;
  acceptedAnswers: string[];
}

export interface CurriculumQuiz {
  id: string;
  title: string;
  grade: CurriculumGrade;
  subject: CurriculumSubject;
  lesson: { title: string; explanation: string; keyIdea: string };
  questions: CurriculumQuestion[];
}

const q = (prompt: string, choices: string[], answerIndex: number, standardCode: string, acceptedAnswers?: string[]): CurriculumQuestion => ({ prompt, choices, answerIndex, standardCode, acceptedAnswers: acceptedAnswers ?? [choices[answerIndex]] });

// Representative, teacher-friendly checks mapped to the official Common Core
// identifiers. More quizzes can be added to this catalogue without changing UI.
export const commonCoreQuizzes: CurriculumQuiz[] = [
  { id: "k-math-counting", title: "Kindergarten Counting", grade: "K", subject: "MATH", lesson: { title: "Counting tells how many", explanation: "When we count objects, we say one number for each object. The last number we say tells how many there are. Numbers also come in order: after six comes seven.", keyIdea: "Count one object at a time, and remember the number that comes next." }, questions: [
    q("What number comes after 6?", ["5", "7", "8"], 1, "K.CC.A.2", ["seven", "7"]), q("How many stars are in this group? Five stars.", ["★★★", "★★★★★", "★★★★★★"], 1, "K.CC.B.4", ["five", "5", "five stars"]), q("2 apples and 1 apple make…", ["2", "3", "4"], 1, "K.OA.A.1", ["three", "3"]) ] },
  { id: "k-ela-letters", title: "Kindergarten Letters & Stories", grade: "K", subject: "ELA", lesson: { title: "Letters, sounds, and stories", explanation: "Letters stand for sounds. The letter M makes the mmm sound at the beginning of moon. Good readers also think and talk about a story by asking questions about what happened.", keyIdea: "Listen for the first sound, then talk about the story." }, questions: [
    q("Which letter makes the /m/ sound?", ["m", "s", "t"], 0, "RF.K.3.A"), q("What is the first sound in sun?", ["/s/", "/n/", "/u/"], 0, "RF.K.2.D"), q("After listening to a story, what can you do?", ["Ask and answer questions about it", "Read only numbers", "Skip every page"], 0, "RL.K.1") ] },
  { id: "1-math-add-subtract", title: "Grade 1 Addition & Subtraction", grade: "GRADE_1", subject: "MATH", lesson: { title: "Putting together and taking apart", explanation: "Addition puts amounts together to find a total. Subtraction takes an amount away to find what is left. You can count on, draw pictures, or use facts you know.", keyIdea: "Plus means put together; minus means take away." }, questions: [
    q("7 + 5 =", ["11", "12", "13"], 1, "1.OA.C.6"), q("14 − 6 =", ["8", "9", "10"], 0, "1.OA.C.6"), q("Which equation has a sum of 10?", ["4 + 5", "6 + 4", "8 + 3"], 1, "1.OA.A.1") ] },
  { id: "1-ela-phonics", title: "Grade 1 Phonics & Reading", grade: "GRADE_1", subject: "ELA", lesson: { title: "Sounds make words", explanation: "A short vowel is the quick vowel sound in the middle of a word like cat. Readers ask questions to understand what they read. A complete sentence tells a whole thought.", keyIdea: "Listen to every sound and look for a whole thought." }, questions: [
    q("Which word has a short a sound?", ["cake", "cat", "rain"], 1, "RF.1.3.C"), q("What does a reader do to understand a story?", ["Ask and answer questions", "Guess every word", "Ignore the pictures and words"], 0, "RL.1.1"), q("Which is a complete sentence?", ["The dog ran.", "dog the ran", "ran dog the"], 0, "L.1.1") ] },
  { id: "2-math-place-value", title: "Grade 2 Place Value", grade: "GRADE_2", subject: "MATH", lesson: { title: "Tens and ones", explanation: "In a two-digit number, the digit on the left tells the tens and the digit on the right tells the ones. We can add and subtract by using place value.", keyIdea: "A digit has a value based on its place." }, questions: [
    q("What is 36 + 27?", ["53", "63", "73"], 1, "2.NBT.B.5"), q("In 472, the 7 means…", ["7 ones", "7 tens", "7 hundreds"], 1, "2.NBT.A.1"), q("90 − 40 =", ["40", "50", "60"], 1, "2.NBT.B.5") ] },
  { id: "2-ela-reading", title: "Grade 2 Reading & Word Study", grade: "GRADE_2", subject: "ELA", lesson: { title: "Words and meaning", explanation: "A prefix is a word part added to the beginning of a word. Readers ask questions about a text and use context clues to understand unfamiliar words.", keyIdea: "Look at word parts and nearby words for clues." }, questions: [
    q("What does the prefix re- mean in reread?", ["again", "before", "not"], 0, "RF.2.3.D"), q("A reader can show understanding by…", ["asking and answering questions", "only looking at the cover", "skipping the ending"], 0, "RI.2.1"), q("Which word means almost the same as happy?", ["glad", "sad", "slow"], 0, "L.2.5.B") ] },
  { id: "3-math-multiply", title: "Grade 3 Multiplication", grade: "GRADE_3", subject: "MATH", lesson: { title: "Equal groups", explanation: "Multiplication finds the total in equal groups. Division shares a total into equal groups. Multiplication and division are connected.", keyIdea: "Groups times how many in each group equals the total." }, questions: [
    q("4 × 6 =", ["10", "20", "24"], 2, "3.OA.C.7"), q("24 ÷ 4 =", ["5", "6", "7"], 1, "3.OA.C.7"), q("There are 3 bags with 5 marbles each. How many marbles?", ["8", "15", "25"], 1, "3.OA.A.1") ] },
  { id: "3-ela-comprehension", title: "Grade 3 Comprehension", grade: "GRADE_3", subject: "ELA", lesson: { title: "Reading for evidence", explanation: "Strong readers answer questions with details from the text. Context clues are words around an unfamiliar word that help explain it. A story can also teach a lesson.", keyIdea: "Use text details to explain your thinking." }, questions: [
    q("Which detail best supports an answer about a story?", ["A detail from the text", "A random guess", "The book's color"], 0, "RL.3.1"), q("What can context clues help a reader find?", ["A word's meaning", "The page number only", "The author's address"], 0, "L.3.4"), q("The central message of a story is often called its…", ["lesson", "cover", "setting only"], 0, "RL.3.2") ] },
  { id: "4-math-multidigit", title: "Grade 4 Multi-Digit Math", grade: "GRADE_4", subject: "MATH", lesson: { title: "Working with large numbers", explanation: "Place value helps us compare and calculate with larger numbers. Line up digits by place when adding or subtracting. Multiplication can be broken into smaller, easier parts.", keyIdea: "Keep ones, tens, hundreds, and thousands in their correct places." }, questions: [
    q("3,406 + 1,208 =", ["4,514", "4,614", "5,614"], 1, "4.NBT.B.4"), q("Which number is greatest?", ["6,305", "6,350", "6,035"], 1, "4.NBT.A.2"), q("18 × 4 =", ["62", "72", "82"], 1, "4.NBT.B.5") ] },
  { id: "4-ela-information", title: "Grade 4 Informational Reading", grade: "GRADE_4", subject: "ELA", lesson: { title: "Finding important information", explanation: "A summary gives the main ideas and key details in fewer words. A glossary explains important words. Good answers use evidence from the text.", keyIdea: "Find the main idea, important details, and evidence." }, questions: [
    q("What is a summary?", ["The main ideas and key details", "Every word copied", "Only a title"], 0, "RI.4.2"), q("What can a glossary help explain?", ["Important words", "The weather", "A character's voice"], 0, "RI.4.4"), q("Good evidence for an answer comes from…", ["the text", "a guess", "a different book"], 0, "RI.4.1") ] },
  { id: "5-math-decimals", title: "Grade 5 Decimals", grade: "GRADE_5", subject: "MATH", lesson: { title: "Understanding decimals", explanation: "Decimals use place value too. Tenths are the first place after the decimal point, and hundredths are the next place. Line up decimal points when adding and subtracting.", keyIdea: "Compare digits in the same decimal place." }, questions: [
    q("3.4 + 0.6 =", ["3.10", "4.0", "4.6"], 1, "5.NBT.B.7"), q("Which is greater?", ["0.8", "0.08", "They are equal"], 0, "5.NBT.A.3"), q("5.0 − 1.7 =", ["3.3", "4.3", "3.7"], 0, "5.NBT.B.7") ] },
  { id: "5-ela-evidence", title: "Grade 5 Reading Evidence", grade: "GRADE_5", subject: "ELA", lesson: { title: "Explaining ideas with evidence", explanation: "Readers support answers by quoting or accurately referring to the text. Context clues help explain unknown words. A theme is a message or lesson that grows across a story.", keyIdea: "Use accurate details from the text to support your answer." }, questions: [
    q("What should support an answer about a text?", ["Accurate quotations or details", "Only an opinion", "A made-up ending"], 0, "RI.5.1"), q("How can context help with an unknown word?", ["Nearby words give clues", "It changes the alphabet", "It removes punctuation"], 0, "L.5.4"), q("A theme is…", ["a message or lesson", "the page number", "the author's signature"], 0, "RL.5.2") ] }
];

export const gradeLabel = (grade: CurriculumGrade): string => grade === "K" ? "Kindergarten" : `Grade ${grade.replace("GRADE_", "")}`;
