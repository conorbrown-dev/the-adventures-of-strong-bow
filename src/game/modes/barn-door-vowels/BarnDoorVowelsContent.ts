import { LearningType } from "../../data/learningTypes";

export type PromptKind = "collect_all" | "find_category" | "find_specific";
export type ValidationMode = "free_collect" | "strict_match";

export interface PromptDescriptor {
  kind: PromptKind;
  displayText: string;
  targetType?: LearningType;
  targetValue?: string;
  spokenText?: string;
}

export interface BarnDoorVowelsContent {
  // TODO: clean this up if not needed as reference
  // initialPrompt: PromptDescriptor;
  // promptPlan: PromptDescriptor[];
  // validationMode: ValidationMode;
  vowels: string[]
}

export function buildBarnDoorVowelsContent(
): BarnDoorVowelsContent {
  return {
    vowels: [],
    // TODO: clean this up if not needed as reference
    // initialPrompt: {
    //   kind: "collect_all",
    //   displayText: "Listen to the word. Find the matching fossil."
    // },
    // promptPlan: [
    //   {
    //     kind: "find_specific",
    //     displayText: "Listen to the word. Find the matching fossil.",
    //     targetValue: "cat",
    //     spokenText: "cat"
    //   }
    // ],
    // validationMode: "strict_match"
  };
}
