import { assertDecodableText } from "../domain/decodable-scope";
import type { SkillEvidenceEvent, SkillProgressRecord } from "../domain/skill-progress";
import { InMemoryProgressRepository } from "../infrastructure/in-memory-progress.repository";
import { KINDERGARTEN_ELA_ACTIVITIES, KINDERGARTEN_ELA_SKILLS, SHORT_A_SCOPE } from "../infrastructure/kindergarten-ela-catalog";
import { validateDistractors, validateKindergartenElaCatalog } from "../infrastructure/kindergarten-ela.validator";
import { simulateAllKindergartenProfiles } from "./kindergarten-ela-simulation";
import { KindergartenLiteracyEngine, evaluateKindergartenActivity, selectKindergartenActivity } from "./kindergarten-literacy-engine";

const NOW = new Date("2026-08-25T12:00:00.000Z");

function mastered(skillId: string): SkillProgressRecord {
  return { learnerId: "learner", skillId, skillVersion: 1, state: "MASTERED", highestCompletedPhase: "MASTERY_CHECK", independentAttemptCount: 4, masteryAchievedAt: NOW, reviewStage: 0, nextReviewAt: new Date(NOW.getTime() + 86_400_000), updatedAt: NOW };
}

function evidence(primarySkillId: string, purpose: SkillEvidenceEvent["purpose"], index: number, successful = true, supportEvents: SkillEvidenceEvent["supportEvents"] = []): SkillEvidenceEvent {
  return { id: `event-${index}`, learnerId: "learner", sessionId: "session", activityInstanceId: `instance-${index}`, activityId: `activity-${index}`, activityVersion: 1, primarySkillId, supportingSkillIds: [], purpose, evidenceMode: "SPOKEN_ONLY", supportEvents, successful, response: "answer", attemptedAt: new Date(NOW.getTime() + index) };
}

describe("Kindergarten literacy engine", () => {
  it("Test A: begins with narrated, non-reading-dependent instruction", () => {
    const selected = selectKindergartenActivity([], [], [], 1);
    expect(selected.skill.id).toBe("ela.pa.word-awareness");
    expect(selected.activity).toMatchObject({ purpose: "INSTRUCTION", evidenceMode: "SPOKEN_ONLY", presentation: { kind: "TUTOR_MESSAGE" } });
  });

  it("Test B and E: routes a learner with alphabet knowledge to an unmet oral blending prerequisite", () => {
    const established = [
      "ela.pa.word-awareness", "ela.pa.isolate.initial.set-1", "ela.pa.isolate.final.set-1", "ela.alphabet.letter-vs-symbol", "ela.alphabet.lowercase.set-1",
      "ela.alphabet.case-match.set-1", "ela.phonics.consonant-sounds.set-1", "ela.phonics.vowel.identity",
    ].map(mastered);
    const selected = selectKindergartenActivity(established, [], [], 2);
    expect(selected.skill.id).toBe("ela.pa.phoneme-blend.three");
    expect(selected.activity.presentation.kind).not.toBe("CONTROLLED_TEXT");
  });

  it("Test C: advances instruction through mastery using distinct short-a examples", () => {
    const skillId = "ela.phonics.cvc.decode.short-a";
    const established = KINDERGARTEN_ELA_SKILLS.filter((skill) => skill.sequenceRank < 120 && skill.id !== "ela.listen.literal.short-a").map((skill) => mastered(skill.id));
    const history: SkillEvidenceEvent[] = [];
    const purposes = ["INSTRUCTION", "MODELED_EXAMPLE", "GUIDED_PRACTICE", "GUIDED_PRACTICE", "INDEPENDENT_PRACTICE", "INDEPENDENT_PRACTICE", "MASTERY_CHECK"] as const;
    const selectedIds: string[] = [];
    purposes.forEach((expectedPurpose, index) => {
      const selected = selectKindergartenActivity(established, history, selectedIds, index + 10);
      expect(selected.skill.id).toBe(skillId);
      expect(selected.activity.purpose).toBe(expectedPurpose);
      selectedIds.push(selected.activity.id);
      history.push(evidence(skillId, expectedPurpose, index));
    });
    expect(new Set(selectedIds.filter((id) => id.includes("independent"))).size).toBe(2);
    expect(selectedIds.every((id) => !/short-i|silent-e|digraph/.test(id))).toBe(true);
  });

  it("returns to a fresh independent item after successful guided remediation", () => {
    const skillId = "ela.pa.word-awareness";
    const history = [
      evidence(skillId, "INSTRUCTION", 1), evidence(skillId, "MODELED_EXAMPLE", 2),
      evidence(skillId, "GUIDED_PRACTICE", 3), evidence(skillId, "GUIDED_PRACTICE", 4),
      evidence(skillId, "INDEPENDENT_PRACTICE", 5, false), evidence(skillId, "INDEPENDENT_PRACTICE", 6, false),
    ];
    expect(selectKindergartenActivity([], history, [], 20).activity.purpose).toBe("GUIDED_PRACTICE");
    history.push(evidence(skillId, "GUIDED_PRACTICE", 7, true));
    expect(selectKindergartenActivity([], history, [], 21).activity.purpose).toBe("INDEPENDENT_PRACTICE");
  });

  it("Test D: keeps listening mastery separate from independent reading", async () => {
    const repository = new InMemoryProgressRepository();
    await repository.saveSkillProgress(mastered("ela.listen.literal.short-a"));
    const engine = new KindergartenLiteracyEngine(repository, () => NOW);
    const selected = await engine.select("learner", [], 3);
    expect(selected.skill.id).not.toBe("ela.read.literal.short-a");
    expect((await repository.getSkillProgress("learner", "ela.listen.literal.short-a", 1))?.state).toBe("MASTERED");
    expect(await repository.getSkillProgress("learner", "ela.read.literal.short-a", 1)).toBeNull();
  });

  it("Test H: accepts the controlled sentence and rejects untaught patterns", () => {
    expect(() => assertDecodableText("Sam sat.", SHORT_A_SCOPE)).not.toThrow();
    for (const text of ["Sam sits.", "Sam ate.", "A train came.", "The chair is here."]) {
      expect(() => assertDecodableText(text, SHORT_A_SCOPE)).toThrow("outside ela.scope.k.short-a.initial-set");
    }
  });

  it("Test I: rejects irrelevant distractors and validates the production slice", async () => {
    expect(() => validateDistractors("book-part", [
      { id: "cover", label: "cover", conceptDomain: "book-part" },
      { id: "shoe", label: "shoe", conceptDomain: "clothing", misconception: "UNCLASSIFIED" },
    ], "cover")).toThrow("outside target concept");
    await expect(validateKindergartenElaCatalog()).resolves.toBeUndefined();
  });

  it("protects independent decoding by omitting answer-revealing choice audio", () => {
    const independentDecode = KINDERGARTEN_ELA_ACTIVITIES.filter((activity) => activity.primarySkillId === "ela.phonics.cvc.decode.short-a" && activity.purpose === "INDEPENDENT_PRACTICE");
    expect(independentDecode).toHaveLength(3);
    expect(independentDecode.every((activity) => activity.presentation.kind === "CHOICE_BOARD" && activity.presentation.choices.every((choice) => !choice.audioText))).toBe(true);
  });

  it("downgrades controlled-text evidence before narrated help is used", () => {
    const activity = KINDERGARTEN_ELA_ACTIVITIES.find((candidate) => candidate.primarySkillId === "ela.text.sentence.short-a" && candidate.purpose === "INDEPENDENT_PRACTICE");
    expect(activity).toBeDefined();
    expect(evaluateKindergartenActivity(activity!, activity!.canonicalAnswer, []).evidenceMode).toBe("INDEPENDENT_READING");
    expect(evaluateKindergartenActivity(activity!, activity!.canonicalAnswer, ["L4_MODEL"]).evidenceMode).toBe("SUPPORTED_READING");
  });

  it("simulates 20 deterministic selections for all five learner profiles", async () => {
    const simulations = await simulateAllKindergartenProfiles(20);
    expect(Object.values(simulations).every((sequence) => sequence.length === 20)).toBe(true);
    expect(simulations.A.every((selection) => selection.evidenceMode !== "INDEPENDENT_READING")).toBe(true);
    expect(simulations.B[0]?.skillId).toBe("ela.pa.phoneme-blend.three");
    expect(simulations.C[0]?.skillId).toBe("ela.phonics.cvc.decode.short-a");
    expect(new Set(simulations.C.filter((selection) => selection.purpose === "INDEPENDENT_PRACTICE").map((selection) => selection.activityId)).size).toBeGreaterThanOrEqual(2);
    expect(simulations.D[0]?.skillId).toBe("ela.phonics.cvc.decode.short-a");
    expect(simulations.E[0]?.skillId).toBe("ela.print.sentence-features");
    expect(simulations.E.some((selection) => selection.skillId === "ela.text.sentence.short-a")).toBe(true);
  });
});
