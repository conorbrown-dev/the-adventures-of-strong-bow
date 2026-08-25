import type { QuestionInstance } from "../domain/question-template";
import { diagnosticQuestionFingerprint } from "./diagnostic-question-fingerprint";

const question = {
  schemaVersion: 1,
  id: "question-one",
  templateId: "template-one",
  templateVersion: 1,
  seed: 1,
  standardIds: ["K.RF.1.d"],
  responseType: "singleChoice",
  prompt: { text: "Which letter is L?", audioText: "Which letter is L?", instructions: "Choose one." },
  interaction: { choices: [{ id: "l", label: "l" }, { id: "x", label: "x" }] },
  canonicalAnswer: "l",
  answerNormalization: { trim: true, caseInsensitive: true },
  explanation: "L is correct.",
  accessibility: { spokenPrompt: "Which letter is L?", textAlternative: "Which letter is L?" },
  provenance: { origin: "original" }
} satisfies QuestionInstance;

describe("diagnosticQuestionFingerprint", () => {
  it("treats reordered choices and a new generated ID as the same educational question", () => {
    const reordered = {
      ...question,
      id: "question-two",
      interaction: { choices: [...question.interaction.choices].reverse() }
    } satisfies QuestionInstance;

    expect(diagnosticQuestionFingerprint(reordered)).toBe(diagnosticQuestionFingerprint(question));
  });

  it("distinguishes a genuinely different prompt", () => {
    const different = { ...question, prompt: { ...question.prompt, text: "Which letter is M?" } } satisfies QuestionInstance;
    expect(diagnosticQuestionFingerprint(different)).not.toBe(diagnosticQuestionFingerprint(question));
  });
});
