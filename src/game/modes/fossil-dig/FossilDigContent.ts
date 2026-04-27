import { cvcWords } from "../../data/cvcWords";
import { letters } from "../../data/letters";
import { LearningType } from "../../data/learningTypes";
import type { FossilDigVariant } from "./FossilDigConfig";

export type PromptKind = "collect_all" | "find_category" | "find_specific";
export type ValidationMode = "free_collect" | "strict_match";

export interface PromptDescriptor {
  kind: PromptKind;
  displayText: string;
  targetType?: LearningType;
  targetValue?: string;
  spokenText?: string;
}

export interface FossilDigPickupContent {
  id: string;
  label: string;
  learningType: LearningType;
}

export interface FossilDigContent {
  pickups: FossilDigPickupContent[];
  initialPrompt: PromptDescriptor;
  promptPlan: PromptDescriptor[];
  validationMode: ValidationMode;
}

export function buildFossilDigContent(
  variant: FossilDigVariant
): FossilDigContent {
  if (variant === "letters") {
    return {
      pickups: letters.map((item) => ({
        id: `letter-${item.letter.toLowerCase()}`,
        label: item.displayText,
        learningType: item.type
      })),
      initialPrompt: {
        kind: "collect_all",
        displayText: "Collect the letter fossils!"
      },
      promptPlan: [
        {
          kind: "find_category",
          displayText: "Find a vowel",
          targetType: LearningType.VOWEL
        },
        {
          kind: "find_category",
          displayText: "Find a consonant",
          targetType: LearningType.CONSONANT
        },
        {
          kind: "find_specific",
          displayText: "Find the letter A",
          targetValue: "A"
        }
      ],
      validationMode: "free_collect"
    };
  }

  return {
    pickups: cvcWords.map((item) => ({
      id: `cvc-${item.word}`,
      label: item.displayText,
      learningType: LearningType.CVC_WORD
    })),
    initialPrompt: {
      kind: "collect_all",
      displayText: "Listen to the word. Find the matching fossil."
    },
    promptPlan: [
      {
        kind: "find_specific",
        displayText: "Listen to the word. Find the matching fossil.",
        targetValue: "cat",
        spokenText: "cat"
      }
    ],
    validationMode: "strict_match"
  };
}
