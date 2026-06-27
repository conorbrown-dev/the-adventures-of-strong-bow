import { LearningType } from "./learningTypes";
import { VOWEL_ASSET_KEYS } from '../utils/assetKeys'

export interface LetterData {
  letter: string;
  type: LearningType.VOWEL | LearningType.CONSONANT;
  displayText: string;
}

export enum VowelType {
  OPEN = "OPEN",
  CLOSED = "CLOSED"
}

export interface VowelsAnWordsData {
  vowel: string;
  word: string;
  displayWordText: string,
  vowelType: VowelType
}

export const vowels: LetterData[] = [
  { letter: "A", type: LearningType.VOWEL, displayText: "A" },
  { letter: "E", type: LearningType.VOWEL, displayText: "E" },
  { letter: "I", type: LearningType.VOWEL, displayText: "I" },
  { letter: "O", type: LearningType.VOWEL, displayText: "O" },
  { letter: "U", type: LearningType.VOWEL, displayText: "U" }
];

export const consonants: LetterData[] = [
  { letter: "B", type: LearningType.CONSONANT, displayText: "B" },
  { letter: "C", type: LearningType.CONSONANT, displayText: "C" },
  { letter: "D", type: LearningType.CONSONANT, displayText: "D" },
  { letter: "F", type: LearningType.CONSONANT, displayText: "F" },
  { letter: "G", type: LearningType.CONSONANT, displayText: "G" },
  { letter: "H", type: LearningType.CONSONANT, displayText: "H" },
  { letter: "J", type: LearningType.CONSONANT, displayText: "J" },
  { letter: "K", type: LearningType.CONSONANT, displayText: "K" },
  { letter: "L", type: LearningType.CONSONANT, displayText: "L" },
  { letter: "M", type: LearningType.CONSONANT, displayText: "M" },
  { letter: "N", type: LearningType.CONSONANT, displayText: "N" },
  { letter: "P", type: LearningType.CONSONANT, displayText: "P" },
  { letter: "Q", type: LearningType.CONSONANT, displayText: "Q" },
  { letter: "R", type: LearningType.CONSONANT, displayText: "R" },
  { letter: "S", type: LearningType.CONSONANT, displayText: "S" },
  { letter: "T", type: LearningType.CONSONANT, displayText: "T" },
  { letter: "V", type: LearningType.CONSONANT, displayText: "V" },
  { letter: "W", type: LearningType.CONSONANT, displayText: "W" },
  { letter: "X", type: LearningType.CONSONANT, displayText: "X" },
  { letter: "Y", type: LearningType.CONSONANT, displayText: "Y" },
  { letter: "Z", type: LearningType.CONSONANT, displayText: "Z" }
];

export const vowelsAndWords: VowelsAnWordsData[] = [
  {
    displayWordText: "ba",
    vowel: "a",
    word: "ba",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "ca",
    vowel: "a",
    word: "ca",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "da",
    vowel: "a",
    word: "da",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "ga",
    vowel: "a",
    word: "ga",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "la",
    vowel: "a",
    word: "la",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "ma",
    vowel: "a",
    word: "ma",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "pa",
    vowel: "a",
    word: "pa",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "ra",
    vowel: "a",
    word: "ra",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "ta",
    vowel: "a",
    word: "ta",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "va",
    vowel: "a",
    word: "va",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "be",
    vowel: "e",
    word: "be",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "he",
    vowel: "e",
    word: "he",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "me",
    vowel: "e",
    word: "me",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "we",
    vowel: "e",
    word: "we",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "ze",
    vowel: "e",
    word: "ze",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "bi",
    vowel: "i",
    word: "bi",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "hi",
    vowel: "i",
    word: "hi",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "li",
    vowel: "i",
    word: "li",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "mi",
    vowel: "i",
    word: "mi",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "ti",
    vowel: "i",
    word: "ti",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "go",
    vowel: "o",
    word: "go",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "no",
    vowel: "o",
    word: "no",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "so",
    vowel: "o",
    word: "so",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "bo",
    vowel: "o",
    word: "bo",
    vowelType: VowelType.OPEN
  },
  {
    displayWordText: "cu",
    vowel: "u",
    word: "cu",
    vowelType: VowelType.OPEN
  },

  {
    displayWordText: "cat",
    vowel: "a",
    word: "cat",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "bat",
    vowel: "a",
    word: "bat",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "rat",
    vowel: "a",
    word: "rat",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "sat",
    vowel: "a",
    word: "sat",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "mat",
    vowel: "a",
    word: "mat",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "hat",
    vowel: "a",
    word: "hat",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "fan",
    vowel: "a",
    word: "fan",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "pan",
    vowel: "a",
    word: "pan",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "map",
    vowel: "a",
    word: "map",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "tap",
    vowel: "a",
    word: "tap",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "bed",
    vowel: "e",
    word: "bed",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "red",
    vowel: "e",
    word: "red",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "met",
    vowel: "e",
    word: "met",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "pet",
    vowel: "e",
    word: "pet",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "hen",
    vowel: "e",
    word: "hen",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "ten",
    vowel: "e",
    word: "ten",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "fit",
    vowel: "i",
    word: "fit",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "lit",
    vowel: "i",
    word: "lit",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "bit",
    vowel: "i",
    word: "bit",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "sit",
    vowel: "i",
    word: "sit",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "pin",
    vowel: "i",
    word: "pin",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "pig",
    vowel: "i",
    word: "pig",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "hop",
    vowel: "o",
    word: "hop",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "pot",
    vowel: "o",
    word: "pot",
    vowelType: VowelType.CLOSED
  },
  {
    displayWordText: "sun",
    vowel: "u",
    word: "sun",
    vowelType: VowelType.CLOSED
  }
]

export type VowelId = "a" | "e" | "i" | "o" | "u";

export interface VowelDefinition {
  id: VowelId;
  name: string;
  textureKey: string;
}

export const vowelCatalog: Record<VowelId, VowelDefinition> = {
  a: {
    id: "a",
    name: "a",
    textureKey: VOWEL_ASSET_KEYS.A
  },
  e: {
    id: "e",
    name: "e",
    textureKey: VOWEL_ASSET_KEYS.E
  },
  i: {
    id: "i",
    name: "i",
    textureKey: VOWEL_ASSET_KEYS.I
  },
  o: {
    id: "o",
    name: "o",
    textureKey: VOWEL_ASSET_KEYS.O
  },
  u: {
    id: "u",
    name: "u",
    textureKey: VOWEL_ASSET_KEYS.U
  }
};

const vowelPool = Object.values(vowelCatalog);

export function getRandomVowel(): VowelDefinition {
  return vowelPool[Math.floor(Math.random() * vowelPool.length)];
}

export function getVowelById(id: VowelId): VowelDefinition {
  return vowelCatalog[id];
}
