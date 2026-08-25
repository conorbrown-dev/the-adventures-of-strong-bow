import { importVendoredStandards } from "../../application/import-vendored-standards";
import { resolve } from "node:path";
import { PrismaService } from "../../../prisma/prisma.service";
import { PrismaStandardRepository } from "../prisma-standard.repository";
import { getCurriculumPaths, loadAndValidateVendoredStandards } from "../vendored-standards.validator";
import { loadAndValidateQuestionTemplates } from "../question-template.validator";
import { generateQuestion } from "../../application/question-generator";
import { PrismaProgressRepository } from "../prisma-progress.repository";
import { ProgressService } from "../../application/progress-service";
import { planSession } from "../../application/session-planner";
import { approveK2Template, changeK2TemplateStatus, createK2ReviewPacket, kindergartenCoverageReport, validateK2ContentCatalog } from "../k2-content-catalog";
import { approveLessonPlan, changeLessonPlanStatus, createLessonPlanReviewPacket, validateLessonPlanCatalog } from "../lesson-plan-catalog";

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "validate") {
    const dataset = await loadAndValidateVendoredStandards();
    const [catalog, lessonPlans] = await Promise.all([validateK2ContentCatalog(), validateLessonPlanCatalog()]);
    console.log(JSON.stringify({ valid: true, records: dataset.records.length, catalog, lessonPlans, copyrightNotice: dataset.copyrightNotice }, null, 2));
    return;
  }
  if (command === "content:validate") {
    const [catalog, lessonPlans] = await Promise.all([validateK2ContentCatalog(), validateLessonPlanCatalog()]);
    console.log(JSON.stringify({ ...catalog, lessonPlans }, null, 2)); return;
  }
  if (command === "content:coverage") { console.log(JSON.stringify(await kindergartenCoverageReport(), null, 2)); return; }
  if (command === "content:review-packet") { console.log(JSON.stringify(await createK2ReviewPacket(), null, 2)); return; }
  if (command === "lesson-plans:validate") { console.log(JSON.stringify(await validateLessonPlanCatalog(), null, 2)); return; }
  if (command === "lesson-plans:review-packet") { console.log(JSON.stringify(await createLessonPlanReviewPacket(), null, 2)); return; }
  if (command === "lesson-plans:approve") {
    const args = process.argv.slice(3); const planId = args[args.indexOf("--plan") + 1]; const reviewer = args[args.indexOf("--reviewer") + 1]; const noteIndex = args.indexOf("--note"); const note = noteIndex >= 0 ? args[noteIndex + 1] ?? "" : "";
    if (!planId || !reviewer) throw new Error("Usage: curriculum lesson-plans:approve --plan <id> --reviewer <name> [--note <note>]");
    console.log(JSON.stringify(await approveLessonPlan(planId, reviewer, note), null, 2)); return;
  }
  if (command === "lesson-plans:return-draft" || command === "lesson-plans:retire") {
    const args = process.argv.slice(3); const planId = args[args.indexOf("--plan") + 1]; const reviewer = args[args.indexOf("--reviewer") + 1]; const noteIndex = args.indexOf("--note"); const note = noteIndex >= 0 ? args[noteIndex + 1] ?? "" : "";
    if (!planId || !reviewer) throw new Error(`Usage: curriculum ${command} --plan <id> --reviewer <name> [--note <note>]`);
    console.log(JSON.stringify(await changeLessonPlanStatus(planId, command === "lesson-plans:retire" ? "retired" : "draft", reviewer, note), null, 2)); return;
  }
  if (command === "content:approve") {
    const args = process.argv.slice(3); const templateId = args[args.indexOf("--template") + 1]; const reviewer = args[args.indexOf("--reviewer") + 1]; const noteIndex = args.indexOf("--note"); const note = noteIndex >= 0 ? args[noteIndex + 1] ?? "" : "";
    if (!templateId || !reviewer) throw new Error("Usage: curriculum content:approve --template <id> --reviewer <name> [--note <note>]");
    console.log(JSON.stringify(await approveK2Template(templateId, reviewer, note), null, 2)); return;
  }
  if (command === "content:return-draft" || command === "content:retire") {
    const args = process.argv.slice(3); const templateId = args[args.indexOf("--template") + 1]; const reviewer = args[args.indexOf("--reviewer") + 1]; const noteIndex = args.indexOf("--note"); const note = noteIndex >= 0 ? args[noteIndex + 1] ?? "" : "";
    if (!templateId || !reviewer) throw new Error(`Usage: curriculum ${command} --template <id> --reviewer <name> [--note <note>]`);
    console.log(JSON.stringify(await changeK2TemplateStatus(templateId, command === "content:retire" ? "retired" : "draft", reviewer, note), null, 2)); return;
  }
  if (command === "validate-templates" || command === "questions:validate") {
    const dataset = await loadAndValidateVendoredStandards();
    const templates = await loadAndValidateQuestionTemplates(resolve(getCurriculumPaths().root, "data/curriculum/examples/question-templates.sample.json"), dataset.records);
    console.log(JSON.stringify({ valid: true, templates: templates.length, productionBundle: false }, null, 2));
    return;
  }
  if (command === "questions:generate" || command === "questions:coverage") {
    const dataset = await loadAndValidateVendoredStandards();
    const templates = await loadAndValidateQuestionTemplates(resolve(getCurriculumPaths().root, "data/curriculum/examples/question-templates.sample.json"), dataset.records);
    if (command === "questions:generate") {
      const templateId = process.argv[3] ?? templates[0].id;
      const template = templates.find((item) => item.id === templateId);
      if (!template) throw new Error(`Unknown template: ${templateId}`);
      console.log(JSON.stringify(generateQuestion(template, process.argv[4] ?? "preview"), null, 2));
      return;
    }
    console.log(JSON.stringify({ templates: templates.length, byGenerator: Object.fromEntries(templates.map((template) => [template.generator.kind, (templates.filter((item) => item.generator.kind === template.generator.kind).length)])), byReviewStatus: Object.fromEntries(templates.map((template) => [template.review.status, templates.filter((item) => item.review.status === template.review.status).length])) }, null, 2));
    return;
  }

  const prisma = new PrismaService();
  await prisma.onModuleInit();
  try {
    const repository = new PrismaStandardRepository(prisma);
    const progressRepository = new PrismaProgressRepository(prisma);
    const clock = { now: () => new Date() };
    if (command === "mastery:recalculate") {
      const [learnerId, standardId] = process.argv.slice(3); if (!learnerId || !standardId) throw new Error("Usage: curriculum mastery:recalculate <learnerId> <standardId>");
      console.log(JSON.stringify(await new ProgressService(progressRepository, clock).recalculate(learnerId, standardId), null, 2)); return;
    }
    if (command === "review:due") {
      const learnerId = process.argv[3]; if (!learnerId) throw new Error("Usage: curriculum review:due <learnerId>");
      console.log(JSON.stringify(await new ProgressService(progressRepository, clock).markDue(learnerId), null, 2)); return;
    }
    if (command === "diagnostic") throw new Error("Diagnostic probes are submitted through the application service; use the diagnostic-placement API with independent probe results.");
    if (command === "session:plan") throw new Error("Session planning requires a learner context, eligible reviewed templates, and delivery constraints from the application API.");
    if (command === "import") {
      console.log(JSON.stringify(await importVendoredStandards(repository), null, 2));
      return;
    }
    if (command === "report") {
      console.log(JSON.stringify({
        imported: await repository.count(),
        quizTargets: (await repository.listQuizTargets()).length,
        countsByGradeAndSubject: await repository.countByGradeAndSubject()
      }, null, 2));
      return;
    }
    throw new Error("Usage: curriculum <validate|content:validate|content:coverage|content:review-packet|content:approve|content:return-draft|content:retire|lesson-plans:validate|lesson-plans:review-packet|lesson-plans:approve|lesson-plans:return-draft|lesson-plans:retire|validate-templates|questions:validate|questions:generate|questions:coverage|mastery:recalculate|review:due|diagnostic|session:plan|import|report>");
  } finally {
    await prisma.onModuleDestroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
