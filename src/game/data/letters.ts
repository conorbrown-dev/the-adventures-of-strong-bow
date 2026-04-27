import { LearningType } from "./learningTypes";

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
  { letter: "M", type: LearningType.CONSONANT, displayText: "M" },
  { letter: "N", type: LearningType.CONSONANT, displayText: "N" },
  { letter: "S", type: LearningType.CONSONANT, displayText: "S" },
  { letter: "T", type: LearningType.CONSONANT, displayText: "T" }
];

export const letters: LetterData[] = [
  vowels[0],
  consonants[3],
  consonants[5],
  vowels[1],
  consonants[6],
  consonants[4]
];
