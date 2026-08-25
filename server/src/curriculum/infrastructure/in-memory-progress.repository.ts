import type { AttemptEvent, DiagnosticPlacement, LearningSessionRecord, LearningTarget, MasteryRecord, PrerequisiteLink } from "../domain/progress";
import type { ProgressRepository } from "../domain/progress.repository";
export class InMemoryProgressRepository implements ProgressRepository {
  attempts: AttemptEvent[] = []; mastery: MasteryRecord[] = []; targets: LearningTarget[] = []; prerequisites: PrerequisiteLink[] = []; placements: DiagnosticPlacement[] = []; sessions: LearningSessionRecord[] = [];
  async addAttempt(attempt: AttemptEvent) { if (!this.attempts.some((item) => item.learnerId === attempt.learnerId && item.sessionId === attempt.sessionId && item.questionInstanceId === attempt.questionInstanceId && item.purpose === attempt.purpose)) this.attempts.push(attempt); }
  async listAttempts(learnerId: string, standardId?: string) { return this.attempts.filter((attempt) => attempt.learnerId === learnerId && (!standardId || attempt.primaryStandardId === standardId)); }
  async saveMastery(record: MasteryRecord) { const index = this.mastery.findIndex((item) => item.learnerId === record.learnerId && item.standardId === record.standardId); if (index >= 0) this.mastery[index] = record; else this.mastery.push(record); }
  async getMastery(learnerId: string, standardId: string) { return this.mastery.find((item) => item.learnerId === learnerId && item.standardId === standardId) ?? null; }
  async listMastery(learnerId: string) { return this.mastery.filter((item) => item.learnerId === learnerId); }
  async saveLearningTarget(target: LearningTarget) { const index = this.targets.findIndex((item) => item.learnerId === target.learnerId && item.standardId === target.standardId); if (index >= 0) this.targets[index] = target; else this.targets.push(target); }
  async listLearningTargets(learnerId: string) { return this.targets.filter((item) => item.learnerId === learnerId); }
  async listPrerequisites(standardId: string) { return this.prerequisites.filter((item) => item.standardId === standardId); }
  async saveDiagnosticPlacement(placement: DiagnosticPlacement) { this.placements.push(placement); }
  async listDiagnosticPlacements(learnerId: string) { return this.placements.filter((item) => item.learnerId === learnerId); }
  async saveLearningSession(session: LearningSessionRecord) { const index = this.sessions.findIndex((item) => item.id === session.id); if (index >= 0) this.sessions[index] = structuredClone(session); else this.sessions.push(structuredClone(session)); }
  async findLearningSession(sessionId: string) { const session = this.sessions.find((item) => item.id === sessionId); return session ? structuredClone(session) : null; }
}
