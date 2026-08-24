import type { QuestionInstance, QuestionTemplate } from "../domain/question-template";

class Random {
  private state: number;
  constructor(seed: string | number) { this.state = 2166136261; for (const char of String(seed)) this.state = Math.imul(this.state ^ char.charCodeAt(0), 16777619); }
  next(): number { this.state += 0x6D2B79F5; let value = this.state; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; }
  integer(minimum: number, maximum: number): number { return minimum + Math.floor(this.next() * (maximum - minimum + 1)); }
  shuffle<T>(items: T[]): T[] { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = this.integer(0, i); [result[i], result[j]] = [result[j], result[i]]; } return result; }
}

const wordFamilies: Record<string, string[]> = { "-at": ["cat", "bat", "hat"], "-an": ["can", "fan", "man"], "-ig": ["pig", "dig", "wig"], "-op": ["hop", "mop", "top"], "-ug": ["bug", "hug", "rug"] };
const cvcWords = [{ word: "cat", vowel: "a" }, { word: "bed", vowel: "e" }, { word: "pig", vowel: "i" }, { word: "hop", vowel: "o" }, { word: "sun", vowel: "u" }];
const silentEPairs = [{ short: "cap", long: "cape" }, { short: "kit", long: "kite" }, { short: "hop", long: "hope" }, { short: "tub", long: "tube" }];
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const params = (template: QuestionTemplate) => template.generator.parameters as Record<string, unknown>;
const numberParam = (values: Record<string, unknown>, key: string) => Number(values[key]);
const text = (template: QuestionTemplate, values: Record<string, string | number>) => template.prompt.text.replace(/{{(.*?)}}/g, (_, key: string) => String(values[key] ?? ""));
const audioText = (template: QuestionTemplate, values: Record<string, string | number>) => template.prompt.audioText?.replace(/{{(.*?)}}/g, (_, key: string) => String(values[key] ?? "")) ?? null;
const choiceInteraction = (choices: Array<string | number>) => ({ kind: "choices", choices: choices.map((value) => ({ id: String(value), label: String(value) })) });

export function generateQuestion(template: QuestionTemplate, seed: string | number): QuestionInstance {
  const random = new Random(seed); const configuration = params(template);
  let interaction: Record<string, unknown>; let canonicalAnswer: unknown; let values: Record<string, string | number> = {}; let explanation: string;
  if (template.generator.kind === "nextNumber") {
    const min = numberParam(configuration, "minimum"); const max = numberParam(configuration, "maximum"); const count = numberParam(configuration, "choiceCount");
    const start = random.integer(min, max - 1); const answer = start + 1; const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index).filter((value) => value !== answer);
    const choices = random.shuffle([answer, ...random.shuffle(pool).slice(0, count - 1)]); interaction = choiceInteraction(choices); canonicalAnswer = answer; values = { start }; explanation = `${answer} comes after ${start}.`;
  } else if (template.generator.kind === "countVisualObjects") {
    const min = numberParam(configuration, "minimum"); const max = numberParam(configuration, "maximum"); const count = numberParam(configuration, "choiceCount"); const answer = random.integer(min, max);
    const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index).filter((value) => value !== answer);
    interaction = { ...choiceInteraction(random.shuffle([answer, ...random.shuffle(pool).slice(0, count - 1)])), visual: { objectKey: String(configuration.objectKey), count: answer } }; canonicalAnswer = answer; explanation = `There are ${answer} objects.`;
  } else if (template.generator.kind === "matchUpperLowerLetters") {
    const pairCount = numberParam(configuration, "pairCount"); const selected = random.shuffle(letters).slice(0, pairCount); const lower = random.shuffle(selected.map((letter) => letter.toLowerCase()));
    interaction = template.responseType === "classification" ? { kind: "classification", items: random.shuffle([...selected, ...lower]), categories: ["uppercase", "lowercase"], target: { uppercase: selected, lowercase: lower } } : { kind: "matching", left: selected, right: lower, target: { uppercase: selected, lowercase: lower } };
    canonicalAnswer = template.responseType === "classification" ? Object.fromEntries([...selected.map((letter) => [letter, "uppercase"]), ...lower.map((letter) => [letter, "lowercase"])]) : Object.fromEntries(selected.map((letter) => [letter, letter.toLowerCase()])); explanation = "Each uppercase letter matches the same lowercase letter.";
  } else if (template.generator.kind === "rhymeChoice") {
    const families = configuration.wordFamilies as string[]; const family = families[random.integer(0, families.length - 1)]; const words = wordFamilies[family]; const targetWord = words[random.integer(0, words.length - 1)]; const answer = words.find((word) => word !== targetWord)!; const distractors = Object.entries(wordFamilies).filter(([key]) => key !== family).flatMap(([, wordsForFamily]) => wordsForFamily);
    const count = numberParam(configuration, "choiceCount"); interaction = choiceInteraction(random.shuffle([answer, ...random.shuffle(distractors).slice(0, count - 1)])); canonicalAnswer = answer; values = { targetWord }; explanation = `${targetWord} and ${answer} end with the same sound.`;
  } else if (template.generator.kind === "cvcMedialVowel") {
    const allowed = configuration.vowels as string[]; const candidates = cvcWords.filter((candidate) => allowed.includes(candidate.vowel)); const picked = candidates[random.integer(0, candidates.length - 1)]; const count = numberParam(configuration, "choiceCount");
    interaction = choiceInteraction(random.shuffle([picked.vowel, ...random.shuffle(allowed.filter((vowel) => vowel !== picked.vowel)).slice(0, count - 1)])); canonicalAnswer = picked.vowel; values = { word: picked.word }; explanation = `The middle vowel in ${picked.word} is ${picked.vowel}.`;
  } else if (template.generator.kind === "silentEDecode") {
    const picked = silentEPairs[random.integer(0, silentEPairs.length - 1)]; const distractors = random.shuffle(silentEPairs.filter((pair) => pair.long !== picked.long).map((pair) => pair.short)).slice(0, 2);
    interaction = choiceInteraction(random.shuffle([picked.long, ...distractors])); canonicalAnswer = picked.long; values = { shortWord: picked.short }; explanation = `${picked.long} ends with a silent e, which makes the vowel say its name.`;
  } else if (template.generator.kind === "placeValueConstruction") {
    const tens = random.integer(1, 9); const ones = random.integer(0, 9); const answer = tens * 10 + ones;
    const choices = [answer, answer + 10 <= 99 ? answer + 10 : answer - 10, tens * 10 + ((ones + 1) % 10)];
    interaction = choiceInteraction(random.shuffle(choices)); canonicalAnswer = answer; values = { tens, ones }; explanation = `${tens} tens and ${ones} ones make ${answer}.`;
  } else if (template.generator.kind === "gradeOneMath") {
    const skill = String(configuration.skill); let answer: string | number; let choices: Array<string | number>;
    if (skill === "1.OA.A.1") { const left = random.integer(3, 10); const right = random.integer(2, 9); answer = left + right; choices = [answer, answer - 1, answer + 1]; values = { question: `Molly has ${left} shells and finds ${right} more. How many shells does she have?` }; explanation = `${left} plus ${right} equals ${answer}.`; }
    else if (skill === "1.OA.A.2") { const first = random.integer(1, 6); const second = random.integer(1, 6); const third = random.integer(1, 6); answer = first + second + third; choices = [answer, answer - 1, answer + 1]; values = { question: `What is ${first} plus ${second} plus ${third}?` }; explanation = `${first} + ${second} + ${third} = ${answer}.`; }
    else if (skill === "1.OA.B.3") { const left = random.integer(2, 8); const candidate = random.integer(2, 7); const right = candidate >= left ? candidate + 1 : candidate; answer = `${right} + ${left} = ${left + right}`; choices = [answer, `${left} + ${right} = ${left + right + 1}`, `${right} + ${left} = ${left + right - 1}`]; values = { question: `If ${left} plus ${right} equals ${left + right}, which fact is also true?` }; explanation = `Changing the order of addends keeps the sum the same.`; }
    else if (skill === "1.OA.B.4" || skill === "1.OA.D.8") { const total = random.integer(10, 18); const known = random.integer(2, total - 2); answer = total - known; choices = [answer, answer - 1, answer + 1]; values = { question: `What number makes ${known} plus blank equal ${total}?` }; explanation = `${known} plus ${answer} equals ${total}.`; }
    else if (skill === "1.OA.C.5") { const start = random.integer(5, 15); answer = start + 2; choices = [answer, start + 1, start + 3]; values = { question: `Count on 2 from ${start}. What number do you say?` }; explanation = `${start}, ${start + 1}, ${answer}.`; }
    else if (skill === "1.OA.C.6") { const left = random.integer(3, 10); const right = random.integer(2, 10); answer = left + right; choices = [answer, answer - 1, answer + 1]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`; }
    else if (skill === "1.OA.D.7") { const left = random.integer(3, 9); const right = random.integer(1, 5); const isTrue = random.integer(0, 1) === 1; answer = isTrue ? "true" : "false"; choices = ["true", "false"]; values = { question: `Is the equation ${left} plus ${right} equals ${isTrue ? left + right : left + right + 1} true or false?` }; explanation = `The equation is ${answer}.`; }
    else if (skill === "1.NBT.A.1") { const start = random.integer(20, 115); answer = start + 1; choices = [answer, start - 1, start + 2]; values = { question: `What number comes after ${start}?` }; explanation = `${answer} comes after ${start}.`; }
    else if (skill === "1.NBT.B.2.a") { answer = 10; choices = [10, 1, 100]; values = { question: `How many ones make one ten?` }; explanation = `Ten ones make one ten.`; }
    else if (skill === "1.NBT.B.2.b") { const ones = random.integer(1, 9); answer = 10 + ones; choices = [answer, ones, 20 + ones]; values = { question: `What number is one ten and ${ones} ones?` }; explanation = `One ten and ${ones} ones is ${answer}.`; }
    else if (skill === "1.NBT.B.2.c") { const tens = random.integer(2, 9); answer = tens * 10; choices = [answer, tens, answer + 1]; values = { question: `What number is ${tens} tens and zero ones?` }; explanation = `${tens} tens is ${answer}.`; }
    else if (skill === "1.NBT.B.3") { const left = random.integer(20, 89); const right = left + random.integer(1, 9); answer = "less than"; choices = ["less than", "greater than", "equal to"]; values = { question: `Is ${left} less than, greater than, or equal to ${right}?` }; explanation = `${left} is less than ${right}.`; }
    else if (skill === "1.NBT.C.4") { const left = random.integer(20, 70); const right = random.integer(1, 9); answer = left + right; choices = [answer, answer - 10, answer + 10]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`; }
    else if (skill === "1.NBT.C.5") { const number = random.integer(20, 89); answer = number + 10; choices = [answer, number - 10, number + 1]; values = { question: `What is 10 more than ${number}?` }; explanation = `Ten more than ${number} is ${answer}.`; }
    else if (skill === "1.NBT.C.6") { const left = random.integer(2, 9) * 10; const right = random.integer(1, Math.floor(left / 10) - 1) * 10; answer = left - right; choices = [answer, answer + 10, answer - 10]; values = { question: `What is ${left} minus ${right}?` }; explanation = `${left} minus ${right} equals ${answer}.`; }
    else if (skill === "1.MD.A.1") { answer = "the ribbon"; choices = [answer, "the pencil", "they are the same length"]; values = { question: `A ribbon is 8 cubes long. A pencil is 5 cubes long. Which is longer?` }; explanation = `The ribbon is longer because 8 cubes is more than 5 cubes.`; }
    else if (skill === "1.MD.A.2") { const length = random.integer(4, 12); answer = length; choices = [answer, answer - 1, answer + 1]; values = { question: `A crayon is ${length} cubes long. How many cubes long is it?` }; explanation = `The crayon measures ${length} cubes.`; }
    else if (skill === "1.MD.B.3") { const hour = random.integer(1, 12); answer = `${hour}:30`; choices = [answer, `${hour}:00`, `${hour === 12 ? 1 : hour + 1}:00`]; values = { question: `The minute hand points to 6 and the hour hand is between ${hour} and ${hour === 12 ? 1 : hour + 1}. What time is it?` }; explanation = `That is ${answer}.`; }
    else if (skill === "1.MD.C.4") { const cats = random.integer(3, 9); const dogs = random.integer(1, cats - 1); answer = cats - dogs; choices = [answer, answer - 1, answer + 1]; values = { question: `A chart shows ${cats} cats and ${dogs} dogs. How many more cats than dogs are there?` }; explanation = `${cats} minus ${dogs} equals ${answer}.`; }
    else if (skill === "1.G.A.1") { answer = "three sides"; choices = ["three sides", "four sides", "no sides"]; values = { question: `Which is a defining attribute of a triangle?` }; explanation = `Every triangle has three sides.`; }
    else if (skill === "1.G.A.2") { answer = "a rectangle"; choices = ["a rectangle", "a circle", "a cone"]; values = { question: `Two same-size squares are put side by side. What shape can they make?` }; explanation = `Two same-size squares can make a rectangle.`; }
    else { answer = "fourths"; choices = ["halves", "fourths", "thirds"]; values = { question: `A rectangle is split into 4 equal parts. What are the parts called?` }; explanation = `Four equal parts are fourths, also called quarters.`; }
    interaction = choiceInteraction(random.shuffle(choices)); canonicalAnswer = answer;
  } else if (template.generator.kind === "gradeOneElaAdult") {
    const skill = String(configuration.skill);
    const prompts: Record<string, string> = {
      "1.L.1.a": "Write the uppercase and lowercase letters A through F.", "1.L.1.j": "Say a complete sentence about your favorite animal.", "1.L.2.e": "Write the word you hear: splat.", "1.L.5.c": "Tell about a place at home that feels cozy.",
      "1.RF.4.a": "Read this sentence and tell what it means: The rabbit hops over the log.", "1.RF.4.b": "Read this sentence aloud smoothly: The little bird sings in the green tree.", "1.RF.4.c": "Read this sentence. If a word does not make sense, try it again: The cat naps on the mat.", "1.RI.10": "Listen to or read a short informational book chosen by the adult. Tell one fact you learned.", "1.RL.10": "Listen to or read a short story chosen by the adult. Tell what happened.",
      "1.SL.1.a": "Practice a short conversation with the adult. Take turns speaking and listening.", "1.SL.1.b": "Listen to the adult's idea about a pet. Respond with a connected idea of your own.", "1.SL.1.c": "Ask the adult a question to learn more about something they said.", "1.SL.2": "After the adult reads a short passage, answer a question about a detail.", "1.SL.3": "Listen to the adult describe an object. Ask a question if something is unclear.", "1.SL.4": "Describe a favorite place using clear details.", "1.SL.5": "Draw a picture to help explain something you are describing.", "1.SL.6": "Answer the adult using a complete sentence.",
      "1.W.1": "Write an opinion about a favorite food. Give a reason and an ending.", "1.W.2": "Write facts about an animal. Include a topic and an ending.", "1.W.3": "Write about two things that happened in order. Use a time word and an ending.", "1.W.5": "Improve your writing by adding one helpful detail after the adult gives feedback.", "1.W.6": "Use a digital tool with the adult to publish a short piece of writing.", "1.W.7": "Help gather facts from books about an animal, then help write a shared page.", "1.W.8": "Use an experience or a source the adult gives you to answer a question."
    };
    canonicalAnswer = null; interaction = { kind: "adultScored", target: { standardId: skill } }; values = { question: prompts[skill] ?? "Complete the activity with an adult." }; explanation = "Your adult will decide whether this skill was demonstrated.";
  } else if (template.generator.kind === "gradeOneEla") {
    const skill = String(configuration.skill); let answer: string; let choices: string[];
    if (skill === "1.L.1.b") { const words = [["dog", "run", "blue"], ["teacher", "jump", "quickly"]][random.integer(0, 1)]; answer = words[0]; choices = words; values = { question: "Which word is a noun?" }; explanation = `${answer} names a person, place, thing, or animal.`; }
    else if (skill === "1.L.1.c") { const rows = [["The dogs run.", "The dogs runs.", "The dogs running."], ["The bird flies.", "The bird fly.", "The bird flying."]][random.integer(0, 1)]; answer = rows[0]; choices = rows; values = { question: "Which sentence has a noun and verb that agree?" }; explanation = `The subject and verb match in “${answer}”`; }
    else if (skill === "1.L.1.d") { const rows = [["She", "Book", "Jump"], ["They", "Green", "Table"]][random.integer(0, 1)]; answer = rows[0]; choices = rows; values = { question: "Which word can take the place of a noun?" }; explanation = `${answer} is a pronoun.`; }
    else if (skill === "1.L.1.e") { const rows = [["Yesterday I walked home.", "Yesterday I walk home.", "Yesterday I will walk home."], ["Tomorrow we will play.", "Tomorrow we played.", "Tomorrow we play."]][random.integer(0, 1)]; answer = rows[0]; choices = rows; values = { question: "Which sentence uses the correct verb time word?" }; explanation = `“${answer}” tells when the action happens.`; }
    else if (skill === "1.L.1.f") { const rows = [["soft", "jump", "cat"], ["tiny", "run", "school"]][random.integer(0, 1)]; answer = rows[0]; choices = rows; values = { question: "Which word describes a noun?" }; explanation = `${answer} is an adjective because it describes.`; }
    else if (skill === "1.L.1.g" || skill === "1.L.6") { const rows = [["because", "purple", "under"], ["but", "happy", "near"]][random.integer(0, 1)]; answer = rows[0]; choices = rows; values = { question: "Which word can join ideas in a sentence?" }; explanation = `${answer} is a conjunction.`; }
    else if (skill === "1.L.1.h") { answer = "those"; choices = ["those", "quickly", "because"]; values = { question: "Which word can come before a noun to point to it?" }; explanation = `“Those” is a determiner.`; }
    else if (skill === "1.L.1.i") { const rows = [["under", "and", "yellow"], ["between", "but", "happy"]][random.integer(0, 1)]; answer = rows[0]; choices = rows; values = { question: "Which word tells where something is?" }; explanation = `${answer} is a preposition.`; }
    else if (skill === "1.L.2.a") { answer = "Molly and Texas are capitalized."; choices = [answer, "Only Molly is capitalized.", "Neither name is capitalized."]; values = { question: "In the sentence Molly went to Texas, which names need capital letters?" }; explanation = `Names of people and places begin with capital letters.`; }
    else if (skill === "1.L.2.b") { answer = "Where is my hat?"; choices = [answer, "Where is my hat.", "Where is my hat!"]; values = { question: "Which sentence ends with the correct punctuation?" }; explanation = `Questions end with a question mark.`; }
    else if (skill === "1.L.2.c") { answer = "I packed apples, cheese, and crackers."; choices = [answer, "I packed apples cheese and crackers.", "I packed apples cheese, and crackers."]; values = { question: "Which sentence uses commas correctly in a list?" }; explanation = `Commas separate items in a list.`; }
    else if (skill === "1.L.2.d") {
      const item = [
        { question: "Which word begins with the /sh/ sound?", answer: "ship", choices: ["ship", "sip", "tip"], explanation: "Ship begins with sh, which spells the /sh/ sound." },
        { question: "Which word has the long a sound spelled ai?", answer: "rain", choices: ["rain", "ran", "run"], explanation: "The letters ai in rain spell the long a sound." }
      ][random.integer(0, 1)];
      answer = item.answer; choices = item.choices; values = { question: item.question }; explanation = item.explanation;
    }
    else if (skill === "1.L.4.a") { answer = "cold"; choices = [answer, "loud", "hungry"]; values = { question: "Maya put on her coat because the air felt chilly. What does chilly mean?" }; explanation = `A coat is worn when it is cold.`; }
    else if (skill === "1.L.4.b") { answer = "again"; choices = [answer, "before", "not"]; values = { question: "In the word redo, what does re mean?" }; explanation = `The prefix re means again.`; }
    else if (skill === "1.L.4.c") { answer = "looked"; choices = [answer, "book", "quick"]; values = { question: "Which word is a form of the root word look?" }; explanation = `Looked is look with an ending added.`; }
    else if (skill === "1.L.5.a") { answer = "a shirt"; choices = [answer, "a banana", "a shovel"]; values = { question: "Which item belongs in the clothing category?" }; explanation = `A shirt is clothing.`; }
    else if (skill === "1.L.5.b") { answer = "A duck is a bird that swims."; choices = [answer, "A duck is very.", "A duck is because."]; values = { question: "Which sentence defines a duck by its category and an attribute?" }; explanation = `It tells what a duck is and something it does.`; }
    else if (skill === "1.L.5.d") { answer = "gigantic"; choices = [answer, "big", "tiny"]; values = { question: "Which word means very large?" }; explanation = `Gigantic means extremely large.`; }
    else if (skill === "1.RF.1.a") { answer = "The first word starts with a capital letter."; choices = [answer, "Every word starts with a capital letter.", "Sentences never use punctuation."]; values = { question: "Which statement is true about a sentence?" }; explanation = `A sentence begins with a capital letter.`; }
    else if (skill === "1.RF.2.a") { answer = "long a"; choices = [answer, "short a", "long e"]; values = { question: "What vowel sound do you hear in cake?" }; explanation = `The a in cake says its name: long a.`; }
    else if (skill === "1.RF.2.b") { answer = "stop"; choices = [answer, "tops", "pots"]; values = { question: "Blend these sounds: s, t, o, p. What word do they make?" }; explanation = `The sounds blend to make stop.`; }
    else if (skill === "1.RF.2.c") { answer = "m"; choices = [answer, "a", "p"]; values = { question: "What is the first sound in map?" }; explanation = `Map begins with the /m/ sound.`; }
    else if (skill === "1.RF.2.d") { answer = "s, u, n"; choices = [answer, "s, n, u", "u, s, n"]; values = { question: "Which sounds do you hear in sun, in order?" }; explanation = `Sun has the sounds /s/, /u/, /n/.`; }
    else if (skill === "1.RF.3.a") { answer = "sh"; choices = [answer, "ch", "th"]; values = { question: "Which letters spell the first sound in ship?" }; explanation = `The letters sh spell the first sound in ship.`; }
    else if (skill === "1.RF.3.b") { answer = "camp"; choices = [answer, "cap", "can"]; values = { question: "Which word says /k/ /a/ /m/ /p/?" }; explanation = `The sounds blend to make camp.`; }
    else if (skill === "1.RF.3.c") { answer = "boat"; choices = [answer, "bot", "bat"]; values = { question: "Which word has a vowel team that makes a long vowel sound?" }; explanation = `The oa in boat makes a long o sound.`; }
    else if (skill === "1.RF.3.d") { answer = "2"; choices = [answer, "1", "3"]; values = { question: "How many syllables are in robot?" }; explanation = `Ro-bot has two syllables.`; }
    else if (skill === "1.RF.3.e") { answer = "sunset"; choices = [answer, "sun", "set"]; values = { question: "Which word has two syllables?" }; explanation = `Sun-set has two syllables.`; }
    else if (skill === "1.RF.3.f") { answer = "jumped"; choices = [answer, "jump", "jumper"]; values = { question: "Which word tells that jumping happened in the past?" }; explanation = `The ending ed tells that it happened in the past.`; }
    else if (skill === "1.RF.3.g") { answer = "said"; choices = [answer, "sad", "sand"]; values = { question: "Which is an irregular word that you need to remember?" }; explanation = `Said does not sound exactly like it is spelled.`; }
    else {
      const comprehension: Record<string, { question: string; answer: string; choices: string[]; explanation: string }> = {
        "1.RI.1": { question: "Read: Bees visit flowers to collect nectar. What do bees collect?", answer: "nectar", choices: ["nectar", "snow", "sand"], explanation: "The text says bees collect nectar." },
        "1.RI.2": { question: "Read: Frogs begin as tadpoles. Later they grow legs and become frogs. What is this text mostly about?", answer: "how frogs grow", choices: ["how frogs grow", "how to draw frogs", "where frogs sleep"], explanation: "Both details tell about a frog growing." },
        "1.RI.3": { question: "Read: First, Lena plants a seed. Then she waters it. What happened after Lena planted the seed?", answer: "She watered it.", choices: ["She watered it.", "She picked a flower.", "She ate a seed."], explanation: "The text says she watered the seed next." },
        "1.RI.4": { question: "Read: The desert is dry, so it does not get much rain. What does dry mean?", answer: "not wet", choices: ["not wet", "very noisy", "full of trees"], explanation: "Not getting much rain means it is not wet." },
        "1.RI.5": { question: "Where would you look in a book to find the page number for a chapter?", answer: "the table of contents", choices: ["the table of contents", "the back cover", "the author name"], explanation: "A table of contents lists chapters and page numbers." },
        "1.RI.6": { question: "A caption says, “A fox runs.” A picture shows a red fox in snow. What information comes from the picture?", answer: "The fox is red and in snow.", choices: ["The fox is red and in snow.", "The fox can run.", "The animal is named a fox."], explanation: "The color and snow are shown in the picture." },
        "1.RI.7": { question: "Read: Penguins use their flippers to swim. A picture shows a penguin underwater. What does the picture help you understand?", answer: "Penguins swim underwater.", choices: ["Penguins swim underwater.", "Penguins fly in trees.", "Penguins live in deserts."], explanation: "The picture shows the penguin swimming." },
        "1.RI.8": { question: "Read: Mia says we should recycle because it keeps trash out of parks. Why does Mia think we should recycle?", answer: "It keeps parks cleaner.", choices: ["It keeps parks cleaner.", "It makes more trash.", "It stops the rain."], explanation: "Mia gives keeping trash out of parks as her reason." },
        "1.RI.9": { question: "One book says apples grow on trees. Another says apples can be red or green. What do both books tell about?", answer: "apples", choices: ["apples", "trains", "clouds"], explanation: "Both texts give information about apples." },
        "1.RL.1": { question: "Read: Sam lost his mitten, so he looked under the bench. Where did Sam look?", answer: "under the bench", choices: ["under the bench", "in the pond", "at school"], explanation: "Sam looked under the bench." },
        "1.RL.2": { question: "Read: Nia practiced tying her shoes each day. At last, she could tie them herself. What is a lesson from the story?", answer: "Practice helps you learn.", choices: ["Practice helps you learn.", "Shoes are always lost.", "Never try something new."], explanation: "Nia learned through practice." },
        "1.RL.3": { question: "Read: Omar packed a bag for the beach. He built a sandcastle by the water. Where does this story happen?", answer: "at the beach", choices: ["at the beach", "on a farm", "in space"], explanation: "The sand and water show the setting is a beach." },
        "1.RL.4": { question: "Read: “Hooray!” shouted Jay when he found his puppy. How does Jay feel?", answer: "happy", choices: ["happy", "sleepy", "angry"], explanation: "Hooray shows Jay feels happy." },
        "1.RL.5": { question: "Which kind of book tells a made-up story with characters and events?", answer: "a storybook", choices: ["a storybook", "an animal facts book", "a weather chart"], explanation: "Storybooks tell made-up stories." },
        "1.RL.6": { question: "Read: “I ran as fast as I could,” said the rabbit. Who is telling this part?", answer: "the rabbit", choices: ["the rabbit", "the fox", "the reader"], explanation: "The word I is spoken by the rabbit." },
        "1.RL.7": { question: "Read: Ava carries an umbrella. A picture shows dark clouds and rain. What does the picture help show?", answer: "It is raining.", choices: ["It is raining.", "It is bedtime.", "It is very hot."], explanation: "The rain and dark clouds show the weather." },
        "1.RL.9": { question: "In one story, Kai climbs a tree. In another, Zoe climbs a hill. How are Kai and Zoe alike?", answer: "Both like climbing.", choices: ["Both like climbing.", "Both are asleep.", "Both are swimming."], explanation: "Each character climbs something." }
      };
      const item = comprehension[skill]; answer = item.answer; choices = item.choices; values = { question: item.question }; explanation = item.explanation;
    }
    interaction = choiceInteraction(random.shuffle(choices)); canonicalAnswer = answer;
  } else if (template.generator.kind === "letterIdentification") {
    const letter = letters[random.integer(0, letters.length - 1)]; const requested = String(configuration.case ?? "lower"); const answer = requested === "upper" ? letter : letter.toLowerCase();
    const pool = letters.map((item) => requested === "upper" ? item : item.toLowerCase()).filter((item) => item !== answer);
    interaction = { ...choiceInteraction(random.shuffle([answer, ...random.shuffle(pool).slice(0, 2)])), target: { letter, requestedCase: requested } }; canonicalAnswer = answer; values = { letter: requested === "upper" ? letter.toLowerCase() : letter }; explanation = `${answer} is the ${requested}case form of the letter ${letter}.`;
  } else if (template.generator.kind === "rhymeOddOne") {
    const family = Object.keys(wordFamilies)[random.integer(0, Object.keys(wordFamilies).length - 1)]; const rhyming = random.shuffle(wordFamilies[family]).slice(0, 2); const odd = random.shuffle(Object.entries(wordFamilies).filter(([key]) => key !== family).flatMap(([, words]) => words))[0];
    interaction = { ...choiceInteraction(random.shuffle([...rhyming, odd])), target: { family, odd } }; canonicalAnswer = odd; values = {}; explanation = `${odd} does not end with the same sound as ${rhyming.join(" and ")}.`;
  } else if (template.generator.kind === "cvcSound") {
    const picked = cvcWords[random.integer(0, cvcWords.length - 1)]; const position = template.id.includes("final") ? "final" : "initial"; const answer = position === "initial" ? picked.word[0] : picked.word.at(-1)!;
    const pool = ["b", "c", "d", "f", "g", "h", "m", "n", "p", "r", "s", "t"].filter((sound) => sound !== answer);
    interaction = { ...choiceInteraction(random.shuffle([answer, ...random.shuffle(pool).slice(0, 2)])), target: { word: picked.word, phonemePosition: position } }; canonicalAnswer = answer; values = { word: picked.word, position }; explanation = `The ${position} sound in ${picked.word} is ${answer}.`;
  } else if (template.generator.kind === "countSequence") {
    const start = random.integer(1, 15); const ordered = [start, start + 1, start + 2].map(String);
    if (template.responseType === "sequence") { interaction = { kind: "sequence", items: random.shuffle(ordered), target: { start, ordered } }; canonicalAnswer = ordered; values = { start }; explanation = `Count forward: ${ordered.join(", ")}.`; }
    else { const answer = ordered[1]; interaction = { ...choiceInteraction(random.shuffle([answer, String(start + 3), String(Math.max(0, start - 1))])), target: { start } }; canonicalAnswer = answer; values = { start }; explanation = `${answer} comes after ${start}.`; }
  } else if (template.generator.kind === "additionWithinRange") {
    const min = numberParam(configuration, "minimum"); const max = numberParam(configuration, "maximum"); const count = numberParam(configuration, "choiceCount");
    const answer = random.integer(min, max); const left = random.integer(0, answer); const right = answer - left;
    const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index).filter((value) => value !== answer);
    interaction = choiceInteraction(random.shuffle([answer, ...random.shuffle(pool).slice(0, count - 1)])); canonicalAnswer = answer; values = { left, right }; explanation = `${left} plus ${right} equals ${answer}.`;
  } else if (template.generator.kind === "subtractionWithinRange") {
    const min = numberParam(configuration, "minimum"); const max = numberParam(configuration, "maximum"); const count = numberParam(configuration, "choiceCount");
    const answer = random.integer(min, max); const right = random.integer(0, max - answer); const left = answer + right;
    const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index).filter((value) => value !== answer);
    interaction = choiceInteraction(random.shuffle([answer, ...random.shuffle(pool).slice(0, count - 1)])); canonicalAnswer = answer; values = { left, right }; explanation = `${left} minus ${right} equals ${answer}.`;
  } else if (template.generator.kind === "compareNumbers") {
    const min = numberParam(configuration, "minimum"); const max = numberParam(configuration, "maximum");
    const left = random.integer(min, max); let right = random.integer(min, max); if (right === left && max > min) right = right === max ? right - 1 : right + 1;
    const answer = left < right ? "<" : left > right ? ">" : "=";
    interaction = choiceInteraction(["<", "=", ">"]); canonicalAnswer = answer; values = { left, right }; explanation = `${left} is ${answer === "<" ? "less than" : answer === ">" ? "greater than" : "equal to"} ${right}.`;
  } else throw new Error(`Unsupported generator kind: ${template.generator.kind}`);
  const prompt = { text: text(template, values), audioText: audioText(template, values), instructions: template.prompt.instructions ?? null };
  return { schemaVersion: 1, id: `${template.id}@${template.version}:${seed}`, templateId: template.id, templateVersion: template.version, seed, standardIds: [template.primaryStandardId, ...template.supportingStandardIds], responseType: template.responseType, prompt, interaction, canonicalAnswer, answerNormalization: { trim: true, caseInsensitive: true }, explanation, accessibility: { spokenPrompt: prompt.audioText, textAlternative: prompt.text, reducedMotionSafe: true }, provenance: { templateId: template.id, templateVersion: template.version, ...template.provenance } };
}
