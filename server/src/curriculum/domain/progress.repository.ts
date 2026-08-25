import type { AttemptEvent, DiagnosticPlacement, LearningSessionRecord, LearningTarget, MasteryRecord, PrerequisiteLink } from "./progress";
import type { SkillEvidenceEvent, SkillProgressRecord } from "./skill-progress";

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
  listDiagnosticPlacements(learnerId: string): Promise<DiagnosticPlacement[]>;
  saveLearningSession(session: LearningSessionRecord): Promise<void>;
  findLearningSession(sessionId: string): Promise<LearningSessionRecord | null>;
  addSkillEvidence(event: SkillEvidenceEvent): Promise<SkillEvidenceEvent>;
  listSkillEvidence(learnerId: string, skillId?: string): Promise<SkillEvidenceEvent[]>;
  saveSkillProgress(record: SkillProgressRecord): Promise<void>;
  getSkillProgress(learnerId: string, skillId: string, skillVersion: number): Promise<SkillProgressRecord | null>;
  listSkillProgress(learnerId: string): Promise<SkillProgressRecord[]>;
}
