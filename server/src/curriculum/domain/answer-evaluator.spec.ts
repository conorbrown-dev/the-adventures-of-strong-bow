import { evaluateAnswer } from "./answer-evaluator";
import type { QuestionInstance } from "./question-template";

const sequence: QuestionInstance = { schemaVersion: 1, id: "sequence", templateId: "sequence", templateVersion: 1, seed: 1, standardIds: ["K.CC.A.1"], responseType: "sequence", prompt: { text: "Order", audioText: null, instructions: null }, interaction: {}, canonicalAnswer: ["1", "2", "3"], answerNormalization: null, explanation: "", accessibility: { spokenPrompt: null, textAlternative: "" }, provenance: {} };

describe("evaluateAnswer", () => {
  it("requires sequence responses to preserve their displayed order", () => {
    expect(evaluateAnswer(sequence, ["1", "2", "3"]).correct).toBe(true);
    expect(evaluateAnswer(sequence, ["3", "2", "1"]).correct).toBe(false);
  });
});
