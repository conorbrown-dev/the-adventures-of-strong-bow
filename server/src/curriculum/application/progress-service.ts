import type { AttemptEvent, Clock } from "../domain/progress";
import type { ProgressRepository } from "../domain/progress.repository";
import { advanceReview, defaultMasteryPolicy, markReviewsDue, recalculateMastery, type MasteryPolicySettings } from "./mastery-policy";

export class ProgressService {
  constructor(private readonly repository: ProgressRepository, private readonly clock: Clock, private readonly settings: MasteryPolicySettings = defaultMasteryPolicy) {}
  async recordAttempt(attempt: AttemptEvent) {
    await this.repository.addAttempt(attempt);
    const previous = await this.repository.getMastery(attempt.learnerId, attempt.primaryStandardId);
    if (attempt.purpose === "review" && (previous?.state === "mastered" || previous?.state === "reviewDue")) { const record = advanceReview(previous, attempt.correct, this.clock, this.settings); await this.repository.saveMastery(record); return record; }
    const isUnscoredAssessment = attempt.purpose === "placement" || attempt.purpose === "proctored" || attempt.purpose === "adultScored" || (attempt.purpose === "diagnostic" && !this.settings.diagnosticCountsTowardMastery);
    if (isUnscoredAssessment) return previous ?? { learnerId: attempt.learnerId, standardId: attempt.primaryStandardId, state: "notStarted" as const, scoredAttemptCount: 0, masteryAchievedAt: null, reviewStage: null, nextReviewAt: null, updatedAt: this.clock.now() };
    return this.recalculate(attempt.learnerId, attempt.primaryStandardId);
  }
  async recalculate(learnerId: string, standardId: string) { const [attempts, previous] = await Promise.all([this.repository.listAttempts(learnerId, standardId), this.repository.getMastery(learnerId, standardId)]); const record = recalculateMastery(learnerId, standardId, attempts, previous, this.clock, this.settings); await this.repository.saveMastery(record); return record; }
  async markDue(learnerId: string) { const records = markReviewsDue(await this.repository.listMastery(learnerId), this.clock); await Promise.all(records.map((record) => this.repository.saveMastery(record))); return records.filter((record) => record.state === "reviewDue"); }
  async verifyProctoredMastery(learnerId: string, standardId: string) {
    const previous = await this.repository.getMastery(learnerId, standardId);
    const record = { learnerId, standardId, state: "mastered" as const, scoredAttemptCount: previous?.scoredAttemptCount ?? 0, masteryAchievedAt: this.clock.now(), reviewStage: 0, nextReviewAt: new Date(this.clock.now().getTime() + this.settings.reviewIntervalsDays[0] * 86_400_000), updatedAt: this.clock.now() };
    await this.repository.saveMastery(record);
    return record;
  }
}
