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
    else if (skill === "1.OA.B.3") { const left = random.integer(2, 8); const right = random.integer(2, 8); answer = `${right} + ${left} = ${left + right}`; choices = [answer, `${left} + ${right} = ${left + right + 1}`, `${right} + ${left} = ${left + right - 1}`]; values = { question: `If ${left} plus ${right} equals ${left + right}, which fact is also true?` }; explanation = `Changing the order of addends keeps the sum the same.`; }
    else if (skill === "1.OA.B.4" || skill === "1.OA.D.8") { const total = random.integer(10, 18); const known = random.integer(2, total - 2); answer = total - known; choices = [answer, answer - 1, answer + 1]; values = { question: `What number makes ${known} plus blank equal ${total}?` }; explanation = `${known} plus ${answer} equals ${total}.`; }
    else if (skill === "1.OA.C.5") { const start = random.integer(5, 15); answer = start + 2; choices = [answer, start + 1, start + 3]; values = { question: `Count on 2 from ${start}. What number do you say?` }; explanation = `${start}, ${start + 1}, ${answer}.`; }
    else if (skill === "1.OA.C.6") { const left = random.integer(3, 10); const right = random.integer(2, 10); answer = left + right; choices = [answer, answer - 1, answer + 1]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`; }
    else if (skill === "1.OA.D.7") { const left = random.integer(3, 9); const right = random.integer(1, 5); const isTrue = random.integer(0, 1) === 1; answer = isTrue ? "true" : "false"; choices = ["true", "false"]; values = { question: `Is ${left} plus ${right} equals ${isTrue ? left + right : left + right + 1} true or false?` }; explanation = `The equation is ${answer}.`; }
    else if (skill === "1.NBT.A.1") { const start = random.integer(20, 115); answer = start + 1; choices = [answer, start - 1, start + 2]; values = { question: `What number comes after ${start}?` }; explanation = `${answer} comes after ${start}.`; }
    else if (skill === "1.NBT.B.2.a") { answer = 10; choices = [10, 1, 100]; values = { question: `How many ones make one ten?` }; explanation = `Ten ones make one ten.`; }
    else if (skill === "1.NBT.B.2.b") { const ones = random.integer(1, 9); answer = 10 + ones; choices = [answer, ones, 20 + ones]; values = { question: `What number is one ten and ${ones} ones?` }; explanation = `One ten and ${ones} ones is ${answer}.`; }
    else if (skill === "1.NBT.B.2.c") { const tens = random.integer(2, 9); answer = tens * 10; choices = [answer, tens, answer + 1]; values = { question: `What number is ${tens} tens and zero ones?` }; explanation = `${tens} tens is ${answer}.`; }
    else if (skill === "1.NBT.B.3") { const left = random.integer(20, 89); const right = left + random.integer(1, 9); answer = "less than"; choices = ["less than", "greater than", "equal to"]; values = { question: `Is ${left} less than, greater than, or equal to ${right}?` }; explanation = `${left} is less than ${right}.`; }
    else if (skill === "1.NBT.C.4") { const left = random.integer(20, 70); const right = random.integer(1, 9); answer = left + right; choices = [answer, answer - 10, answer + 10]; values = { question: `What is ${left} plus ${right}?` }; explanation = `${left} plus ${right} equals ${answer}.`; }
    else if (skill === "1.NBT.C.5") { const number = random.integer(20, 89); answer = number + 10; choices = [answer, number - 10, number + 1]; values = { question: `What is 10 more than ${number}?` }; explanation = `Ten more than ${number} is ${answer}.`; }
    else if (skill === "1.NBT.C.6") { const left = random.integer(2, 9) * 10; const right = random.integer(1, Math.floor(left / 10) - 1) * 10; answer = left - right; choices = [answer, answer + 10, answer - 10]; values = { question: `What is ${left} minus ${right}?` }; explanation = `${left} minus ${right} equals ${answer}.`; }
    else if (skill === "1.MD.A.1") { answer = "longer"; choices = ["longer", "shorter", "the same length"]; values = { question: `A ribbon is 8 cubes long. A pencil is 5 cubes long. Which is longer: the ribbon or the pencil?` }; explanation = `Eight cubes is longer than five cubes.`; }
    else if (skill === "1.MD.A.2") { const length = random.integer(4, 12); answer = length; choices = [answer, answer - 1, answer + 1]; values = { question: `A crayon is ${length} cubes long. How many cubes long is it?` }; explanation = `The crayon measures ${length} cubes.`; }
    else if (skill === "1.MD.B.3") { const hour = random.integer(1, 12); answer = `${hour}:30`; choices = [answer, `${hour}:00`, `${hour === 12 ? 1 : hour + 1}:00`]; values = { question: `The minute hand points to 6 and the hour hand is between ${hour} and ${hour === 12 ? 1 : hour + 1}. What time is it?` }; explanation = `That is ${answer}.`; }
    else if (skill === "1.MD.C.4") { const cats = random.integer(3, 9); const dogs = random.integer(1, cats - 1); answer = cats - dogs; choices = [answer, answer - 1, answer + 1]; values = { question: `A chart shows ${cats} cats and ${dogs} dogs. How many more cats than dogs are there?` }; explanation = `${cats} minus ${dogs} equals ${answer}.`; }
    else if (skill === "1.G.A.1") { answer = "three sides"; choices = ["three sides", "four sides", "no sides"]; values = { question: `Which is a defining attribute of a triangle?` }; explanation = `Every triangle has three sides.`; }
    else if (skill === "1.G.A.2") { answer = "a rectangle"; choices = ["a rectangle", "a circle", "a cone"]; values = { question: `Two same-size squares are put side by side. What shape can they make?` }; explanation = `Two same-size squares can make a rectangle.`; }
    else { answer = "fourths"; choices = ["halves", "fourths", "thirds"]; values = { question: `A rectangle is split into 4 equal parts. What are the parts called?` }; explanation = `Four equal parts are fourths, also called quarters.`; }
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
