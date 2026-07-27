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
    interaction = template.responseType === "classification" ? { kind: "classification", items: [...selected, ...lower], categories: ["uppercase", "lowercase"], target: { uppercase: selected, lowercase: lower } } : { kind: "matching", left: selected, right: lower, target: { uppercase: selected, lowercase: lower } };
    canonicalAnswer = template.responseType === "classification" ? Object.fromEntries([...selected.map((letter) => [letter, "uppercase"]), ...lower.map((letter) => [letter, "lowercase"])]) : Object.fromEntries(selected.map((letter) => [letter, letter.toLowerCase()])); explanation = "Each uppercase letter matches the same lowercase letter.";
  } else if (template.generator.kind === "rhymeChoice") {
    const families = configuration.wordFamilies as string[]; const family = families[random.integer(0, families.length - 1)]; const words = wordFamilies[family]; const targetWord = words[random.integer(0, words.length - 1)]; const answer = words.find((word) => word !== targetWord)!; const distractors = Object.entries(wordFamilies).filter(([key]) => key !== family).flatMap(([, wordsForFamily]) => wordsForFamily);
    const count = numberParam(configuration, "choiceCount"); interaction = choiceInteraction(random.shuffle([answer, ...random.shuffle(distractors).slice(0, count - 1)])); canonicalAnswer = answer; values = { targetWord }; explanation = `${targetWord} and ${answer} end with the same sound.`;
  } else if (template.generator.kind === "cvcMedialVowel") {
    const allowed = configuration.vowels as string[]; const candidates = cvcWords.filter((candidate) => allowed.includes(candidate.vowel)); const picked = candidates[random.integer(0, candidates.length - 1)]; const count = numberParam(configuration, "choiceCount");
    interaction = choiceInteraction(random.shuffle([picked.vowel, ...random.shuffle(allowed.filter((vowel) => vowel !== picked.vowel)).slice(0, count - 1)])); canonicalAnswer = picked.vowel; values = { word: picked.word }; explanation = `The middle vowel in ${picked.word} is ${picked.vowel}.`;
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
