import type { ActivityPurpose, EvidenceMode } from "./ela-skill";

export const LESSON_RECIPE_IDS = [
  "ela.auditory-contrast.v1",
  "ela.symbol-sound.v1",
  "ela.phoneme-sequence.v1",
  "ela.word-mapping.v1",
  "ela.print-feature.v1",
  "ela.controlled-sentence.v1",
] as const;

export type LessonRecipeId = (typeof LESSON_RECIPE_IDS)[number];
export type LessonPresentationKind = LessonPresentation["kind"];
export interface LessonRecipeDefinition {
  id: LessonRecipeId;
  version: number;
  supportedPresentationKinds: readonly LessonPresentationKind[];
  supportedPurposes: readonly ActivityPurpose[];
}
export type LessonStage = "INTRODUCE" | "MODEL" | "GUIDED" | "INDEPENDENT" | "MASTERY" | "REVIEW";
export type TutorState = "IDLE" | "SPEAKING" | "POINTING" | "ENCOURAGING" | "GENTLE_CORRECTION" | "CELEBRATING";
export type SupportLevel = "L0_REPLAY" | "L1_FOCUS" | "L2_CONTRAST" | "L3_PARTIAL" | "L4_MODEL";
export type MisconceptionTag =
  | "SOUND_POSITION_CONFUSION"
  | "VOWEL_CONTRAST_CONFUSION"
  | "CONSONANT_CONTRAST_CONFUSION"
  | "ORDER_REVERSAL"
  | "OMITTED_PHONEME"
  | "GRAPHEME_SOUND_CONFUSION"
  | "PRINT_DIRECTION_CONFUSION"
  | "LITERAL_DETAIL_CONFUSION"
  | "UNCLASSIFIED";

export interface LessonChoice {
  id: string;
  label: string;
  audioText?: string;
  visual?: string;
  conceptDomain: string;
  misconception?: MisconceptionTag;
}

export type LessonPresentation =
  | { kind: "TUTOR_MESSAGE"; displayTokens?: readonly string[]; modelText?: string; audioCueIds?: readonly string[] }
  | { kind: "CHOICE_BOARD"; choices: readonly LessonChoice[]; audioCueIds?: readonly string[] }
  | { kind: "CARD_WORKSPACE"; cards: readonly string[]; slots: number; wordAudioText?: string; audioCueIds?: readonly string[] }
  | { kind: "CONTROLLED_TEXT"; text: string; choices: readonly LessonChoice[]; helpNarration: string };

export interface LearningActivityDefinition {
  id: string;
  version: number;
  primarySkillId: string;
  supportingSkillIds: readonly string[];
  purpose: ActivityPurpose;
  recipeId: LessonRecipeId;
  stage: LessonStage;
  contentScopeId?: string;
  evidenceMode: EvidenceMode;
  prompt: string;
  narration: string;
  tutorMessage: string;
  tutorState: TutorState;
  presentation: LessonPresentation;
  canonicalAnswer: unknown;
  explanation: string;
  hintMessages: Readonly<Partial<Record<SupportLevel, string>>>;
  targetConceptDomain?: string;
  review: { status: "validated" | "reviewed"; reviewer: string; reviewedAt: string };
}

export interface LessonActivityInstance {
  instanceId: string;
  activity: LearningActivityDefinition;
  supportLevels: readonly SupportLevel[];
}

export interface LessonActivityView {
  instanceId: string;
  activityId: string;
  activityVersion: number;
  recipeId: LessonRecipeId;
  primarySkill: { id: string; name: string; domain: string };
  purpose: ActivityPurpose;
  stage: LessonStage;
  evidenceMode: EvidenceMode;
  selectionReason: string;
  tutor: { state: TutorState; message: string };
  prompt: string;
  narration: string;
  presentation: LessonPresentation;
  availableSupports: readonly SupportLevel[];
  highestSupport?: SupportLevel;
  celebrationEligible: boolean;
}

export function activityPurposeLabel(purpose: ActivityPurpose): string {
  const labels: Record<ActivityPurpose, string> = {
    INSTRUCTION: "Learn",
    MODELED_EXAMPLE: "Watch one",
    GUIDED_PRACTICE: "Try together",
    INDEPENDENT_PRACTICE: "Try by yourself",
    MASTERY_CHECK: "Check what you know",
    REVIEW: "Review",
  };
  return labels[purpose];
}
