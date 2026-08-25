export const ACTIVITY_PURPOSES = [
  "INSTRUCTION",
  "MODELED_EXAMPLE",
  "GUIDED_PRACTICE",
  "INDEPENDENT_PRACTICE",
  "MASTERY_CHECK",
  "REVIEW",
] as const;

export type ActivityPurpose = (typeof ACTIVITY_PURPOSES)[number];

export const EVIDENCE_MODES = [
  "SPOKEN_ONLY",
  "LISTENING",
  "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS",
  "SUPPORTED_READING",
  "INDEPENDENT_READING",
] as const;

export type EvidenceMode = (typeof EVIDENCE_MODES)[number];

export const SKILL_PROGRESS_STATES = [
  "NOT_INTRODUCED",
  "INTRODUCED",
  "PRACTICING",
  "MASTERED",
  "REVIEW_DUE",
] as const;

export type SkillProgressState = (typeof SKILL_PROGRESS_STATES)[number];
export type SkillImportance = "FOUNDATIONAL" | "CORE" | "SUPPORTING";

export interface SkillStandardMapping {
  standardId: string;
  framework: "OKLAHOMA" | "COMMON_CORE";
  relationship: "PRIMARY" | "SUPPORTING";
}

export interface ElaSkillDefinition {
  id: string;
  version: number;
  name: string;
  domain: string;
  competency: string;
  prerequisiteSkillIds: readonly string[];
  sequenceRank: number;
  importance: SkillImportance;
  standardMappings: readonly SkillStandardMapping[];
  masteryPolicyId: string;
  contentScopeId?: string;
  allowedPurposes: readonly ActivityPurpose[];
  delivery: {
    independentReading: "NONE" | "OPTIONAL" | "REQUIRED";
    audio: "REQUIRED" | "SUPPORTED" | "NOT_APPLICABLE";
  };
  review: {
    status: "validated" | "reviewed";
    reviewer: string;
    reviewedAt: string;
    notes: string;
  };
}

export interface SkillMasteryPolicy {
  id: string;
  guidedSuccessfulExamples: number;
  independentSuccessfulExamples: number;
  masterySuccessfulExamples: number;
  maximumMasteryAttempts: number;
  masteryPermittedEvidenceModes: readonly EvidenceMode[];
}
