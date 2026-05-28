import {
  consonants,
  vowels,
  type LetterData
} from "../../data/letters";
import { LearningType } from "../../data/learningTypes";
import type { LetterCatchVariant } from "./LetterCatchConfig";

export interface LetterCatchContent {
  introText: string;
  successText: string;
  targetLabelSingular: string;
  targetLabelPlural: string;
  targetType: LearningType.VOWEL | LearningType.CONSONANT;
  targetPool: LetterData[];
  distractorPool: LetterData[];
}

export function buildLetterCatchContent(
  variant: LetterCatchVariant
): LetterCatchContent {
  if (variant === "vowels") {
    return {
      introText: "Catch only vowels in the basket.",
      successText: "You filled the basket with vowels!",
      targetLabelSingular: "vowel",
      targetLabelPlural: "vowels",
      targetType: LearningType.VOWEL,
      targetPool: vowels,
      distractorPool: consonants
    };
  }

  return {
    introText: "Catch only consonants in the basket.",
    successText: "You filled the basket with consonants!",
    targetLabelSingular: "consonant",
    targetLabelPlural: "consonants",
    targetType: LearningType.CONSONANT,
    targetPool: consonants,
    distractorPool: vowels
  };
}
