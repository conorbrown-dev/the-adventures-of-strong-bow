import type { ActivityPurpose, EvidenceMode, SkillProgressState } from "./ela-skill";
import type { SupportLevel } from "./learning-activity";

export interface SkillProgressRecord {
  learnerId: string;
  skillId: string;
  skillVersion: number;
  state: SkillProgressState;
  highestCompletedPhase: ActivityPurpose | null;
  independentAttemptCount: number;
  masteryAchievedAt: Date | null;
  reviewStage: number | null;
  nextReviewAt: Date | null;
  updatedAt: Date;
}

export interface SkillEvidenceEvent {
  id: string;
  learnerId: string;
  sessionId: string;
  activityInstanceId: string;
  activityId: string;
  activityVersion: number;
  primarySkillId: string;
  supportingSkillIds: string[];
  purpose: ActivityPurpose;
  evidenceMode: EvidenceMode;
  supportEvents: SupportLevel[];
  successful: boolean;
  response: unknown;
  attemptedAt: Date;
}

export function emptySkillProgress(learnerId: string, skillId: string, skillVersion: number, now: Date): SkillProgressRecord {
  return {
    learnerId,
    skillId,
    skillVersion,
    state: "NOT_INTRODUCED",
    highestCompletedPhase: null,
    independentAttemptCount: 0,
    masteryAchievedAt: null,
    reviewStage: null,
    nextReviewAt: null,
    updatedAt: now,
  };
}
