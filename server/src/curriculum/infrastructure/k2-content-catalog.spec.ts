import { kindergartenCoverageReport, loadK2ContentCatalog, validateK2ContentCatalog } from "./k2-content-catalog";
import { createTemplateReview } from "./k2-review-packet";
import { loadAndValidateVendoredStandards } from "./vendored-standards.validator";

describe("Kindergarten production content catalog", () => {
  it("validates the catalog and preserves human review boundaries", async () => {
    const catalog = await loadK2ContentCatalog();
    await expect(validateK2ContentCatalog()).resolves.toMatchObject({ templates: expect.any(Number) });
    const kindergarten = catalog.templates.filter((template) => template.grade === "K");
    expect(kindergarten).toHaveLength(27);
    expect(kindergarten.filter((template) => template.review.status === "validated")).toHaveLength(0);
    expect(kindergarten.filter((template) => template.review.status === "reviewed")).toHaveLength(27);
    expect(kindergarten.every((template) => template.review.reviewer === "Conor Brown" && template.review.contentHash)).toBe(true);
  });

  it("does not claim diagnostic readiness until four probes receive human approval", async () => {
    const coverage = await kindergartenCoverageReport();
    expect(Object.keys(coverage)).toEqual(["K.RF.1.d", "K.RF.2.a", "K.RF.2.d", "K.CC.A.1", "K.CC.A.2", "K.CC.A.3"]);
    for (const item of Object.values(coverage)) {
      expect(item.total).toBeGreaterThanOrEqual(4);
      expect(item.status).toBe("assessment-ready");
    }
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
