import type { QuestionTemplate } from "../domain/question-template";
import {
  advanceDiagnostic,
  buildDiagnosticReport,
  createDiagnosticBlueprint,
  evaluateCurrentGrade,
  recordDiagnosticProbe,
  selectNextDiagnosticSkill,
  startDiagnostic,
  type DiagnosticState
} from "./diagnostic-assessment";

const domains = ["L", "RF", "RI", "RL"];
const template = (grade: "K" | "1" | "2", domain: string): QuestionTemplate => ({
  schemaVersion: 1, id: `${grade.toLowerCase()}.${domain.toLowerCase()}.probe`, version: 1, primaryStandardId: `${grade}.${domain}.1`, supportingStandardIds: [],
  subject: "ela", grade, responseType: "singleChoice", prompt: { text: "Question" }, generator: { kind: "test", parameters: {} }, difficulty: { band: 1 },
  gameModes: ["standaloneLearning"], modalities: { requiresReading: false, audioSupported: true, visualSupported: true }, diagnosticEligible: true,
  provenance: { origin: "original", license: "Project" }, review: { status: "reviewed", reviewer: "test", reviewedAt: "2026-01-01T00:00:00.000Z" }
});
const templates = (["K", "1", "2"] as const).flatMap((grade) => domains.map((domain) => template(grade, domain)));
const blueprint = () => createDiagnosticBlueprint(templates, "ELA", "Reading & Language", 7, { minimumEvidence: 2, maximumEvidence: 4, masteryThreshold: 0.75, requiredStandardsPerDomain: 1, domainMasteryThreshold: 1, gradeMasteryThreshold: 0.75, maximumItemsPerGrade: 20 });

type LearnerProfile = (grade: string, domain: string, attempt: number) => boolean;

function simulate(profile: LearnerProfile): { state: DiagnosticState; report: ReturnType<typeof buildDiagnosticReport> } {
  let state = startDiagnostic(blueprint());
  let item = 0;
  while (!state.isComplete && item < 100) {
    const skill = selectNextDiagnosticSkill(state);
    if (!skill) { state = advanceDiagnostic(state); continue; }
    const grade = state.blueprint.grades[state.gradeIndex].grade;
    const prior = state.probes.filter((probe) => probe.grade === grade && probe.standardId === skill.standardId).length;
    state = recordDiagnosticProbe(state, {
      standardId: skill.standardId, grade, domain: skill.domain, templateId: skill.templateIds[0], questionInstanceId: `question-${item}`,
      difficultyBand: 1, correct: profile(grade, skill.domain, prior), independent: true
    });
    state = advanceDiagnostic(state);
    item += 1;
  }
  return { state, report: buildDiagnosticReport(state) };
}

describe("diagnostic assessment", () => {
  it("does not establish grade mastery from one correct answer in each required domain", () => {
    let state = startDiagnostic(blueprint());
    for (let index = 0; index < domains.length; index += 1) {
      const skill = selectNextDiagnosticSkill(state)!;
      state = recordDiagnosticProbe(state, { standardId: skill.standardId, grade: "K", domain: skill.domain, templateId: skill.templateIds[0], questionInstanceId: `single-${index}`, difficultyBand: 1, correct: true, independent: true });
    }
    expect(evaluateCurrentGrade(state)).toMatchObject({ isCovered: false, isMastered: false, confidence: "LOW" });
    expect(selectNextDiagnosticSkill(state)).not.toBeNull();
  });

  it("moves to Grade 1 only after repeated evidence across all Kindergarten domains", () => {
    let state = startDiagnostic(blueprint());
    while (state.gradeIndex === 0) {
      const skill = selectNextDiagnosticSkill(state)!;
      const item = state.probes.length;
      state = advanceDiagnostic(recordDiagnosticProbe(state, { standardId: skill.standardId, grade: "K", domain: skill.domain, templateId: skill.templateIds[0], questionInstanceId: `mastery-${item}`, difficultyBand: 1, correct: true, independent: true }));
    }
    expect(state.gradeResults[0]).toMatchObject({ grade: "K", isCovered: true, isMastered: true });
    expect(state.gradeIndex).toBe(1);
    expect(state.probes).toHaveLength(8);
  });

  it("records a critical foundational gap even when every unrelated domain is strong", () => {
    const { report } = simulate((_grade, domain) => domain !== "RF");
    expect(report).toMatchObject({ instructionalGrade: "K", placementConfidence: "HIGH", totalItems: 8 });
    expect(report.criticalPrerequisiteGaps).toEqual(["K.RF.1"]);
    expect(report.demonstratedStrengths).toEqual(expect.arrayContaining(["K.L.1", "K.RI.1", "K.RL.1"]));
  });

  it("asks additional probes for inconsistent evidence instead of classifying after two", () => {
    const outcomes = [true, false, true, true];
    const { report } = simulate((grade, domain, attempt) => grade !== "K" || domain !== "L" ? false : outcomes[attempt]);
    const language = report.gradeResults[0].domains.find((domain) => domain.domain === "L")!.evidence[0];
    expect(language).toMatchObject({ attemptCount: 4, correctCount: 3, status: "MASTERED" });
  });

  it("efficiently climbs for a strong learner and stops early for a foundational learner", () => {
    const strong = simulate(() => true).report;
    const foundational = simulate(() => false).report;
    expect(strong).toMatchObject({ instructionalGrade: "2", placementConfidence: "HIGH", totalItems: 24, needsReinforcement: [] });
    expect(foundational).toMatchObject({ instructionalGrade: "K", placementConfidence: "HIGH", totalItems: 8 });
  });

  it("does not count duplicate question instances as separate evidence", () => {
    const initial = startDiagnostic(blueprint());
    const skill = selectNextDiagnosticSkill(initial)!;
    const probe = { standardId: skill.standardId, grade: "K", domain: skill.domain, templateId: skill.templateIds[0], questionInstanceId: "duplicate", difficultyBand: 1, correct: true, independent: true };
    const state = recordDiagnosticProbe(recordDiagnosticProbe(initial, probe), probe);
    expect(state.probes).toHaveLength(1);
    expect(evaluateCurrentGrade(state).isMastered).toBe(false);
  });
});

describe("diagnostic learner simulation harness", () => {
  it.each([
    { name: "A: consistently strong", profile: (() => true) as LearnerProfile, grade: "2", items: 24, criticalGaps: 0 },
    { name: "B: strong comprehension with weak phonics", profile: ((_grade: string, domain: string) => domain !== "RF") as LearnerProfile, grade: "K", items: 8, criticalGaps: 1 },
    { name: "C: mixed Kindergarten and Grade 1", profile: ((grade: string, domain: string) => grade === "K" || domain !== "RF") as LearnerProfile, grade: "1", items: 16, criticalGaps: 1 },
    { name: "D: Grade 2 capable starting at Kindergarten", profile: (() => true) as LearnerProfile, grade: "2", items: 24, criticalGaps: 0 },
    { name: "E: alternating guesses", profile: ((_grade: string, _domain: string, attempt: number) => attempt % 2 === 0) as LearnerProfile, grade: "K", items: 16, criticalGaps: 1 }
  ])("produces a transparent result for $name", ({ profile, grade, items, criticalGaps }) => {
    const { report } = simulate(profile);
    expect(report.instructionalGrade).toBe(grade);
    expect(report.totalItems).toBe(items);
    expect(report.criticalPrerequisiteGaps).toHaveLength(criticalGaps);
    expect(report.placementConfidence).toBe("HIGH");
  });
});
