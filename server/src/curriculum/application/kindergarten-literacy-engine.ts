import { randomUUID } from "node:crypto";
import type { ProgressRepository } from "../domain/progress.repository";
import type { ActivityPurpose, ElaSkillDefinition, EvidenceMode } from "../domain/ela-skill";
import type { LearningActivityDefinition, LessonActivityView, MisconceptionTag, SupportLevel } from "../domain/learning-activity";
import { emptySkillProgress, type SkillEvidenceEvent, type SkillProgressRecord } from "../domain/skill-progress";
import { KINDERGARTEN_ELA_ACTIVITIES, KINDERGARTEN_ELA_SKILLS, KINDERGARTEN_MASTERY_POLICY, catalogSkill } from "../infrastructure/kindergarten-ela-catalog";

export interface KindergartenActivityCheckpoint {
  activityId: string;
  activityVersion: number;
  instanceId: string;
  selectionReason: string;
  supportLevels: SupportLevel[];
  isRecorded: boolean;
  recentActivityIds: string[];
  recordedResult?: EvaluationResult & { masteryState: SkillProgressRecord["state"]; complete: boolean; retry: false };
}

export interface ActivitySelection {
  activity: LearningActivityDefinition;
  skill: ElaSkillDefinition;
  selectionReason: string;
}

export interface EvaluationResult {
  correct: boolean;
  explanation: string;
  misconception: MisconceptionTag;
  evidenceMode: EvidenceMode;
  celebrate: boolean;
  tutorState: "ENCOURAGING" | "GENTLE_CORRECTION" | "CELEBRATING";
  tutorMessage: string;
}
export interface KindergartenRecordResult {
  progress: SkillProgressRecord;
  evidence: SkillEvidenceEvent;
  isNew: boolean;
}

const importanceRank = { FOUNDATIONAL: 0, CORE: 1, SUPPORTING: 2 } as const;
const supportRank: Record<SupportLevel, number> = { L0_REPLAY: 0, L1_FOCUS: 1, L2_CONTRAST: 2, L3_PARTIAL: 3, L4_MODEL: 4 };

function successfulCount(evidence: readonly SkillEvidenceEvent[], purpose: ActivityPurpose, requiresNoInstructionalSupport = false): number {
  return evidence.filter((event) => event.purpose === purpose && event.successful && (!requiresNoInstructionalSupport || event.supportEvents.every((support) => support === "L0_REPLAY"))).length;
}

function nextPurpose(evidence: readonly SkillEvidenceEvent[]): ActivityPurpose {
  if (successfulCount(evidence, "INSTRUCTION") < 1) return "INSTRUCTION";
  if (successfulCount(evidence, "MODELED_EXAMPLE") < 1) return "MODELED_EXAMPLE";
  if (successfulCount(evidence, "GUIDED_PRACTICE") < KINDERGARTEN_MASTERY_POLICY.guidedSuccessfulExamples) return "GUIDED_PRACTICE";
  const recentIndependentDifficulty = evidence.filter((event) => event.purpose === "INDEPENDENT_PRACTICE" || event.purpose === "MASTERY_CHECK").slice(-2);
  const latestEvent = evidence[evidence.length - 1];
  const hasCompletedRemediation = latestEvent?.purpose === "GUIDED_PRACTICE" && latestEvent.successful;
  if (recentIndependentDifficulty.length === 2 && recentIndependentDifficulty.every((event) => !event.successful) && !hasCompletedRemediation) return "GUIDED_PRACTICE";
  if (successfulCount(evidence, "INDEPENDENT_PRACTICE", true) < KINDERGARTEN_MASTERY_POLICY.independentSuccessfulExamples) return "INDEPENDENT_PRACTICE";
  return "MASTERY_CHECK";
}

function readySkills(progress: readonly SkillProgressRecord[]): ElaSkillDefinition[] {
  const states = new Map(progress.map((record) => [record.skillId, record.state]));
  return KINDERGARTEN_ELA_SKILLS.filter((skill) => states.get(skill.id) !== "MASTERED" && skill.prerequisiteSkillIds.every((prerequisiteId) => states.get(prerequisiteId) === "MASTERED"))
    .sort((left, right) => importanceRank[left.importance] - importanceRank[right.importance] || left.sequenceRank - right.sequenceRank || left.id.localeCompare(right.id));
}

function deterministicIndex(seed: number, key: string, length: number): number {
  let value = seed >>> 0;
  for (const character of key) value = Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0;
  return value % length;
}

export function selectKindergartenActivity(
  progress: readonly SkillProgressRecord[],
  evidence: readonly SkillEvidenceEvent[],
  recentActivityIds: readonly string[],
  seed: number,
): ActivitySelection {
  const ready = readySkills(progress);
  const skill = ready[0];
  if (!skill) throw new Error("The reviewed Kindergarten short-a slice is complete. More curriculum is pending review.");
  const skillEvidence = evidence.filter((event) => event.primarySkillId === skill.id);
  const purpose = nextPurpose(skillEvidence);
  const allCandidates = KINDERGARTEN_ELA_ACTIVITIES.filter((activity) => activity.primarySkillId === skill.id && activity.purpose === purpose);
  const unseenCandidates = allCandidates.filter((activity) => !recentActivityIds.includes(activity.id));
  const candidates = unseenCandidates.length > 0 ? unseenCandidates : allCandidates;
  if (candidates.length === 0) throw new Error(`No ${purpose} activity is available for ${skill.id}.`);
  const activity = candidates[deterministicIndex(seed, `${skill.id}:${purpose}:${recentActivityIds.length}`, candidates.length)];
  const isRemediation = purpose === "GUIDED_PRACTICE" && successfulCount(skillEvidence, "GUIDED_PRACTICE") >= KINDERGARTEN_MASTERY_POLICY.guidedSuccessfulExamples;
  const selectionReason = isRemediation
    ? `${skill.name}: two recent independent responses need a short guided review.`
    : `${skill.name}: prerequisites are mastered and ${purpose.toLowerCase().split("_").join(" ")} is the next unfinished phase.`;
  return { activity, skill, selectionReason };
}

export function activityByCheckpoint(checkpoint: KindergartenActivityCheckpoint): LearningActivityDefinition {
  const activity = KINDERGARTEN_ELA_ACTIVITIES.find((candidate) => candidate.id === checkpoint.activityId && candidate.version === checkpoint.activityVersion);
  if (!activity) throw new Error("This Kindergarten lesson activity version is no longer available.");
  return activity;
}

export function activityView(checkpoint: KindergartenActivityCheckpoint): LessonActivityView {
  const activity = activityByCheckpoint(checkpoint);
  const skill = catalogSkill(activity.primarySkillId);
  const highestSupport = [...checkpoint.supportLevels].sort((left, right) => supportRank[right] - supportRank[left])[0];
  return {
    instanceId: checkpoint.instanceId,
    activityId: activity.id,
    activityVersion: activity.version,
    recipeId: activity.recipeId,
    primarySkill: { id: skill.id, name: skill.name, domain: skill.domain },
    purpose: activity.purpose,
    stage: activity.stage,
    evidenceMode: evidenceModeAfterSupport(activity.evidenceMode, checkpoint.supportLevels),
    selectionReason: checkpoint.selectionReason,
    tutor: { state: activity.tutorState, message: activity.tutorMessage },
    prompt: activity.prompt,
    narration: activity.narration,
    presentation: activity.presentation,
    availableSupports: activity.purpose === "INSTRUCTION" || activity.purpose === "MODELED_EXAMPLE" ? [] : ["L1_FOCUS", "L2_CONTRAST", "L3_PARTIAL", "L4_MODEL"],
    ...(highestSupport ? { highestSupport } : {}),
    celebrationEligible: activity.purpose === "INDEPENDENT_PRACTICE" || activity.purpose === "MASTERY_CHECK" || activity.purpose === "REVIEW",
  };
}

function evidenceModeAfterSupport(mode: EvidenceMode, supports: readonly SupportLevel[]): EvidenceMode {
  const hasInstructionalSupport = supports.some((support) => support !== "L0_REPLAY");
  if (!hasInstructionalSupport) return mode;
  return mode === "INDEPENDENT_READING" ? "SUPPORTED_READING" : mode;
}

export function evaluateKindergartenActivity(activity: LearningActivityDefinition, answer: unknown, supports: readonly SupportLevel[]): EvaluationResult {
  const correct = Array.isArray(activity.canonicalAnswer)
    ? Array.isArray(answer) && activity.canonicalAnswer.length === answer.length && activity.canonicalAnswer.every((value, index) => value === answer[index])
    : activity.canonicalAnswer === answer;
  const selectedChoice = (activity.presentation.kind === "CHOICE_BOARD" || activity.presentation.kind === "CONTROLLED_TEXT") && typeof answer === "string"
    ? activity.presentation.choices.find((choice) => choice.id === answer)
    : undefined;
  const misconception = correct ? "UNCLASSIFIED" : selectedChoice?.misconception ?? (activity.presentation.kind === "CARD_WORKSPACE" ? "ORDER_REVERSAL" : "UNCLASSIFIED");
  const specificFeedback: Partial<Record<MisconceptionTag, string>> = {
    CONSONANT_CONTRAST_CONFUSION: "The middle part may match. Check the first and last sounds in order.",
    VOWEL_CONTRAST_CONFUSION: "Listen again to the middle sound. Compare it with short a.",
    ORDER_REVERSAL: "Those parts are in a different order. Start on the left and try each part again.",
    PRINT_DIRECTION_CONFUSION: "Start at the left side and move toward the right.",
    LITERAL_DETAIL_CONFUSION: "Look or listen for the action word in the sentence.",
  };
  const explanation = correct ? activity.explanation : specificFeedback[misconception] ?? "That answer shows a different idea. Use one hint or try a fresh example.";
  const celebrate = correct && (activity.purpose === "INDEPENDENT_PRACTICE" || activity.purpose === "MASTERY_CHECK" || activity.purpose === "REVIEW");
  return {
    correct,
    explanation,
    misconception,
    evidenceMode: evidenceModeAfterSupport(activity.evidenceMode, supports),
    celebrate,
    tutorState: celebrate ? "CELEBRATING" : correct ? "ENCOURAGING" : "GENTLE_CORRECTION",
    tutorMessage: explanation,
  };
}

function deriveProgress(learnerId: string, skill: ElaSkillDefinition, evidence: readonly SkillEvidenceEvent[], now: Date): SkillProgressRecord {
  const current = emptySkillProgress(learnerId, skill.id, skill.version, now);
  const masterySuccess = successfulCount(evidence, "MASTERY_CHECK", true);
  const independentSuccess = successfulCount(evidence, "INDEPENDENT_PRACTICE", true);
  const guidedSuccess = successfulCount(evidence, "GUIDED_PRACTICE");
  const hasModeled = successfulCount(evidence, "MODELED_EXAMPLE") > 0;
  const hasInstruction = successfulCount(evidence, "INSTRUCTION") > 0;
  if (masterySuccess >= KINDERGARTEN_MASTERY_POLICY.masterySuccessfulExamples) return { ...current, state: "MASTERED", highestCompletedPhase: "MASTERY_CHECK", independentAttemptCount: evidence.filter((event) => event.purpose === "INDEPENDENT_PRACTICE" || event.purpose === "MASTERY_CHECK").length, masteryAchievedAt: now, reviewStage: 0, nextReviewAt: new Date(now.getTime() + 86_400_000), updatedAt: now };
  if (independentSuccess >= KINDERGARTEN_MASTERY_POLICY.independentSuccessfulExamples) return { ...current, state: "PRACTICING", highestCompletedPhase: "INDEPENDENT_PRACTICE", independentAttemptCount: evidence.filter((event) => event.purpose === "INDEPENDENT_PRACTICE").length, updatedAt: now };
  if (guidedSuccess >= KINDERGARTEN_MASTERY_POLICY.guidedSuccessfulExamples) return { ...current, state: "PRACTICING", highestCompletedPhase: "GUIDED_PRACTICE", updatedAt: now };
  if (hasInstruction && hasModeled) return { ...current, state: "INTRODUCED", highestCompletedPhase: "MODELED_EXAMPLE", updatedAt: now };
  if (hasInstruction) return { ...current, state: "INTRODUCED", highestCompletedPhase: "INSTRUCTION", updatedAt: now };
  return current;
}

export class KindergartenLiteracyEngine {
  constructor(private readonly repository: ProgressRepository, private readonly now: () => Date = () => new Date()) {}

  async select(learnerId: string, recentActivityIds: readonly string[], seed: number): Promise<ActivitySelection> {
    const [progress, evidence] = await Promise.all([this.repository.listSkillProgress(learnerId), this.repository.listSkillEvidence(learnerId)]);
    return selectKindergartenActivity(progress, evidence, recentActivityIds, seed);
  }

  async record(
    learnerId: string,
    sessionId: string,
    checkpoint: KindergartenActivityCheckpoint,
    successful: boolean,
    response: unknown,
    evidenceMode?: EvidenceMode,
  ): Promise<KindergartenRecordResult> {
    const activity = activityByCheckpoint(checkpoint);
    const event: SkillEvidenceEvent = {
      id: randomUUID(), learnerId, sessionId, activityInstanceId: checkpoint.instanceId, activityId: activity.id, activityVersion: activity.version,
      primarySkillId: activity.primarySkillId, supportingSkillIds: [...activity.supportingSkillIds], purpose: activity.purpose,
      evidenceMode: evidenceMode ?? evidenceModeAfterSupport(activity.evidenceMode, checkpoint.supportLevels), supportEvents: [...checkpoint.supportLevels],
      successful, response, attemptedAt: this.now(),
    };
    const acceptedEvidence = await this.repository.addSkillEvidence(event);
    const evidence = await this.repository.listSkillEvidence(learnerId, activity.primarySkillId);
    const progress = deriveProgress(learnerId, catalogSkill(activity.primarySkillId), evidence, this.now());
    await this.repository.saveSkillProgress(progress);
    return { progress, evidence: acceptedEvidence, isNew: acceptedEvidence.id === event.id };
  }

  addHint(checkpoint: KindergartenActivityCheckpoint, requested?: SupportLevel): { checkpoint: KindergartenActivityCheckpoint; message: string; narration?: string } {
    const activity = activityByCheckpoint(checkpoint);
    const levels: SupportLevel[] = ["L1_FOCUS", "L2_CONTRAST", "L3_PARTIAL", "L4_MODEL"];
    const next = requested ?? levels[Math.min(checkpoint.supportLevels.filter((support) => support !== "L0_REPLAY").length, levels.length - 1)];
    if (!levels.includes(next)) throw new Error("That support is not available for this activity.");
    const supportLevels = checkpoint.supportLevels.includes(next) ? checkpoint.supportLevels : [...checkpoint.supportLevels, next];
    const message = activity.hintMessages[next] ?? "Try the next small step with the tutor.";
    const narration = next === "L4_MODEL" && activity.presentation.kind === "CONTROLLED_TEXT" ? activity.presentation.helpNarration : undefined;
    return { checkpoint: { ...checkpoint, supportLevels }, message, ...(narration ? { narration } : {}) };
  }
}
