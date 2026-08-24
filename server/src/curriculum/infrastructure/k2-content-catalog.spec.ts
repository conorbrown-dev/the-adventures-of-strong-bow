import { kindergartenCoverageReport, loadK2ContentCatalog, validateK2ContentCatalog } from "./k2-content-catalog";
import { createTemplateReview } from "./k2-review-packet";
import { loadAndValidateVendoredStandards } from "./vendored-standards.validator";
import { gradeTwoMathTemplates } from "../data/grade-two-math-templates";
import { gradeTwoElaTemplates } from "../data/grade-two-ela-templates";
import { gradeTwoElaAdultTemplates } from "../data/grade-two-ela-adult-templates";
import { kindergartenMathTemplates } from "../data/kindergarten-math-templates";
import { kindergartenElaTemplates } from "../data/kindergarten-ela-templates";
import { kindergartenElaAdultTemplates } from "../data/kindergarten-ela-adult-templates";

describe("Kindergarten production content catalog", () => {
  it("validates the catalog and preserves human review boundaries", async () => {
    const catalog = await loadK2ContentCatalog();
    await expect(validateK2ContentCatalog()).resolves.toMatchObject({ templates: expect.any(Number) });
    const kindergarten = catalog.templates.filter((template) => template.grade === "K");
    const originalReviewed = kindergarten.filter((template) => template.review.reviewer === "Conor Brown");
    expect(originalReviewed).toHaveLength(27);
    expect(originalReviewed.every((template) => template.review.contentHash)).toBe(true);
    expect(kindergarten).toHaveLength(109);
    expect(kindergarten.every((template) => template.review.status === "reviewed")).toBe(true);
  });

  it("does not claim diagnostic readiness until four probes receive human approval", async () => {
    const coverage = await kindergartenCoverageReport();
    expect(Object.keys(coverage)).toEqual(["K.RF.1.d", "K.RF.2.a", "K.RF.2.d", "K.CC.A.1", "K.CC.A.2", "K.CC.A.3"]);
    for (const item of Object.values(coverage)) {
      expect(item.total).toBeGreaterThanOrEqual(4);
      expect(item.status).toBe("assessment-ready");
    }
  });

  it("covers every Kindergarten mathematics target", async () => {
    const standards = (await loadAndValidateVendoredStandards()).records.filter((standard) => standard.grade === "K" && standard.subject === "math" && standard.active && standard.instructionalStatus === "assessable").map((standard) => standard.officialId).sort();
    const catalog = await loadK2ContentCatalog();
    const covered = [...new Set(catalog.templates.filter((template) => template.grade === "K" && template.subject === "math" && template.review.status === "reviewed").map((template) => template.standardId))].sort();
    expect(covered).toEqual(standards);
    expect(kindergartenMathTemplates).toHaveLength(21);
  });

  it("maps every Kindergarten ELA target to either an independent or adult-scored activity", async () => {
    const standards = (await loadAndValidateVendoredStandards()).records.filter((standard) => standard.grade === "K" && standard.subject === "ela" && standard.active && standard.instructionalStatus === "assessable").map((standard) => standard.officialId).sort();
    const catalog = await loadK2ContentCatalog();
    const covered = [...new Set(catalog.templates.filter((template) => template.grade === "K" && template.subject === "ela" && template.review.status === "reviewed").map((template) => template.standardId))].sort();
    expect(covered).toEqual(standards);
    expect(kindergartenElaTemplates.every((template) => template.diagnosticEligible && template.responseType === "singleChoice")).toBe(true);
    expect(kindergartenElaAdultTemplates.every((template) => !template.diagnosticEligible && template.responseType === "constructedResponse")).toBe(true);
  });

  it("includes every independently assessable Grade 2 mathematics target", async () => {
    const standards = (await loadAndValidateVendoredStandards()).records.filter((standard) => standard.grade === "2" && standard.subject === "math" && standard.active && standard.instructionalStatus === "assessable").map((standard) => standard.officialId).sort();
    expect(gradeTwoMathTemplates.map((template) => template.standardId).sort()).toEqual(standards);
    expect(gradeTwoMathTemplates.every((template) => template.review.status === "reviewed" && template.diagnosticEligible)).toBe(true);
  });

  it("maps every Grade 2 ELA target to either an independent or adult-scored activity", async () => {
    const standards = (await loadAndValidateVendoredStandards()).records.filter((standard) => standard.grade === "2" && standard.subject === "ela" && standard.active && standard.instructionalStatus === "assessable").map((standard) => standard.officialId).sort();
    expect([...gradeTwoElaTemplates, ...gradeTwoElaAdultTemplates].map((template) => template.standardId).sort()).toEqual(standards);
    expect(gradeTwoElaTemplates.every((template) => template.diagnosticEligible && template.review.status === "reviewed")).toBe(true);
    expect(gradeTwoElaAdultTemplates.every((template) => !template.diagnosticEligible && template.responseType === "constructedResponse")).toBe(true);
  });

  it("creates ten complete deterministic question instances instead of an inventory", async () => {
    const catalog = await loadK2ContentCatalog();
    const standards = new Map((await loadAndValidateVendoredStandards()).records.map((standard) => [standard.officialId, standard]));
    const reviews = catalog.templates.filter((template) => template.grade === "K").map((template) => createTemplateReview(template, standards.get(template.standardId)!));
    for (const review of reviews) {
      expect(review.examples).toHaveLength(10);
      for (const example of review.examples) {
        expect(example.seed).toBeTruthy();
        expect(example.id).toContain("@");
        expect(example.prompt.audioText).toBeTruthy();
        expect(example.accessibility.textAlternative).toBeTruthy();
        if (example.responseType === "singleChoice") {
          expect(example.interaction.choices).toHaveLength(3);
          expect(example.canonicalAnswer).not.toBeNull();
        }
        if (example.responseType === "classification" || example.responseType === "sequence") expect(example.canonicalAnswer).toBeTruthy();
        if (example.templateId.includes("object")) {
          expect(example.interaction.visual).toEqual(expect.objectContaining({ count: example.canonicalAnswer }));
        }
      }
      expect(review.metrics).toEqual(expect.objectContaining({ seedsTested: 1000, invalidInstanceCount: 0 }));
    }
  });
});
