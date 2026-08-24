import type { QuestionInstance, QuestionTemplate } from "../domain/question-template";
import { oklahomaScienceStandards } from "../data/oklahoma-science-standards";

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
  } else if (template.generator.kind === "kindergartenMath") {
    const skill = String(configuration.skill);
    let answer: string | number;
    let choices: Array<string | number>;
    if (skill === "K.CC.B.4.a") {
      answer = "one number for each object"; choices = [answer, "two numbers for each object", "no numbers"]; values = { question: "When you count 5 bears, how should you say the number names?" }; explanation = "Point to one object and say one number each time.";
    } else if (skill === "K.CC.B.4.b") {
      const count = random.integer(3, 10); answer = count; choices = [count, count - 1, count + 1]; values = { question: `You count ${count} shells. What does the last number you say tell you?` }; explanation = `The last number tells how many shells there are: ${count}.`;
    } else if (skill === "K.CC.B.4.c") {
      const count = random.integer(2, 9); answer = count + 1; choices = [answer, count - 1, count]; values = { question: `What number is one more than ${count}?` }; explanation = `${answer} is one more than ${count}.`;
    } else if (skill === "K.CC.B.5") {
      const count = random.integer(4, 10); answer = count; choices = [count, count - 1, count + 1]; values = { question: `How many apples are in a row if you count ${count} apples?` }; explanation = `Counting tells us there are ${count} apples.`;
    } else if (skill === "K.CC.C.6") {
      const larger = random.integer(5, 10); const smaller = random.integer(1, larger - 1); answer = "the first group"; choices = [answer, "the second group", "both groups"]; values = { question: `One group has ${larger} blocks. Another group has ${smaller} blocks. Which group has more blocks?` }; explanation = `${larger} is more than ${smaller}, so the first group has more.`;
    } else if (skill === "K.CC.C.7") {
      const smaller = random.integer(1, 8); const larger = smaller + random.integer(1, 10 - smaller); answer = "<"; choices = ["<", ">", "="]; values = { question: `Which symbol makes this true: ${smaller} __ ${larger}?` }; explanation = `${smaller} is less than ${larger}.`;
    } else if (skill === "K.G.A.1") {
      answer = "above"; choices = [answer, "below", "behind"]; values = { question: "A bird is in the sky and a tree is on the ground. The bird is ___ the tree." }; explanation = "The bird is above the tree.";
    } else if (skill === "K.G.A.2") {
      answer = "triangle"; choices = ["triangle", "circle", "rectangle"]; values = { question: "What shape has 3 straight sides and 3 corners?" }; explanation = "A triangle has three sides and three corners.";
    } else if (skill === "K.G.A.3") {
      answer = "a cube"; choices = [answer, "a circle", "a triangle"]; values = { question: "Which shape is solid, not flat?" }; explanation = "A cube is a solid three-dimensional shape.";
    } else if (skill === "K.G.B.4") {
      answer = "A square has 4 sides and a triangle has 3 sides."; choices = [answer, "They both have 3 sides.", "They both have no sides."]; values = { question: "Which statement compares a square and a triangle?" }; explanation = "A square has four sides. A triangle has three sides.";
    } else if (skill === "K.G.B.5") {
      answer = "sticks and clay balls"; choices = [answer, "water and soap", "a pillow and blanket"]; values = { question: "What could you use to build a triangle model?" }; explanation = "Sticks can make sides and clay balls can join the corners.";
    } else if (skill === "K.G.B.6") {
      answer = "a rectangle"; choices = [answer, "a circle", "a sphere"]; values = { question: "Two triangles can be put together to make which larger flat shape?" }; explanation = "Two matching triangles can make a rectangle.";
    } else if (skill === "K.MD.A.1") {
      answer = "length"; choices = ["length", "color", "name"]; values = { question: "Which word tells something you can measure about a crayon?" }; explanation = "You can measure how long a crayon is.";
    } else if (skill === "K.MD.A.2") {
      answer = "the taller child"; choices = [answer, "the shorter child", "they are both a color"]; values = { question: "Ava is taller than Ben. Who is taller?" }; explanation = "Ava is the taller child.";
    } else if (skill === "K.MD.B.3") {
      answer = "3 red buttons"; choices = [answer, "2 red buttons", "4 red buttons"]; values = { question: "You sort buttons and count 3 red buttons. How many red buttons are there?" }; explanation = "The red category has 3 buttons.";
    } else if (skill === "K.NBT.A.1") {
      const ones = random.integer(1, 9); answer = 10 + ones; choices = [answer, ones, 20 + ones]; values = { question: `What number is one ten and ${ones} more ones?` }; explanation = `One ten and ${ones} ones makes ${answer}.`;
    } else if (skill === "K.OA.A.1") {
      const left = random.integer(1, 4); const right = random.integer(1, 4); answer = left + right; choices = [answer, answer - 1, answer + 1]; values = { question: `You have ${left} red cubes and ${right} blue cubes. How many cubes do you have?` }; explanation = `${left} cubes plus ${right} cubes equals ${answer} cubes.`;
    } else if (skill === "K.OA.A.2") {
      const total = random.integer(4, 9); const taken = random.integer(1, total - 1); answer = total - taken; choices = [answer, answer + 1, total + 1]; values = { question: `You have ${total} crackers and eat ${taken}. How many crackers are left?` }; explanation = `${total} minus ${taken} equals ${answer}.`;
    } else if (skill === "K.OA.A.3") {
      const total = random.integer(4, 8); const first = random.integer(1, total - 1); answer = `${first} + ${total - first}`; choices = [answer, `${first} + ${total - first - 1}`, `${total} + 1`]; values = { question: `Which pair of numbers makes ${total}?` }; explanation = `${first} plus ${total - first} equals ${total}.`;
    } else if (skill === "K.OA.A.4") {
      const number = random.integer(1, 9); answer = 10 - number; choices = [answer, answer - 1, answer + 1]; values = { question: `What number goes with ${number} to make 10?` }; explanation = `${number} plus ${answer} equals 10.`;
    } else {
      const left = random.integer(1, 4); const right = random.integer(1, 5 - left); answer = left + right; choices = [answer, answer - 1, answer + 1]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`;
    }
    interaction = choiceInteraction(random.shuffle(choices)); canonicalAnswer = answer;
  } else if (template.generator.kind === "kindergartenElaAdult") {
    const skill = String(configuration.skill);
    const prompts: Record<string, string> = {
      "K.L.1.a": "Print the uppercase and lowercase letters A through F.", "K.L.1.f": "Tell the adult a complete sentence about a favorite animal.", "K.RF.4": "Read this sentence aloud slowly and carefully: The cat sat on the soft mat.", "K.RI.10": "Listen to or read a Kindergarten informational book chosen by the adult. Tell one fact you learned.", "K.RL.10": "Listen to or read a Kindergarten story chosen by the adult. Tell what happened first and next.",
      "K.SL.1.a": "Have a short conversation with the adult. Take turns speaking and listening.", "K.SL.1.b": "Listen to the adult share an idea about a pet. Add a connected idea of your own.", "K.SL.2": "After the adult reads a short passage, answer a question about a detail.", "K.SL.3": "Listen to the adult describe an object. Ask or answer a question about it.", "K.SL.4": "Describe a favorite place using clear details.", "K.SL.5": "Draw a picture to help explain something you are describing.", "K.SL.6": "Speak clearly so the adult can understand your words.",
      "K.W.1": "Draw and write about your favorite snack. Tell what you like and why.", "K.W.2": "Draw and write facts about an animal. Name the animal and tell facts about it.", "K.W.3": "Draw and write about something that happened to you. Tell the events in order.", "K.W.5": "Tell the adult one change you can make to improve your drawing or writing.", "K.W.6": "Use a digital tool with the adult to share a drawing or short piece of writing.", "K.W.7": "Help the adult find facts in books about an animal, then help make a shared page.", "K.W.8": "Answer this question by remembering something you did: What did you do outside today?"
    };
    if (!prompts[skill]) throw new Error(`Unsupported Kindergarten adult ELA skill: ${skill}`);
    canonicalAnswer = null; interaction = { kind: "adultScored", target: { standardId: skill } }; values = { question: prompts[skill] }; explanation = "Your adult will decide whether this skill was demonstrated.";
  } else if (template.generator.kind === "oklahomaScienceAdult") {
    const skill = String(configuration.skill);
    const standard = oklahomaScienceStandards.find((item) => item.officialId === skill);
    if (!standard) throw new Error(`Unsupported Oklahoma science skill: ${skill}`);
    const gradeLabel = template.grade === "K" ? "Kindergarten" : `Grade ${template.grade}`;
    canonicalAnswer = null;
    interaction = { kind: "adultScored", target: { standardId: skill, framework: "Oklahoma Academic Standards for Science 2026" } };
    values = { question: `${gradeLabel} science investigation: Work with an adult to ${standard.statement.charAt(0).toLowerCase()}${standard.statement.slice(1)} Talk about what you notice, draw or build when it helps, and explain your evidence.` };
    explanation = "An adult will check the investigation, evidence, and explanation together with you.";
  } else if (template.generator.kind === "kindergartenEla") {
    const skill = String(configuration.skill);
    const items: Record<string, { question: string; answer: string; choices: string[]; explanation: string }> = {
      "K.L.1.b": { question: "Which word names an animal?", answer: "dog", choices: ["dog", "run", "happy"], explanation: "Dog is the name of an animal, so it is a noun." },
      "K.L.1.c": { question: "Which word means more than one cat?", answer: "cats", choices: ["cats", "cat", "catted"], explanation: "Adding s can mean more than one." },
      "K.L.1.d": { question: "The ball is ___ the table. Which word tells where?", answer: "under", choices: ["under", "blue", "jump"], explanation: "Under tells where the ball is." },
      "K.L.1.e": { question: "Which question word asks about a place?", answer: "Where", choices: ["Where", "Who", "When"], explanation: "Where asks about a place." },
      "K.L.2.a": { question: "Which sentence starts with a capital letter?", answer: "Molly runs.", choices: ["Molly runs.", "molly plays.", "molly jumps."], explanation: "A sentence begins with a capital letter." },
      "K.L.2.b": { question: "Which mark belongs at the end? I like to hop___", answer: ".", choices: [".", "?", ","], explanation: "A telling sentence ends with a period." },
      "K.L.2.c": { question: "Which letters spell the word you hear: sun?", answer: "sun", choices: ["sun", "son", "snu"], explanation: "The sounds /s/ /u/ /n/ spell sun." },
      "K.L.2.d": { question: "Which word is spelled correctly?", answer: "hop", choices: ["hop", "hopp", "hup"], explanation: "Hop uses the letters h, o, and p in that order." },
      "K.L.4.a": { question: "Maya wore boots because puddles were wet. What does wet mean?", answer: "covered with water", choices: ["covered with water", "full of sand", "very loud"], explanation: "Puddles have water, so wet means covered with water." },
      "K.L.4.b": { question: "What does the beginning un- mean in unhappy?", answer: "not", choices: ["not", "again", "very"], explanation: "Un- can mean not." },
      "K.L.5.a": { question: "Which two things belong in the same group?", answer: "apple and banana", choices: ["apple and banana", "apple and shoe", "banana and kite"], explanation: "An apple and banana are both fruits." },
      "K.L.5.b": { question: "Which word tells about a bear?", answer: "furry", choices: ["furry", "because", "under"], explanation: "Furry is an attribute that can describe a bear." },
      "K.L.5.c": { question: "What is the opposite of big?", answer: "small", choices: ["small", "tall", "fast"], explanation: "Small means the opposite of big." },
      "K.L.5.d": { question: "Which item would you use to write a note?", answer: "a pencil", choices: ["a pencil", "a mitten", "a spoon"], explanation: "A pencil is used for writing." },
      "K.L.6": { question: "Which word is a color word?", answer: "purple", choices: ["purple", "jump", "under"], explanation: "Purple names a color." },
      "K.RF.1.a": { question: "Where is the title of a book usually found?", answer: "on the cover", choices: ["on the cover", "under the bed", "inside a shoe"], explanation: "The cover tells the book's title." },
      "K.RF.1.b": { question: "When we read English, where do we start on a line?", answer: "at the left", choices: ["at the left", "at the right", "in the middle"], explanation: "English print goes from left to right." },
      "K.RF.1.c": { question: "Which is a complete sentence?", answer: "The dog runs.", choices: ["The dog runs.", "dog the", "runs dog"], explanation: "A sentence tells a complete thought." },
      "K.RF.2.b": { question: "Which word starts with the same sound as sun?", answer: "sock", choices: ["sock", "map", "top"], explanation: "Sun and sock both begin with /s/." },
      "K.RF.2.c": { question: "Blend these sounds: /m/ /a/ /p/. What word do they make?", answer: "map", choices: ["map", "mop", "tap"], explanation: "The sounds blend to make map." },
      "K.RF.2.e": { question: "Change the first sound in cat from /c/ to /h/. What word do you make?", answer: "hat", choices: ["hat", "hot", "cat"], explanation: "Changing /c/ to /h/ makes hat." },
      "K.RF.3.a": { question: "What sound does the letter m make?", answer: "/m/", choices: ["/m/", "/s/", "/t/"], explanation: "The letter m usually spells the /m/ sound." },
      "K.RF.3.b": { question: "Which letter makes the first sound in fish?", answer: "f", choices: ["f", "m", "t"], explanation: "Fish begins with /f/." },
      "K.RF.3.c": { question: "Which word can you sound out: /s/ /a/ /t/?", answer: "sat", choices: ["sat", "set", "sit"], explanation: "The sounds /s/ /a/ /t/ make sat." },
      "K.RF.3.d": { question: "Which word is a common word to know by heart?", answer: "the", choices: ["the", "xylophone", "pterodactyl"], explanation: "The is a very common word readers learn to recognize." },
      "K.RI.1": { question: "Read: Birds build nests. What do birds build?", answer: "nests", choices: ["nests", "cars", "sandcastles"], explanation: "The text says birds build nests." },
      "K.RI.2": { question: "Read: Seeds need water and sun to grow. What is this mostly about?", answer: "what seeds need", choices: ["what seeds need", "how to ride a bike", "where fish sleep"], explanation: "The sentence tells what seeds need." },
      "K.RI.3": { question: "Read: First, wash your hands. Next, dry them. What happens after washing?", answer: "Dry your hands.", choices: ["Dry your hands.", "Eat dinner.", "Put on boots."], explanation: "The text says dry them next." },
      "K.RI.4": { question: "Read: A cub is a baby bear. What is a cub?", answer: "a baby bear", choices: ["a baby bear", "a tall tree", "a kind of car"], explanation: "The text explains that a cub is a baby bear." },
      "K.RI.5": { question: "Which part of an information book can name the picture?", answer: "a caption", choices: ["a caption", "a character", "an ending"], explanation: "A caption gives words about a picture." },
      "K.RI.6": { question: "Who writes the words in a book?", answer: "the author", choices: ["the author", "the illustrator", "the reader"], explanation: "The author writes the words." },
      "K.RI.7": { question: "A picture shows a frog in a pond. What does the picture help show?", answer: "where the frog is", choices: ["where the frog is", "how to spell frog", "the book's price"], explanation: "The picture gives information about the frog's home." },
      "K.RI.8": { question: "We should wear a coat because it keeps us warm. Why wear a coat?", answer: "It keeps us warm.", choices: ["It keeps us warm.", "It makes rain.", "It turns into a toy."], explanation: "Keeping warm is the reason." },
      "K.RI.9": { question: "One book is about dogs. Another book is about dogs too. What is the same?", answer: "Both books are about dogs.", choices: ["Both books are about dogs.", "Both books are about rockets.", "Neither book has words."], explanation: "The topic of both books is dogs." },
      "K.RL.1": { question: "Read: Sam found his hat under the chair. Where was Sam's hat?", answer: "under the chair", choices: ["under the chair", "in the tree", "at the park"], explanation: "The story says the hat was under the chair." },
      "K.RL.2": { question: "Read: Jo planted a seed. It grew into a flower. What happened first?", answer: "Jo planted a seed.", choices: ["Jo planted a seed.", "It grew into a flower.", "Jo picked an apple."], explanation: "Planting happened before the flower grew." },
      "K.RL.3": { question: "Read: Nia went to the beach and built a sandcastle. Where does the story happen?", answer: "at the beach", choices: ["at the beach", "on the moon", "in a library"], explanation: "The beach and sandcastle tell the setting." },
      "K.RL.4": { question: "Read: “Hooray!” said Jay. How does Jay feel?", answer: "happy", choices: ["happy", "sleepy", "scared"], explanation: "Hooray is something people say when they feel happy." },
      "K.RL.5": { question: "Which book tells a make-believe story?", answer: "a storybook", choices: ["a storybook", "an animal facts book", "a weather chart"], explanation: "A storybook has made-up characters and events." },
      "K.RL.6": { question: "Who draws the pictures in a book?", answer: "the illustrator", choices: ["the illustrator", "the author", "the reader"], explanation: "The illustrator creates the pictures." },
      "K.RL.7": { question: "A story says Ava carries an umbrella. The picture shows rain. What does the picture help show?", answer: "It is raining.", choices: ["It is raining.", "It is bedtime.", "It is snowing."], explanation: "The picture gives a clue that it is raining." },
      "K.RL.9": { question: "In one story, a rabbit hops. In another, a frog hops. How are they alike?", answer: "Both animals hop.", choices: ["Both animals hop.", "Both animals fly.", "Both animals are fish."], explanation: "Each animal hops in its story." }
    };
    const item = items[skill];
    if (!item) throw new Error(`Unsupported Kindergarten ELA skill: ${skill}`);
    interaction = choiceInteraction(random.shuffle(item.choices)); canonicalAnswer = item.answer; values = { question: item.question }; explanation = item.explanation;
  } else if (template.generator.kind === "gradeTwoMath") {
    const skill = String(configuration.skill);
    let answer: string | number;
    let choices: Array<string | number>;
    if (skill === "2.OA.A.1") {
      const first = random.integer(18, 45); const second = random.integer(12, 30); const givenAway = random.integer(5, 15); answer = first + second - givenAway; choices = [answer, answer + givenAway, answer - 2]; values = { question: `Molly has ${first} stickers. She gets ${second} more and gives ${givenAway} away. How many stickers does she have now?` }; explanation = `${first} plus ${second} minus ${givenAway} equals ${answer}.`;
    } else if (skill === "2.OA.B.2") {
      const left = random.integer(4, 9); const right = random.integer(4, 9); answer = left + right; choices = [answer, answer - 1, answer + 1]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`;
    } else if (skill === "2.OA.C.3") {
      const count = random.integer(3, 10) * 2; answer = "even"; choices = ["even", "odd", "zero"]; values = { question: `Is ${count} an odd number or an even number?` }; explanation = `${count} can be split into ${count / 2} pairs with none left over, so it is even.`;
    } else if (skill === "2.OA.C.4") {
      const rows = random.integer(2, 5); const columns = random.integer(2, 5); answer = rows * columns; const addends = rows + columns; choices = [answer, addends === answer ? answer + 1 : addends, answer + rows]; values = { question: `There are ${rows} rows of ${columns} stars. How many stars are there altogether?` }; explanation = `${rows} groups of ${columns} equals ${answer}.`;
    } else if (skill === "2.NBT.A.1.a") {
      answer = 100; choices = [100, 10, 1000]; values = { question: "How many tens make one hundred?" }; explanation = `Ten tens make one hundred.`;
    } else if (skill === "2.NBT.A.1.b") {
      const hundreds = random.integer(2, 9); answer = hundreds * 100; choices = [answer, hundreds * 10, hundreds]; values = { question: `What number is ${hundreds} hundreds, 0 tens, and 0 ones?` }; explanation = `${hundreds} hundreds is ${answer}.`;
    } else if (skill === "2.NBT.A.2") {
      const start = random.integer(2, 15) * 5; answer = start + 5; choices = [answer, start + 10, start + 1]; values = { question: `Count by fives. What comes after ${start}?` }; explanation = `When counting by fives, ${start} is followed by ${answer}.`;
    } else if (skill === "2.NBT.A.3") {
      const hundreds = random.integer(2, 8); const tens = random.integer(1, 8); let ones = random.integer(1, 9); if (ones === tens) ones = ones === 9 ? 1 : ones + 1; answer = hundreds * 100 + tens * 10 + ones; choices = [answer, hundreds * 100 + ones * 10 + tens, hundreds * 100 + tens * 10]; values = { question: `What number is ${hundreds} hundreds, ${tens} tens, and ${ones} ones?` }; explanation = `${hundreds * 100} plus ${tens * 10} plus ${ones} equals ${answer}.`;
    } else if (skill === "2.NBT.A.4") {
      const left = random.integer(2, 8) * 100 + random.integer(0, 9) * 10 + random.integer(0, 9); const right = left + random.integer(1, 30); answer = "<"; choices = ["<", ">", "="]; values = { question: `Which symbol makes this true: ${left} __ ${right}?` }; explanation = `${left} is less than ${right}, so the correct symbol is less than.`;
    } else if (skill === "2.NBT.B.5") {
      const left = random.integer(25, 68); const right = random.integer(12, 31); answer = left + right; choices = [answer, answer - 10, answer + 10]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`;
    } else if (skill === "2.NBT.B.6") {
      const valuesToAdd = Array.from({ length: 4 }, () => random.integer(10, 19)); answer = valuesToAdd.reduce((total, value) => total + value, 0); choices = [answer, answer - 10, answer + 10]; values = { question: `What is ${valuesToAdd.join(" + ")}?` }; explanation = `Adding the four two-digit numbers gives ${answer}.`;
    } else if (skill === "2.NBT.B.7") {
      const left = random.integer(325, 675); const right = random.integer(112, 224); answer = left + right; choices = [answer, answer - 100, answer + 100]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`;
    } else if (skill === "2.NBT.B.8") {
      const number = random.integer(2, 8) * 100 + random.integer(0, 9) * 10 + random.integer(0, 9); answer = number + 100; choices = [answer, number + 10, number - 100]; values = { question: `What is 100 more than ${number}?` }; explanation = `Adding one hundred to ${number} gives ${answer}.`;
    } else if (skill === "2.NBT.B.9") {
      answer = "Add hundreds to hundreds, tens to tens, and ones to ones."; choices = [answer, "Add the digits in any order without using place value.", "Only add the ones digits."]; values = { question: "Which strategy explains how to add two three-digit numbers?" }; explanation = `Place value helps us add hundreds, tens, and ones in matching places.`;
    } else if (skill === "2.MD.A.1") {
      answer = "a ruler"; choices = [answer, "a thermometer", "a scale"]; values = { question: "Which tool should you use to measure the length of a book?" }; explanation = `A ruler measures length.`;
    } else if (skill === "2.MD.A.2") {
      answer = "The smaller unit gives a larger number of units."; choices = [answer, "The larger unit gives a larger number of units.", "Both units always give the same number."]; values = { question: "A table is measured with inches and then with feet. Which statement is true?" }; explanation = `It takes more small inches than larger feet to measure the same length.`;
    } else if (skill === "2.MD.A.3") {
      answer = "about 8 inches"; choices = [answer, "about 8 feet", "about 8 meters"]; values = { question: "Which is a reasonable estimate for the length of a pencil?" }; explanation = `A pencil is usually about 8 inches long.`;
    } else if (skill === "2.MD.A.4") {
      const longer = random.integer(12, 24); const shorter = random.integer(4, longer - 4); answer = longer - shorter; choices = [answer, answer + 2, longer]; values = { question: `A ribbon is ${longer} inches long. A string is ${shorter} inches long. How many inches longer is the ribbon?` }; explanation = `${longer} minus ${shorter} equals ${answer}.`;
    } else if (skill === "2.MD.B.5") {
      const first = random.integer(18, 36); const second = random.integer(12, 28); answer = first + second; choices = [answer, answer - 5, answer + 5]; values = { question: `A blue ribbon is ${first} centimeters long and a red ribbon is ${second} centimeters long. What is their total length?` }; explanation = `${first} plus ${second} equals ${answer} centimeters.`;
    } else if (skill === "2.MD.B.6") {
      const start = random.integer(10, 40); const jump = random.integer(10, 30); answer = start + jump; choices = [answer, start - jump, answer + 10]; values = { question: `On a number line, start at ${start} and jump forward ${jump}. What number do you land on?` }; explanation = `${start} plus ${jump} equals ${answer}.`;
    } else if (skill === "2.MD.C.7") {
      const hour = random.integer(1, 11); answer = `${hour}:35`; choices = [answer, `${hour}:30`, `${hour}:40`]; values = { question: `The minute hand points to 7 and the hour hand is just past ${hour}. What time is it?` }; explanation = `Each number on the clock is five minutes. Pointing to 7 means 35 minutes past ${hour}.`;
    } else if (skill === "2.MD.C.8") {
      const quarters = random.integer(1, 3); const dimes = random.integer(1, 4); answer = quarters * 25 + dimes * 10; choices = [answer, answer - 5, answer + 5]; values = { question: `You have ${quarters} quarter${quarters === 1 ? "" : "s"} and ${dimes} dime${dimes === 1 ? "" : "s"}. How many cents do you have?` }; explanation = `${quarters} quarters are ${quarters * 25} cents and ${dimes} dimes are ${dimes * 10} cents. Together that is ${answer} cents.`;
    } else if (skill === "2.MD.D.9") {
      const measurements = [4, 5, 5, 6]; answer = 5; choices = [5, 4, 6]; values = { question: `A line plot has pencil lengths of ${measurements.join(", ")} inches. Which length appears most often?` }; explanation = `The length 5 appears twice, more often than the other lengths.`;
    } else if (skill === "2.MD.D.10") {
      const cats = random.integer(4, 9); const dogs = random.integer(1, cats - 1); answer = cats - dogs; choices = [answer, cats + dogs, cats]; values = { question: `A bar graph shows ${cats} children chose cats and ${dogs} chose dogs. How many more chose cats?` }; explanation = `${cats} minus ${dogs} equals ${answer}.`;
    } else if (skill === "2.G.A.1") {
      answer = "a pentagon"; choices = [answer, "a triangle", "a cube"]; values = { question: "Which shape has 5 sides and 5 angles?" }; explanation = `A pentagon has five sides and five angles.`;
    } else if (skill === "2.G.A.2") {
      const rows = random.integer(2, 5); const columns = random.integer(2, 5); answer = rows * columns; const addends = rows + columns; choices = [answer, addends === answer ? answer + 2 : addends, answer + 1]; values = { question: `A rectangle has ${rows} rows and ${columns} columns of equal squares. How many squares are in the rectangle?` }; explanation = `${rows} rows of ${columns} squares makes ${answer} squares.`;
    } else {
      answer = "thirds"; choices = ["halves", answer, "fourths"]; values = { question: "A circle is split into 3 equal shares. What are the shares called?" }; explanation = `Three equal shares are called thirds.`;
    }
    interaction = choiceInteraction(random.shuffle(choices)); canonicalAnswer = answer;
  } else if (template.generator.kind === "gradeTwoElaAdult") {
    const skill = String(configuration.skill);
    const prompts: Record<string, string> = {
      "2.L.2.e": "Use a child-friendly dictionary to check the spelling of a word in this sentence: I saw a beautiful butterfly.", "2.L.4.e": "Use a glossary or beginning dictionary with the adult to find the meaning of a new word.",
      "2.RF.4.a": "Read this short passage and tell what it is mostly about: Bees visit flowers to collect nectar. They carry pollen from flower to flower.", "2.RF.4.b": "Read this sentence aloud smoothly and with expression: The playful puppy raced through the tall green grass.", "2.RF.4.c": "Read this sentence. If a word does not make sense, reread and fix it: The bright moon shone over the quiet lake.", "2.RI.10": "Read or listen to a Grade 2 informational text chosen by the adult. Tell the main topic and two facts.", "2.RL.10": "Read or listen to a Grade 2 story chosen by the adult. Recount the beginning, middle, and end.",
      "2.SL.1.a": "Have a short discussion with the adult. Take turns, listen carefully, and speak about the same topic.", "2.SL.1.b": "Listen to the adult share an idea about a book. Add a connected idea of your own.", "2.SL.1.c": "Ask the adult for clarification about something they said during a conversation.", "2.SL.2": "After the adult reads a short passage, recount two key details in order.", "2.SL.3": "Listen to the adult explain how to do something. Ask and answer questions to make the directions clear.", "2.SL.4": "Tell about a memorable experience using facts, descriptive details, and complete sentences.", "2.SL.5": "Create a drawing or audio recording that helps explain a story or experience you are sharing.", "2.SL.6": "Answer the adult's question with a complete sentence that gives a helpful detail.",
      "2.W.1": "Write an opinion about a book or activity. State your opinion, give two reasons using linking words, and write a conclusion.", "2.W.2": "Write an informational paragraph about an animal. Include a topic, facts or definitions, and a conclusion.", "2.W.3": "Write a narrative about a short event. Include actions, thoughts or feelings, time-order words, and an ending.", "2.W.5": "Revise a short piece of writing with the adult. Add or correct one detail that makes it clearer.", "2.W.6": "Use a digital tool with the adult to publish a short piece of writing.", "2.W.7": "Read several sources with the adult about one topic and help create a short shared report.", "2.W.8": "Use a provided source or your own experience to answer a question in writing."
    };
    canonicalAnswer = null; interaction = { kind: "adultScored", target: { standardId: skill } }; values = { question: prompts[skill] ?? "Complete the activity with an adult." }; explanation = "Your adult will decide whether this skill was demonstrated.";
  } else if (template.generator.kind === "gradeTwoEla") {
    const skill = String(configuration.skill);
    const items: Record<string, { question: string; answer: string; choices: string[]; explanation: string }> = {
      "2.L.1.a": { question: "Which word is a collective noun?", answer: "team", choices: ["team", "runner", "jump"], explanation: "A team names a group." },
      "2.L.1.b": { question: "Which word is the plural of mouse?", answer: "mice", choices: ["mouses", "mice", "mouse"], explanation: "Mice is the irregular plural of mouse." },
      "2.L.1.c": { question: "Which word completes the sentence? I made this picture by ___.", answer: "myself", choices: ["myself", "my", "me"], explanation: "Myself is a reflexive pronoun." },
      "2.L.1.d": { question: "Which sentence uses the correct irregular past-tense verb?", answer: "Yesterday, we went to the park.", choices: ["Yesterday, we went to the park.", "Yesterday, we goed to the park.", "Yesterday, we go to the park."], explanation: "Went is the past tense of go." },
      "2.L.1.e": { question: "Which word tells how the bird sang?", answer: "sweetly", choices: ["sweetly", "song", "blue"], explanation: "Sweetly is an adverb that tells how the bird sang." },
      "2.L.1.f": { question: "Which is a complete expanded sentence?", answer: "The little brown dog ran quickly home.", choices: ["The little brown dog ran quickly home.", "Dog quickly.", "Ran the."], explanation: "A complete sentence has a clear subject and predicate." },
      "2.L.2.a": { question: "In the sentence We visited Lake Erie on Monday, which words need capital letters?", answer: "Lake Erie and Monday", choices: ["Lake Erie and Monday", "only Lake Erie", "no words"], explanation: "Lake Erie and Monday are proper names." },
      "2.L.2.b": { question: "Which letter greeting uses a comma correctly?", answer: "Dear Grandma,", choices: ["Dear Grandma,", "Dear, Grandma", "Dear Grandma"], explanation: "A greeting in a letter uses a comma." },
      "2.L.2.c": { question: "Which word shows that the backpack belongs to Mia?", answer: "Mia's", choices: ["Mias", "Mia's", "Mia"], explanation: "An apostrophe and s can show possession." },
      "2.L.2.d": { question: "Which word follows the same long-a spelling pattern as rain?", answer: "train", choices: ["train", "ran", "turn"], explanation: "Rain and train both use ai for the long-a sound." },
      "2.L.3.a": { question: "Which is the best formal way to ask for help at school?", answer: "Could you please help me?", choices: ["Could you please help me?", "Help me now!", "Gimme help."], explanation: "Formal language is polite and clear." },
      "2.L.4.a": { question: "The desert was arid, so the plants needed very little water. What does arid mean?", answer: "very dry", choices: ["very dry", "very cold", "very noisy"], explanation: "The clue about little water shows that arid means very dry." },
      "2.L.4.b": { question: "What does unhappy mean?", answer: "not happy", choices: ["not happy", "very happy", "happy again"], explanation: "The prefix un- means not." },
      "2.L.4.c": { question: "Knowing the word help can help you understand helpful. What does helpful mean?", answer: "giving help", choices: ["giving help", "needing sleep", "full of color"], explanation: "The root word help gives a clue to helpful." },
      "2.L.4.d": { question: "What is a birdhouse?", answer: "a house for a bird", choices: ["a house for a bird", "a bird that is a house", "a book about birds"], explanation: "Birdhouse joins bird and house." },
      "2.L.5.a": { question: "Which food could be described as juicy?", answer: "an orange", choices: ["an orange", "a pencil", "a mitten"], explanation: "An orange has juice." },
      "2.L.5.b": { question: "Which word means to throw with the most force?", answer: "hurl", choices: ["toss", "throw", "hurl"], explanation: "Hurl means to throw very forcefully." },
      "2.L.6": { question: "Which phrase uses a describing word clearly?", answer: "The enormous whale splashed.", choices: ["The enormous whale splashed.", "The whale thing.", "Whale very."], explanation: "Enormous is a precise describing word." },
      "2.RF.3.a": { question: "Which word has a short vowel sound?", answer: "ship", choices: ["ship", "shine", "sheep"], explanation: "Ship has the short i sound." },
      "2.RF.3.b": { question: "Which word has the vowel team ea?", answer: "beach", choices: ["beach", "bench", "bunch"], explanation: "Beach has the vowel team ea." },
      "2.RF.3.c": { question: "Which two-syllable word has a long vowel sound?", answer: "sunset", choices: ["sunset", "rabbit", "pumpkin"], explanation: "Sunset has a long e sound in its second syllable." },
      "2.RF.3.d": { question: "What does reread mean?", answer: "read again", choices: ["read again", "read before", "not read"], explanation: "The prefix re- means again." },
      "2.RF.3.e": { question: "Which word has a spelling that must be remembered?", answer: "said", choices: ["said", "cat", "hop"], explanation: "Said does not sound exactly the way its letters usually spell." },
      "2.RF.3.f": { question: "Which is a grade-appropriate irregular word?", answer: "because", choices: ["because", "map", "sun"], explanation: "Because has an irregular spelling to learn by memory." },
      "2.RI.1": { question: "A passage says owls hunt at night. Which question is answered by that detail?", answer: "When do owls hunt?", choices: ["When do owls hunt?", "What color are owls?", "Where do owls sleep?"], explanation: "The detail tells when owls hunt." },
      "2.RI.2": { question: "A text explains how seeds grow into plants. What is the main topic?", answer: "how plants grow", choices: ["how plants grow", "how birds fly", "how games work"], explanation: "Every detail is about plants growing." },
      "2.RI.3": { question: "First, water is heated. Next, it turns into steam. What connection does the text show?", answer: "steps in a process", choices: ["steps in a process", "two characters talking", "a made-up problem"], explanation: "The words first and next show steps in order." },
      "2.RI.4": { question: "In a text about weather, forecast means what weather may be coming. What does forecast mean?", answer: "a prediction about weather", choices: ["a prediction about weather", "a kind of animal", "a place to play"], explanation: "The text gives the meaning of forecast." },
      "2.RI.5": { question: "Which text feature helps you find the page for a topic in a book?", answer: "an index", choices: ["an index", "a character", "a rhyme"], explanation: "An index lists topics and page numbers." },
      "2.RI.6": { question: "A text explains how rain forms. Why did the author write it?", answer: "to explain", choices: ["to explain", "to tell a joke", "to give directions for a game"], explanation: "The text gives information to explain rain." },
      "2.RI.7": { question: "How can a labeled diagram help a reader?", answer: "It shows the parts and names them.", choices: ["It shows the parts and names them.", "It changes the ending.", "It makes every word rhyme."], explanation: "A diagram can clarify information with labels." },
      "2.RI.8": { question: "An author says children should wear helmets because helmets protect heads. What supports the author's point?", answer: "Helmets protect heads.", choices: ["Helmets protect heads.", "Helmets are blue.", "Children like bicycles."], explanation: "Protection is a reason that supports wearing helmets." },
      "2.RI.9": { question: "Two texts say bees help flowers by carrying pollen. What important point do both texts share?", answer: "Bees carry pollen.", choices: ["Bees carry pollen.", "Bees live underwater.", "Bees are reptiles."], explanation: "Both texts include the point about pollen." },
      "2.RL.1": { question: "In a story, Maya packed an umbrella because dark clouds came. Why did Maya pack an umbrella?", answer: "Dark clouds came.", choices: ["Dark clouds came.", "She wanted to swim.", "She lost her backpack."], explanation: "The story gives dark clouds as Maya's reason." },
      "2.RL.2": { question: "A fable tells about a rabbit who practiced every day and finished a race. What is the lesson?", answer: "Practice helps you improve.", choices: ["Practice helps you improve.", "Rabbits can fly.", "Races always happen at night."], explanation: "The rabbit improved by practicing." },
      "2.RL.3": { question: "When the bridge washed out, Kai built a safe path with sticks. How did Kai respond to the challenge?", answer: "He solved the problem.", choices: ["He solved the problem.", "He ignored it forever.", "He made the rain start."], explanation: "Kai responded by making a safe path." },
      "2.RL.4": { question: "What do repeated lines in a poem often help create?", answer: "rhythm", choices: ["rhythm", "a map", "a recipe"], explanation: "Repeated lines can make a poem have rhythm." },
      "2.RL.5": { question: "What does the beginning of a story usually do?", answer: "introduces the characters and setting", choices: ["introduces the characters and setting", "solves every problem", "lists page numbers"], explanation: "The beginning introduces who and where the story is about." },
      "2.RL.6": { question: "Why might two characters speak in different voices when reading dialogue?", answer: "They have different points of view.", choices: ["They have different points of view.", "They are the same person.", "They are reading a dictionary."], explanation: "Different voices can show different characters' viewpoints." },
      "2.RL.7": { question: "A picture shows a character holding a suitcase beside the words She moved to a new town. What does the picture help explain?", answer: "The character is leaving home.", choices: ["The character is leaving home.", "The character is cooking.", "The character is asleep."], explanation: "The suitcase and words together show the character is moving." },
      "2.RL.9": { question: "Two Cinderella stories both include a lost shoe. What is one similarity?", answer: "Both have a lost shoe.", choices: ["Both have a lost shoe.", "Both happen on the moon.", "Both have no main character."], explanation: "A lost shoe appears in both versions." }
    };
    const item = items[skill];
    if (!item) throw new Error(`Unsupported Grade 2 ELA skill: ${skill}`);
    interaction = choiceInteraction(random.shuffle(item.choices)); canonicalAnswer = item.answer; values = { question: item.question }; explanation = item.explanation;
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
