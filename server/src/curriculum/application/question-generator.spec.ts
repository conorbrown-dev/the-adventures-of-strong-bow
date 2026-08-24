import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateAnswer } from "../domain/answer-evaluator";
import { generateQuestion } from "./question-generator";
import { getCurriculumPaths, loadAndValidateVendoredStandards } from "../infrastructure/vendored-standards.validator";
import { QuestionValidationError, validateQuestionInstance, validateQuestionTemplate, validateQuestionTemplateBundle } from "../infrastructure/question-template.validator";
import type { QuestionTemplate } from "../domain/question-template";
import { gradeOneMathTemplates } from "../data/grade-one-math-templates";
import { gradeOneElaTemplates } from "../data/grade-one-ela-templates";
import { gradeTwoMathTemplates } from "../data/grade-two-math-templates";
import { gradeTwoElaTemplates } from "../data/grade-two-ela-templates";
import { kindergartenMathTemplates } from "../data/kindergarten-math-templates";
import { kindergartenElaTemplates } from "../data/kindergarten-ela-templates";
import { catalogTemplateToQuestionTemplate } from "../infrastructure/k2-review-packet";
import { loadLearningStandards } from "../infrastructure/learning-standards";
import { oklahomaScienceTemplates } from "../data/oklahoma-science-templates";
import { oklahomaSocialStudiesTemplates } from "../data/oklahoma-social-studies-templates";
import { oklahomaHealthTemplates } from "../data/oklahoma-health-templates";
import { oklahomaPhysicalEducationTemplates } from "../data/oklahoma-physical-education-templates";
import { oklahomaFineArtsTemplates } from "../data/oklahoma-fine-arts-templates";
import { oklahomaComputerScienceTemplates } from "../data/oklahoma-computer-science-templates";
import { oklahomaEducationTechnologyTemplates } from "../data/oklahoma-education-technology-templates";
import { oklahomaMathTemplates } from "../data/oklahoma-math-templates";

const sourcePath = resolve(getCurriculumPaths().root, "data/curriculum/examples/question-templates.sample.json");

describe("reviewed deterministic question engine", () => {
  let standards: Awaited<ReturnType<typeof loadAndValidateVendoredStandards>>["records"];
  let templates: QuestionTemplate[];

  beforeAll(async () => {
    standards = await loadLearningStandards();
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

  it("generates valid questions for every Grade 1 mathematics template", () => {
    for (const catalogTemplate of gradeOneMathTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      for (let seed = 0; seed < 100; seed += 1) {
        try {
          validateQuestionInstance(generateQuestion(template, seed));
        } catch (error) {
          throw new Error(`${template.id} failed with seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  });

  it("generates valid questions for every Grade 1 independently assessable ELA template", () => {
    for (const catalogTemplate of gradeOneElaTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      for (let seed = 0; seed < 100; seed += 1) {
        try {
          validateQuestionInstance(generateQuestion(template, seed));
        } catch (error) {
          throw new Error(`${template.id} failed with seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  });

  it("generates valid questions for every Grade 2 mathematics template", () => {
    for (const catalogTemplate of gradeTwoMathTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      for (let seed = 0; seed < 100; seed += 1) {
        try {
          validateQuestionInstance(generateQuestion(template, seed));
        } catch (error) {
          throw new Error(`${template.id} failed with seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  });

  it("generates valid questions for every Grade 2 independently assessable ELA template", () => {
    for (const catalogTemplate of gradeTwoElaTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      for (let seed = 0; seed < 100; seed += 1) {
        try {
          validateQuestionInstance(generateQuestion(template, seed));
        } catch (error) {
          throw new Error(`${template.id} failed with seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  });

  it("generates valid questions for every added Kindergarten mathematics template", () => {
    for (const catalogTemplate of kindergartenMathTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      for (let seed = 0; seed < 100; seed += 1) {
        try {
          validateQuestionInstance(generateQuestion(template, seed));
        } catch (error) {
          throw new Error(`${template.id} failed with seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  });

  it("generates valid questions for every Kindergarten independently assessable ELA template", () => {
    for (const catalogTemplate of kindergartenElaTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      for (let seed = 0; seed < 100; seed += 1) {
        try {
          validateQuestionInstance(generateQuestion(template, seed));
        } catch (error) {
          throw new Error(`${template.id} failed with seed ${seed}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  });

  it("generates complete adult-observed tasks for every Oklahoma K–2 science standard", () => {
    for (const catalogTemplate of oklahomaScienceTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-science");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("science investigation");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId }) }));
    }
  });

  it("generates complete adult-guided inquiries for every Oklahoma K–2 social studies standard", () => {
    for (const catalogTemplate of oklahomaSocialStudiesTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-social-studies");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("social studies inquiry");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId }) }));
    }
  });

  it("generates complete adult-guided activities for every Oklahoma Health PreK–2 objective", () => {
    for (const catalogTemplate of oklahomaHealthTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-health");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("health activity");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId }) }));
    }
  });

  it("generates complete adult-observed movement activities for every Oklahoma K–2 PE outcome", () => {
    for (const catalogTemplate of oklahomaPhysicalEducationTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-pe");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("movement activity");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId }) }));
    }
  });

  it("generates complete adult-observed activities for every Oklahoma Fine Arts catalog entry", () => {
    for (const catalogTemplate of oklahomaFineArtsTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-fine-arts");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("activity");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId }) }));
    }
  });

  it("generates complete adult-guided activities for every Oklahoma K–2 computer science standard", () => {
    for (const catalogTemplate of oklahomaComputerScienceTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-computer-science");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("computer science activity");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId }) }));
    }
  });

  it("generates complete adult-guided activities for every Oklahoma K–2 educational technology target", () => {
    for (const catalogTemplate of oklahomaEducationTechnologyTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-education-technology");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("supplemental digital learning activity");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId, framework: "Oklahoma Educational Technology Standards (ISTE 2016)" }) }));
    }
  });

  it("generates complete adult-observed activities for every added Oklahoma mathematics objective", () => {
    for (const catalogTemplate of oklahomaMathTemplates) {
      const template = validateQuestionTemplate(catalogTemplateToQuestionTemplate(catalogTemplate), standards);
      const instance = generateQuestion(template, "oklahoma-kindergarten-math");
      expect(instance.responseType).toBe("constructedResponse");
      expect(instance.prompt.text).toContain("math exploration");
      expect(instance.interaction).toEqual(expect.objectContaining({ kind: "adultScored", target: expect.objectContaining({ standardId: catalogTemplate.standardId, framework: "Oklahoma Academic Standards for Mathematics 2022" }) }));
    }
  });

  it("keeps question wording aligned with the available answers", () => {
    const byId = new Map([...gradeOneMathTemplates, ...gradeOneElaTemplates].map((template) => [template.id, template]));
    const generate = (templateId: string, seed: number) => generateQuestion(catalogTemplateToQuestionTemplate(byId.get(templateId)!), seed);

    const lengthQuestion = generate("1.md.a.1.compare-length", 1);
    expect(lengthQuestion.prompt.text).toBe("A ribbon is 8 cubes long. A pencil is 5 cubes long. Which is longer?");
    expect(lengthQuestion.canonicalAnswer).toBe("the ribbon");
    expect(lengthQuestion.interaction.choices).toEqual(expect.arrayContaining([expect.objectContaining({ label: "the ribbon" }), expect.objectContaining({ label: "the pencil" })]));

    const turnAroundFacts = Array.from({ length: 20 }, (_, seed) => generate("1.oa.b.3.properties", seed));
    for (const question of turnAroundFacts) {
      const addends = question.prompt.text.match(/If (\d+) plus (\d+) equals/);
      expect(addends).not.toBeNull();
      expect(addends?.[1]).not.toBe(addends?.[2]);
    }

    const spellingQuestions = Array.from({ length: 20 }, (_, seed) => generate("1.l.2.d.spelling-patterns", seed));
    expect(new Set(spellingQuestions.map((question) => question.prompt.text))).toEqual(new Set(["Which word begins with the /sh/ sound?", "Which word has the long a sound spelled ai?"]));
    for (const question of spellingQuestions) {
      const labels = (question.interaction.choices as Array<{ label: string }>).map((choice) => choice.label);
      expect(labels).toContain(question.canonicalAnswer);
      if (question.prompt.text.includes("/sh/")) expect(labels.filter((label) => label.startsWith("sh"))).toEqual(["ship"]);
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
    if (typeof instance.canonicalAnswer === "number") expect(evaluateAnswer(instance, String(instance.canonicalAnswer))).toEqual({ correct: true, requiresHumanReview: false });
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
