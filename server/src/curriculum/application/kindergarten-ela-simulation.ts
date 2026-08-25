import { KindergartenLiteracyEngine, type KindergartenActivityCheckpoint } from "./kindergarten-literacy-engine";
import { KINDERGARTEN_ACTIVITY_EXCLUSION_WINDOW, KINDERGARTEN_ELA_SKILLS } from "../infrastructure/kindergarten-ela-catalog";
import { InMemoryProgressRepository } from "../infrastructure/in-memory-progress.repository";
import type { SkillProgressRecord } from "../domain/skill-progress";

export type KindergartenSimulationProfile = "A" | "B" | "C" | "D" | "E";

export interface KindergartenSimulationSelection {
  number: number;
  skillId: string;
  skillName: string;
  purpose: string;
  activityId: string;
  recipeId: string;
  evidenceMode: string;
  selectionReason: string;
}

const PROFILE_MASTERY: Record<KindergartenSimulationProfile, readonly string[]> = {
  A: [],
  B: [
    "ela.pa.word-awareness",
    "ela.pa.isolate.initial.set-1",
    "ela.pa.isolate.final.set-1",
    "ela.alphabet.letter-vs-symbol",
    "ela.alphabet.lowercase.set-1",
    "ela.alphabet.case-match.set-1",
    "ela.phonics.consonant-sounds.set-1",
    "ela.phonics.vowel.identity",
  ],
  C: KINDERGARTEN_ELA_SKILLS.filter((skill) => skill.sequenceRank < 120 && skill.id !== "ela.listen.literal.short-a").map((skill) => skill.id),
  D: [
    "ela.listen.literal.short-a",
    ...KINDERGARTEN_ELA_SKILLS.filter((skill) => skill.sequenceRank < 120 && skill.id !== "ela.listen.literal.short-a").map((skill) => skill.id),
  ],
  E: KINDERGARTEN_ELA_SKILLS.filter((skill) => ![
    "ela.print.sentence-features",
    "ela.text.sentence.short-a",
    "ela.read.literal.short-a",
  ].includes(skill.id)).map((skill) => skill.id),
};

function masteredProgress(learnerId: string, skillId: string, now: Date): SkillProgressRecord {
  return {
    learnerId,
    skillId,
    skillVersion: 1,
    state: "MASTERED",
    highestCompletedPhase: "MASTERY_CHECK",
    independentAttemptCount: 4,
    masteryAchievedAt: now,
    reviewStage: 0,
    nextReviewAt: new Date(now.getTime() + 86_400_000),
    updatedAt: now,
  };
}

export async function simulateKindergartenProfile(profile: KindergartenSimulationProfile, selectionCount = 20): Promise<KindergartenSimulationSelection[]> {
  const repository = new InMemoryProgressRepository();
  const learnerId = `simulation-${profile}`;
  const now = new Date("2026-08-25T12:00:00.000Z");
  await Promise.all(PROFILE_MASTERY[profile].map((skillId) => repository.saveSkillProgress(masteredProgress(learnerId, skillId, now))));
  const engine = new KindergartenLiteracyEngine(repository, () => now);
  const recentActivityIds: string[] = [];
  const selections: KindergartenSimulationSelection[] = [];

  for (let index = 0; index < selectionCount; index += 1) {
    const selection = await engine.select(learnerId, recentActivityIds, index + 1);
    const checkpoint: KindergartenActivityCheckpoint = {
      activityId: selection.activity.id,
      activityVersion: selection.activity.version,
      instanceId: `${profile}-${index + 1}`,
      selectionReason: selection.selectionReason,
      supportLevels: [],
      isRecorded: true,
      recentActivityIds: [...recentActivityIds, selection.activity.id],
    };
    selections.push({
      number: index + 1,
      skillId: selection.skill.id,
      skillName: selection.skill.name,
      purpose: selection.activity.purpose,
      activityId: selection.activity.id,
      recipeId: selection.activity.recipeId,
      evidenceMode: selection.activity.evidenceMode,
      selectionReason: selection.selectionReason,
    });
    await engine.record(learnerId, `simulation-${profile}`, checkpoint, true, selection.activity.canonicalAnswer);
    recentActivityIds.push(selection.activity.id);
    if (recentActivityIds.length > KINDERGARTEN_ACTIVITY_EXCLUSION_WINDOW) recentActivityIds.shift();
  }
  return selections;
}

export async function simulateAllKindergartenProfiles(selectionCount = 20): Promise<Record<KindergartenSimulationProfile, KindergartenSimulationSelection[]>> {
  const profiles: KindergartenSimulationProfile[] = ["A", "B", "C", "D", "E"];
  const results = await Promise.all(profiles.map(async (profile) => [profile, await simulateKindergartenProfile(profile, selectionCount)] as const));
  return Object.fromEntries(results) as Record<KindergartenSimulationProfile, KindergartenSimulationSelection[]>;
}
