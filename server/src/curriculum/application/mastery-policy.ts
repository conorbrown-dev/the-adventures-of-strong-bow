import type { AttemptEvent, Clock, MasteryRecord } from "../domain/progress";

export interface MasteryPolicySettings { minimumScoredAttempts: number; accuracyWindow: number; minimumAccuracy: number; minimumSessions: number; minimumTemplates: number; recentIndependentCorrect: number; reviewIntervalsDays: number[]; diagnosticCountsTowardMastery: boolean; remasteryReviewStage: number; }
export const defaultMasteryPolicy: MasteryPolicySettings = { minimumScoredAttempts: 8, accuracyWindow: 10, minimumAccuracy: 0.8, minimumSessions: 3, minimumTemplates: 2, recentIndependentCorrect: 3, reviewIntervalsDays: [1, 3, 7, 14, 30], diagnosticCountsTowardMastery: false, remasteryReviewStage: 0 };

function masteryEvidence(attempts: AttemptEvent[], settings: MasteryPolicySettings): AttemptEvent[] {
  const seen = new Set<string>();
  return [...attempts].sort((a, b) => a.attemptedAt.getTime() - b.attemptedAt.getTime()).filter((attempt) => {
    if (attempt.purpose === "proctored" || (attempt.purpose === "diagnostic" && !settings.diagnosticCountsTowardMastery)) return false;
    const key = `${attempt.primaryStandardId}:${attempt.questionInstanceId}`; if (seen.has(key)) return false; seen.add(key); return true;
  });
}

export function recalculateMastery(learnerId: string, standardId: string, attempts: AttemptEvent[], previous: MasteryRecord | null, clock: Clock, settings = defaultMasteryPolicy): MasteryRecord {
  const evidence = masteryEvidence(attempts, settings); const recent = evidence.slice(-settings.accuracyWindow); const independent = evidence.filter((attempt) => attempt.independent && !attempt.usedHint).slice(-settings.recentIndependentCorrect);
  const meets = evidence.length >= settings.minimumScoredAttempts && recent.filter((attempt) => attempt.correct).length / recent.length >= settings.minimumAccuracy && new Set(evidence.map((attempt) => attempt.sessionId)).size >= settings.minimumSessions && new Set(evidence.map((attempt) => attempt.templateId)).size >= settings.minimumTemplates && independent.length === settings.recentIndependentCorrect && independent.every((attempt) => attempt.correct);
  const wasMastered = previous?.state === "mastered" || previous?.state === "reviewDue";
  const latestReview = [...attempts].filter((attempt) => attempt.purpose === "review").at(-1);
  const failedReview = latestReview?.correct === false;
  if (failedReview && wasMastered) return { learnerId, standardId, state: "practicing", scoredAttemptCount: evidence.length, masteryAchievedAt: previous?.masteryAchievedAt ?? null, reviewStage: previous?.reviewStage ?? null, nextReviewAt: null, updatedAt: clock.now() };
  if (meets) return { learnerId, standardId, state: "practicing", scoredAttemptCount: evidence.length, masteryAchievedAt: previous?.masteryAchievedAt ?? null, reviewStage: previous?.reviewStage ?? null, nextReviewAt: previous?.nextReviewAt ?? null, updatedAt: clock.now() };
  return { learnerId, standardId, state: evidence.length === 0 ? "notStarted" : evidence.length < settings.minimumScoredAttempts ? "learning" : "practicing", scoredAttemptCount: evidence.length, masteryAchievedAt: previous?.masteryAchievedAt ?? null, reviewStage: previous?.reviewStage ?? null, nextReviewAt: previous?.nextReviewAt ?? null, updatedAt: clock.now() };
}

export function markReviewsDue(records: MasteryRecord[], clock: Clock): MasteryRecord[] { return records.map((record) => record.state === "mastered" && record.nextReviewAt && record.nextReviewAt <= clock.now() ? { ...record, state: "reviewDue", updatedAt: clock.now() } : record); }
export function advanceReview(record: MasteryRecord, correct: boolean, clock: Clock, settings = defaultMasteryPolicy): MasteryRecord { if (!correct) return { ...record, state: "practicing", nextReviewAt: null, updatedAt: clock.now() }; const stage = Math.min((record.reviewStage ?? 0) + 1, settings.reviewIntervalsDays.length - 1); return { ...record, state: "mastered", reviewStage: stage, nextReviewAt: addDays(clock.now(), settings.reviewIntervalsDays[stage]), updatedAt: clock.now() }; }
function addDays(date: Date, days: number): Date { return new Date(date.getTime() + days * 86_400_000); }
