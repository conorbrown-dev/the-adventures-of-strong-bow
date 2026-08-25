import type { QuestionResponseType } from "./question-template";

export const MASTERY_STATES = ["notStarted", "learning", "practicing", "mastered", "reviewDue"] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];
export type AttemptPurpose = "learning" | "practice" | "review" | "diagnostic" | "placement" | "proctored" | "adultScored";
export type PrerequisiteSource = "explicitlyAuthored" | "inferred" | "imported";

export interface Clock { now(): Date; }
export interface AttemptEvent {
  id: string; learnerId: string; sessionId: string; questionInstanceId: string; templateId: string; templateVersion: number;
  primaryStandardId: string; supportingStandardIds: string[]; submittedAnswer: unknown; correct: boolean;
  usedHint: boolean; independent: boolean; purpose: AttemptPurpose; deliveryContext: string | null;
  responseDurationMs: number | null; attemptedAt: Date; responseType: QuestionResponseType;
  activityId?: string | null; activityVersion?: number | null; primarySkillId?: string | null; supportingSkillIds?: string[];
  evidenceMode?: string | null; supportEvents?: string[];
}
export interface MasteryRecord {
  learnerId: string; standardId: string; state: MasteryState; scoredAttemptCount: number; masteryAchievedAt: Date | null;
  reviewStage: number | null; nextReviewAt: Date | null; updatedAt: Date;
}
export interface PrerequisiteLink { standardId: string; prerequisiteStandardId: string; source: PrerequisiteSource; reviewed: boolean; }
export interface LearningTarget { learnerId: string; standardId: string; active: boolean; }
export interface DiagnosticPlacement { learnerId: string; grouping: string; grade: string; learningTargetIds: string[]; report: Record<string, unknown>; completedAt: Date; }
export interface LearningSessionRecord {
  id: string; learnerId: string; purpose: AttemptPurpose; seed: number; position: number; length: number;
  state: Record<string, unknown>; status: "active" | "completed"; createdAt: Date; updatedAt: Date; completedAt: Date | null;
}
