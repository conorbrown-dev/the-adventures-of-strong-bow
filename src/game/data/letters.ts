import { LearningType } from "./learningTypes";
import { VOWEL_ASSET_KEYS } from '../utils/assetKeys'

export interface LetterData {
  letter: string;
  type: LearningType.VOWEL | LearningType.CONSONANT;
  displayText: string;
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
