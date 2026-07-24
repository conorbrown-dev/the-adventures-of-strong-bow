import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateAnswer } from "../domain/answer-evaluator";
import { generateQuestion } from "./question-generator";
import { getCurriculumPaths, loadAndValidateVendoredStandards } from "../infrastructure/vendored-standards.validator";
import { QuestionValidationError, validateQuestionInstance, validateQuestionTemplate, validateQuestionTemplateBundle } from "../infrastructure/question-template.validator";
import type { QuestionTemplate } from "../domain/question-template";

const sourcePath = resolve(getCurriculumPaths().root, "data/curriculum/examples/question-templates.sample.json");

describe("reviewed deterministic question engine", () => {
  let standards: Awaited<ReturnType<typeof loadAndValidateVendoredStandards>>["records"];
  let templates: QuestionTemplate[];

  beforeAll(async () => {
    standards = (await loadAndValidateVendoredStandards()).records;
    const raw = await readFile(sourcePath, "utf8");
    templates = JSON.parse(raw) as QuestionTemplate[];
    templates.push(...(["additionWithinRange", "subtractionWithinRange", "compareNumbers"] as const).map((kind) => ({
      ...structuredClone(templates[0]), id: `k.cc.a.1.${kind.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, generator: { kind, parameters: kind === "compareNumbers" ? { minimum: 0, maximum: 20 } : { minimum: 0, maximum: 20, choiceCount: 3 } },
      prompt: { text: kind === "additionWithinRange" ? "What is {{left}} plus {{right}}?" : kind === "subtractionWithinRange" ? "What is {{left}} minus {{right}}?" : "Which symbol compares {{left}} and {{right}}?", audioText: "{{left}} {{right}}", instructions: "Choose one answer." }
    })));
  });

  it("derives the same valid question from the same template version and seed", () => {
    const template = validateQuestionTemplate(templates[0], standards);
    expect(generateQuestion(template, "stable-seed")).toEqual(generateQuestion(template, "stable-seed"));
  });

  it("generates valid instances across 1,000 seeds for each supported template", () => {
    for (const rawTemplate of templates) {
      const template = validateQuestionTemplate(rawTemplate, standards);
      for (let seed = 0; seed < 1000; seed += 1) validateQuestionInstance(generateQuestion(template, seed));
    }
  });

  it("varies deterministically between seeds without violating arithmetic bounds", () => {
    const arithmetic = templates.slice(-3).map((rawTemplate) => validateQuestionTemplate(rawTemplate, standards));
    for (const template of arithmetic) {
      const answers = new Set<string>();
      for (let seed = 0; seed < 1000; seed += 1) {
        const instance = generateQuestion(template, seed); validateQuestionInstance(instance); answers.add(JSON.stringify(instance.canonicalAnswer));
        if (typeof instance.canonicalAnswer === "number") expect(instance.canonicalAnswer).toBeGreaterThanOrEqual(0);
      }
      expect(answers.size).toBeGreaterThan(1);
    }
  });

  it("evaluates deterministic answers without AI authority", () => {
    const instance = generateQuestion(validateQuestionTemplate(templates[0], standards), 42);
    expect(evaluateAnswer(instance, instance.canonicalAnswer)).toEqual({ correct: true, requiresHumanReview: false });
    expect(evaluateAnswer({ ...instance, responseType: "constructedResponse" }, "anything")).toEqual({ correct: false, requiresHumanReview: true });
  });

  it("rejects malformed bounds, missing provenance, and unknown standards", () => {
    const malformed = structuredClone(templates[0]); malformed.generator.parameters.minimum = 30;
    expect(() => validateQuestionTemplate(malformed, standards)).toThrow(QuestionValidationError);
    const noProvenance = structuredClone(templates[0]); delete (noProvenance as Partial<QuestionTemplate>).provenance;
    expect(() => validateQuestionTemplate(noProvenance, standards)).toThrow("provenance");
    const missingStandard = structuredClone(templates[0]); missingStandard.primaryStandardId = "K.NOT.REAL";
    expect(() => validateQuestionTemplate(missingStandard, standards)).toThrow("vendored dataset");
    const noAudio = structuredClone(templates[0]); noAudio.prompt.audioText = null;
    expect(() => validateQuestionTemplate(noAudio, standards)).toThrow("audioText");
    const emptyPrompt = structuredClone(templates[0]); emptyPrompt.prompt.text = "";
    expect(() => validateQuestionTemplate(emptyPrompt, standards)).toThrow("prompt.text");
  });

  it("rejects unreviewed production templates and duplicate template IDs", () => {
    expect(() => validateQuestionTemplate(templates[0], standards, true)).toThrow("cannot enter a production bundle");
    const reviewed = structuredClone(templates[0]); reviewed.review = { status: "reviewed", reviewer: "curriculum-reviewer", reviewedAt: "2026-07-24T00:00:00.000Z" };
    expect(validateQuestionTemplate(reviewed, standards, true).review.status).toBe("reviewed");
    expect(() => validateQuestionTemplateBundle([templates[0], templates[0]], standards)).toThrow("unique");
  });

  it("rejects duplicate or ambiguous generated choices", () => {
    const instance = generateQuestion(validateQuestionTemplate(templates[0], standards), 7);
    const choices = instance.interaction.choices as Array<{ id: string; label: string }>;
    choices[1] = { ...choices[1], label: choices[0].label };
    expect(() => validateQuestionInstance(instance)).toThrow("duplicate or ambiguous");
    const inaccessible = generateQuestion(validateQuestionTemplate(templates[0], standards), 8);
    inaccessible.accessibility.textAlternative = "";
    expect(() => validateQuestionInstance(inaccessible)).toThrow("text alternative");
  });
});
