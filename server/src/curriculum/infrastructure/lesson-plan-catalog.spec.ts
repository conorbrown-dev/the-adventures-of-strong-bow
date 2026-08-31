import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadK2ContentCatalog } from "./k2-content-catalog";
import { lessonPlanContentHash, loadLessonPlanCatalog, loadProductionLessonPlans, validateLessonPlanCatalog, validateLessonPlanSequence } from "./lesson-plan-catalog";
import { loadLearningStandards } from "./learning-standards";
import { getCurriculumPaths } from "./vendored-standards.validator";

describe("lesson-plan catalog", () => {
  it("validates a complete multi-day Kindergarten counting sequence", async () => {
    await expect(validateLessonPlanCatalog()).resolves.toEqual({ total: 5, draft: 0, validated: 4, reviewed: 1, retired: 0, days: 25 });
    const plans = await loadLessonPlanCatalog();
    const plan = plans.find((item) => item.id === "k.math.counting-and-quantities");
    expect(plan).toBeDefined();
    expect(plan?.standardIds).toEqual(["K.CC.A.1", "K.CC.A.2", "K.CC.A.3"]);
    expect(plan?.days).toHaveLength(5);
    expect(plan?.days.every((day) => day.adultSetup.length > 0 && day.independentPractice.templateIds.length >= 2 && day.reteach.directions.length > 0)).toBe(true);
  });

  it("includes a validated Kindergarten ELA instructional sequence outside production", async () => {
    const plans = await loadLessonPlanCatalog();
    const plan = plans.find((item) => item.id === "k.ela.print-and-early-reading");
    expect(plan).toEqual(expect.objectContaining({ grade: "K", subject: "ela", review: expect.objectContaining({ status: "validated" }) }));
    expect(plan?.days).toHaveLength(5);
    expect(plan?.days.flatMap((day) => day.independentPractice.templateIds)).toContain("k.rf.3.c.decode-cvc");
  });

  it("includes validated K-1 operations and Grade 1 word-reading sequences outside production", async () => {
    const plans = await loadLessonPlanCatalog();
    const validatedPlans = plans.filter((plan) => plan.review.status === "validated");
    expect(validatedPlans.map((plan) => plan.id)).toEqual([
      "1.ela.sound-spelling-and-word-reading",
      "1.math.addition-and-subtraction-strategies",
      "k.ela.print-and-early-reading",
      "k.math.operations-and-number-bonds",
    ]);
    expect(validatedPlans.every((plan) => plan.days.length === 5)).toBe(true);
    expect(validatedPlans.every((plan) => plan.days.every((day) => day.independentPractice.templateIds.length >= 2))).toBe(true);

    const kindergartenOperations = validatedPlans.find((plan) => plan.id === "k.math.operations-and-number-bonds");
    expect(kindergartenOperations?.days.flatMap((day) => day.independentPractice.templateIds)).toEqual(expect.arrayContaining(["k.oa.a.4.make-ten", "k.oa.a.5.fluency-within-five"]));

    const gradeOneOperations = validatedPlans.find((plan) => plan.id === "1.math.addition-and-subtraction-strategies");
    expect(gradeOneOperations?.days.flatMap((day) => day.independentPractice.templateIds)).toEqual(expect.arrayContaining(["1.oa.a.1.word-problem", "1.oa.d.8.unknown-equation"]));

    const gradeOneReading = validatedPlans.find((plan) => plan.id === "1.ela.sound-spelling-and-word-reading");
    expect(gradeOneReading?.days.flatMap((day) => day.independentPractice.templateIds)).toEqual(expect.arrayContaining(["1.rf.3.a.digraphs", "1.rf.3.g.irregular-words"]));
    expect(JSON.stringify(gradeOneReading)).toContain("controlled text");
  });

  it("includes only the human-reviewed sequence in the production bundle", async () => {
    const productionPlans = await loadProductionLessonPlans();
    expect(productionPlans.map((plan) => plan.id)).toEqual(["k.math.counting-and-quantities"]);
    expect(productionPlans[0].review).toEqual(expect.objectContaining({ status: "reviewed", reviewer: "Conor Brown", contentHash: expect.any(String) }));
  });

  it("teaches the full K.CC.A.1 count-to-100 requirement beyond the small-range digital probes", async () => {
    const plans = await loadLessonPlanCatalog();
    const plan = plans.find((item) => item.id === "k.math.counting-and-quantities");
    expect(plan).toBeDefined();
    if (!plan) throw new Error("Expected the Kindergarten counting lesson plan.");
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
