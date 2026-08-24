import type { MasteryRecord } from "../domain/progress";
import type { QuestionTemplate } from "../domain/question-template";
import { selectNextLearningTemplates } from "./curriculum-sequence";

function template(id: string, standardId: string, subject: "math" | "ela"): QuestionTemplate {
  return { schemaVersion: 1, id, version: 1, primaryStandardId: standardId, supportingStandardIds: [], subject, grade: "K", responseType: "singleChoice", prompt: { text: "Question" }, generator: { kind: "nextNumber", parameters: { minimum: 0, maximum: 10, choiceCount: 3 } }, difficulty: { band: 1 }, gameModes: ["standaloneLearning"], modalities: { requiresReading: false, audioSupported: true, visualSupported: true }, provenance: { origin: "original", license: "test" }, review: { status: "reviewed" } };
}

function mastery(standardId: string, state: MasteryRecord["state"]): MasteryRecord {
  return { learnerId: "learner", standardId, state, scoredAttemptCount: 0, masteryAchievedAt: null, reviewStage: null, nextReviewAt: null, updatedAt: new Date("2026-01-01") };
}

describe("selectNextLearningTemplates", () => {
  const mathTemplates = [
    template("shapes", "K.G.A.1", "math"), template("addition", "K.OA.A.1", "math"), template("count", "K.CC.A.1", "math"), template("number", "K.N.1.1", "math"), template("measure", "K.MD.A.1", "math"), template("data", "K.D.1.1", "math")
  ];

  it("keeps practice in the earliest unmastered standards instead of a random pool", () => {
    expect(selectNextLearningTemplates(mathTemplates, []).map((item) => item.primaryStandardId)).toEqual(["K.CC.A.1", "K.N.1.1", "K.OA.A.1", "K.MD.A.1"]);
  });

  it("moves past mastered skills and gives due reviews priority", () => {
    expect(selectNextLearningTemplates(mathTemplates, [mastery("K.CC.A.1", "mastered")]).map((item) => item.primaryStandardId)).not.toContain("K.CC.A.1");
    expect(selectNextLearningTemplates(mathTemplates, [mastery("K.G.A.1", "reviewDue")]).map((item) => item.primaryStandardId)).toEqual(["K.G.A.1"]);
  });
});
