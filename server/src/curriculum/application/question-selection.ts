import type { QuestionTemplate } from "../domain/question-template";
import type { LearningTarget, MasteryRecord, PrerequisiteLink } from "../domain/progress";
import type { Standard } from "../domain/standard";

export interface SelectionRequest { seed: string | number; standards: Standard[]; templates: QuestionTemplate[]; mastery: MasteryRecord[]; targets: LearningTarget[]; prerequisites: PrerequisiteLink[]; allowedGameModes: string[]; allowedResponseTypes: string[]; audioRequired: boolean; lastInstanceId?: string; recentTemplateIds?: string[]; }
export interface SelectionResult { template: QuestionTemplate | null; reason: string; }
function randomIndex(seed: string | number, size: number): number { let value = 2166136261; for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return size ? (value >>> 0) % size : 0; }
export function selectNextQuestion(request: SelectionRequest): SelectionResult {
  const usable = request.templates.filter((template) => template.review.status === "reviewed" && request.standards.some((standard) => standard.officialId === template.primaryStandardId && standard.active && standard.instructionalStatus !== "notApplicableAtGrade") && template.gameModes.some((mode) => request.allowedGameModes.includes(mode)) && request.allowedResponseTypes.includes(template.responseType) && (!request.audioRequired || Boolean(template.prompt.audioText)) && !request.recentTemplateIds?.includes(template.id) && !request.lastInstanceId?.startsWith(`${template.id}@${template.version}:`));
  const pick = (ids: string[], reason: string) => { const candidates = usable.filter((template) => ids.includes(template.primaryStandardId)); const template = candidates[randomIndex(request.seed, candidates.length)] ?? null; return { template, reason: template ? reason : "noEligibleContent: No reviewed, accessible template is available." }; };
  const due = request.mastery.filter((record) => record.state === "reviewDue").map((record) => record.standardId); if (due.length) return pick(due, `overdueReview: A previously mastered standard is ready to review.`);
  const targetIds = request.targets.filter((target) => target.active).map((target) => target.standardId); const gaps = request.prerequisites.filter((link) => link.reviewed && link.source === "explicitlyAuthored" && targetIds.includes(link.standardId)).map((link) => link.prerequisiteStandardId); if (gaps.length) return pick(gaps, "prerequisiteGap: A reviewed prerequisite supports an active learning target.");
  if (targetIds.length) return pick(targetIds, "learningTarget: This standard is an active learning target.");
  const practicing = request.mastery.filter((record) => record.state === "learning" || record.state === "practicing").map((record) => record.standardId); if (practicing.length) return pick(practicing, "practice: This standard is approaching mastery.");
  return pick(request.mastery.filter((record) => record.state === "mastered").map((record) => record.standardId), "retrieval: This is mixed practice from a mastered standard.");
}
