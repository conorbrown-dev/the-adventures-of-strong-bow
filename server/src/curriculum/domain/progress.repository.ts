import type { AttemptEvent, DiagnosticPlacement, LearningTarget, MasteryRecord, PrerequisiteLink } from "./progress";

export interface ProgressRepository {
  addAttempt(attempt: AttemptEvent): Promise<void>;
  listAttempts(learnerId: string, standardId?: string): Promise<AttemptEvent[]>;
  saveMastery(record: MasteryRecord): Promise<void>;
  getMastery(learnerId: string, standardId: string): Promise<MasteryRecord | null>;
  listMastery(learnerId: string): Promise<MasteryRecord[]>;
  saveLearningTarget(target: LearningTarget): Promise<void>;
  listLearningTargets(learnerId: string): Promise<LearningTarget[]>;
  listPrerequisites(standardId: string): Promise<PrerequisiteLink[]>;
  saveDiagnosticPlacement(placement: DiagnosticPlacement): Promise<void>;
}
