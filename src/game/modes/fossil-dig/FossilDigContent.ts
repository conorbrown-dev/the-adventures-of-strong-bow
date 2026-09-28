import { cvcWords } from "../../data/cvcWords";
import { LearningType } from "../../data/learningTypes";

export type FossilDigModuleId =
  | "cvc"
  | "short-vowels"
  | "silent-e"
  | "vowel-teams"
  | "consonant-digraphs";

interface FossilDigModuleDefinition {
  id: FossilDigModuleId;
  title: string;
  instruction: string;
  targetWords: readonly string[];
  distractorWords: readonly string[];
}

const FOSSIL_DIG_MODULES: readonly FossilDigModuleDefinition[] = [
  {
    id: "cvc",
    title: "Fossil Dig: CVC Words",
    instruction: "Listen to the word. Find the matching fossil.",
    targetWords: cvcWords.map((word) => word.displayText),
    distractorWords: cvcWords.map((word) => word.displayText)
  },
  {
    id: "short-vowels",
    title: "Fossil Dig: Short Vowels",
    instruction: "Find the word with a short vowel sound.",
    targetWords: ["cap", "hop", "hen", "pig", "dog", "sun"],
    distractorWords: ["cape", "rope", "team", "tune", "boat", "bead"]
  },
  {
    id: "silent-e",
    title: "Fossil Dig: Silent E",
    instruction: "Find the word with a silent letter E. The silent letter is last.",
    targetWords: ["cape", "kite", "tube", "hope", "cube", "fine"],
    distractorWords: ["camp", "kitten", "tub", "pencil", "nest", "step"]
  },
  {
    id: "vowel-teams",
    title: "Fossil Dig: Vowel Teams",
    instruction: "Find the word with a vowel team.",
    targetWords: ["rain", "seed", "coat", "team", "green", "snow"],
    distractorWords: ["cat", "sled", "cot", "time", "grin", "snore"]
  },
  {
    id: "consonant-digraphs",
    title: "Fossil Dig: Consonant Digraphs",
    instruction: "Find the word with a consonant digraph.",
    targetWords: ["ship", "chop", "thin", "chat", "whale", "fish"],
    distractorWords: ["sip", "cop", "tin", "cat", "wale", "fin"]
  }
];

export function getFossilDigModuleDefinition(
  moduleId: FossilDigModuleId
): FossilDigModuleDefinition {
  return FOSSIL_DIG_MODULES.find((module) => module.id === moduleId) ?? FOSSIL_DIG_MODULES[0]!;
}

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
  title: string;
  instruction: string;
  pickups: FossilDigPickupContent[];
  distractors: FossilDigPickupContent[];
  initialPrompt: PromptDescriptor;
  promptPlan: PromptDescriptor[];
  validationMode: ValidationMode;
}

export function buildFossilDigContent(
  moduleId: FossilDigModuleId = "cvc"
): FossilDigContent {
  const module = getFossilDigModuleDefinition(moduleId);
  return {
    title: module.title,
    instruction: module.instruction,
    pickups: module.targetWords.map((word) => ({
      id: `${module.id}-${word}`,
      label: word,
      learningType: LearningType.CVC_WORD
    })),
    distractors: module.distractorWords.map((word) => ({
      id: `${module.id}-distractor-${word}`,
      label: word,
      learningType: LearningType.CVC_WORD
    })),
    initialPrompt: {
      kind: "collect_all",
      displayText: module.instruction,
      spokenText: module.instruction
    },
    promptPlan: [
      {
        kind: moduleId === "cvc" ? "find_specific" : "find_category",
        displayText: module.instruction,
        spokenText: module.instruction
      }
    ],
    validationMode: "strict_match"
  };
}
