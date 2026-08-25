import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadK2ContentCatalog } from "./k2-content-catalog";
import { lessonPlanContentHash, loadLessonPlanCatalog, loadProductionLessonPlans, validateLessonPlanCatalog, validateLessonPlanSequence } from "./lesson-plan-catalog";
import { loadLearningStandards } from "./learning-standards";
import { getCurriculumPaths } from "./vendored-standards.validator";

describe("lesson-plan catalog", () => {
  it("validates a complete multi-day Kindergarten counting sequence", async () => {
    await expect(validateLessonPlanCatalog()).resolves.toEqual({ total: 1, draft: 0, validated: 0, reviewed: 1, retired: 0, days: 5 });
    const [plan] = await loadLessonPlanCatalog();
    expect(plan.standardIds).toEqual(["K.CC.A.1", "K.CC.A.2", "K.CC.A.3"]);
    expect(plan.days).toHaveLength(5);
    expect(plan.days.every((day) => day.adultSetup.length > 0 && day.independentPractice.templateIds.length >= 2 && day.reteach.directions.length > 0)).toBe(true);
  });

  it("includes only the human-reviewed sequence in the production bundle", async () => {
    const productionPlans = await loadProductionLessonPlans();
    expect(productionPlans.map((plan) => plan.id)).toEqual(["k.math.counting-and-quantities"]);
    expect(productionPlans[0].review).toEqual(expect.objectContaining({ status: "reviewed", reviewer: "Conor Brown", contentHash: expect.any(String) }));
  });

  it("teaches the full K.CC.A.1 count-to-100 requirement beyond the small-range digital probes", async () => {
    const [plan] = await loadLessonPlanCatalog();
    const countSequenceDays = plan.days.filter((day) => day.standardIds.includes("K.CC.A.1"));
    const authoredText = JSON.stringify(countSequenceDays);
    expect(authoredText).toContain("100 by ones");
    expect(authoredText).toContain("100 by tens");
    expect(authoredText).toContain("current on-screen item bank does not independently assess counting by tens");
  });

  it("rejects mismatched standards and unavailable practice templates", async () => {
    const [plan, standards, catalog] = await Promise.all([loadLessonPlanCatalog().then(([item]) => item), loadLearningStandards(), loadK2ContentCatalog()]);
    const wrongStandard = structuredClone(plan);
    wrongStandard.standardIds = ["1.CC.A.1"];
    expect(() => validateLessonPlanSequence(wrongStandard, standards, catalog.templates)).toThrow("unavailable or mismatched standard");

    const wrongTemplate = structuredClone(plan);
    wrongTemplate.days[0].independentPractice.templateIds[0] = "missing.template";
    expect(() => validateLessonPlanSequence(wrongTemplate, standards, catalog.templates)).toThrow("unavailable or unreviewed template");
  });

  it("hashes instructional content but not review metadata", async () => {
    const [plan] = await loadLessonPlanCatalog();
    const changedReview = structuredClone(plan);
    changedReview.review.notes = "A different reviewer note.";
    expect(lessonPlanContentHash(changedReview)).toBe(lessonPlanContentHash(plan));

    const changedInstruction = structuredClone(plan);
    changedInstruction.days[0].objective = "Changed objective";
    expect(lessonPlanContentHash(changedInstruction)).not.toBe(lessonPlanContentHash(plan));
  });

  it("ships a versioned schema for the new curriculum artifact", async () => {
    const schemaPath = resolve(getCurriculumPaths().root, "data/curriculum/schemas/lesson-plan.schema.json");
    const schema = JSON.parse(await readFile(schemaPath, "utf8")) as { properties?: { schemaVersion?: { const?: number } } };
    expect(schema.properties?.schemaVersion?.const).toBe(1);
  });
});
