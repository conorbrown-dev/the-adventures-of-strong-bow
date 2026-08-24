import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCurriculumPaths, loadAndValidateVendoredStandards } from "./vendored-standards.validator";
import { writeReviewPacket } from "./k2-review-packet";
import { gradeOneMathTemplates } from "../data/grade-one-math-templates";
import { gradeOneElaTemplates } from "../data/grade-one-ela-templates";
import { gradeOneElaAdultTemplates } from "../data/grade-one-ela-adult-templates";
import { gradeTwoMathTemplates } from "../data/grade-two-math-templates";
import { gradeTwoElaTemplates } from "../data/grade-two-ela-templates";
import { gradeTwoElaAdultTemplates } from "../data/grade-two-ela-adult-templates";
import { kindergartenMathTemplates } from "../data/kindergarten-math-templates";
import { kindergartenElaTemplates } from "../data/kindergarten-ela-templates";
import { kindergartenElaAdultTemplates } from "../data/kindergarten-ela-adult-templates";
import { oklahomaScienceTemplates } from "../data/oklahoma-science-templates";
import { oklahomaSocialStudiesTemplates } from "../data/oklahoma-social-studies-templates";
import { oklahomaHealthTemplates } from "../data/oklahoma-health-templates";
import { oklahomaPhysicalEducationTemplates } from "../data/oklahoma-physical-education-templates";
import { oklahomaFineArtsTemplates } from "../data/oklahoma-fine-arts-templates";
import { oklahomaComputerScienceTemplates } from "../data/oklahoma-computer-science-templates";
import { oklahomaInformationLiteracyTemplates } from "../data/oklahoma-information-literacy-templates";
import { oklahomaAiCompetencyTemplates } from "../data/oklahoma-ai-competency-templates";
import { oklahomaEducationTechnologyTemplates } from "../data/oklahoma-education-technology-templates";
import { oklahomaMathTemplates } from "../data/oklahoma-math-templates";
import { loadLearningStandards } from "./learning-standards";

export type CatalogReviewStatus = "draft" | "validated" | "reviewed" | "retired";
export type CatalogTemplate = {
  id: string; standardId: string; grade: string; subject: string; generatorKind: string;
  responseType: string; diagnosticEligible: boolean; audioSupported: boolean; provenance: string;
  review: { status: CatalogReviewStatus; reviewer?: string; reviewedAt?: string; note?: string; contentHash?: string };
};
export type K2Catalog = { schemaVersion: number; templates: CatalogTemplate[]; passages: unknown[]; unsupported: unknown[] };
const catalogPath = () => resolve(getCurriculumPaths().root, "data/curriculum/content/k2-catalog.json");
const validStatuses = new Set<CatalogReviewStatus>(["draft", "validated", "reviewed", "retired"]);
const kindergartenStandards = ["K.RF.1.d", "K.RF.2.a", "K.RF.2.d", "K.CC.A.1", "K.CC.A.2", "K.CC.A.3"] as const;

export function contentHash(template: CatalogTemplate): string {
  const { review: _review, ...content } = template;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export async function loadK2ContentCatalog(): Promise<K2Catalog> {
  const catalog = JSON.parse(await readFile(catalogPath(), "utf8")) as K2Catalog;
  const existingIds = new Set(catalog.templates.map((template) => template.id));
  return { ...catalog, templates: [...catalog.templates, ...[...kindergartenMathTemplates, ...kindergartenElaTemplates, ...kindergartenElaAdultTemplates, ...oklahomaMathTemplates, ...oklahomaScienceTemplates, ...oklahomaSocialStudiesTemplates, ...oklahomaHealthTemplates, ...oklahomaPhysicalEducationTemplates, ...oklahomaFineArtsTemplates, ...oklahomaComputerScienceTemplates, ...oklahomaAiCompetencyTemplates, ...oklahomaEducationTechnologyTemplates, ...oklahomaInformationLiteracyTemplates, ...gradeOneMathTemplates, ...gradeOneElaTemplates, ...gradeOneElaAdultTemplates, ...gradeTwoMathTemplates, ...gradeTwoElaTemplates, ...gradeTwoElaAdultTemplates].filter((template) => !existingIds.has(template.id))] };
}

export async function validateK2ContentCatalog(): Promise<{ templates: number; passages: number; unsupported: number }> {
  const catalog = await loadK2ContentCatalog();
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.templates)) throw new Error("Invalid K–2 content catalog schema.");
  const standards = new Set((await loadLearningStandards()).filter((standard) => standard.active).map((standard) => standard.officialId));
  const ids = new Set<string>();
  for (const template of catalog.templates) {
    if (!template.id || ids.has(template.id) || !standards.has(template.standardId) || !template.provenance || !template.audioSupported || !validStatuses.has(template.review?.status)) throw new Error(`Invalid K–2 production content template: ${template.id ?? "unknown"}.`);
    ids.add(template.id);
    if (template.review.status === "reviewed" && template.review.contentHash && template.review.contentHash !== contentHash(template)) throw new Error(`Approval is stale because reviewed content changed: ${template.id}.`);
    if (template.review.contentHash && (!template.review.reviewer || !template.review.reviewedAt || Number.isNaN(Date.parse(template.review.reviewedAt)))) throw new Error(`Approval metadata is incomplete: ${template.id}.`);
  }
  return { templates: catalog.templates.length, passages: catalog.passages.length, unsupported: catalog.unsupported.length };
}

export async function kindergartenCoverageReport(): Promise<Record<string, { total: number; reviewedDiagnosticProbes: number; status: string }>> {
  const catalog = await loadK2ContentCatalog();
  return Object.fromEntries(kindergartenStandards.map((standardId) => {
    const templates = catalog.templates.filter((template) => template.standardId === standardId && template.diagnosticEligible && template.review.status !== "retired");
    const reviewed = templates.filter((template) => template.review.status === "reviewed").length;
    return [standardId, { total: templates.length, reviewedDiagnosticProbes: reviewed, status: reviewed >= 4 ? "assessment-ready" : "awaiting-human-review" }];
  }));
}

export async function createK2ReviewPacket(): Promise<{ html: string; json: string }> {
  const catalog = await loadK2ContentCatalog();
  const standards = await loadLearningStandards();
  const result = await writeReviewPacket(catalog.templates, standards, resolve(getCurriculumPaths().root, "data/curriculum/content"));
  return { html: result.html, json: result.json };
}

export async function approveK2Template(templateId: string, reviewer: string, note: string): Promise<CatalogTemplate> {
  if (!reviewer.trim()) throw new Error("A named human reviewer is required.");
  const catalog = await loadK2ContentCatalog();
  const template = catalog.templates.find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown content template: ${templateId}`);
  if (template.review.status === "retired") throw new Error("Retired content cannot be approved.");
  template.review = { status: "reviewed", reviewer, reviewedAt: new Date().toISOString(), note: note || "Approved for production use.", contentHash: contentHash(template) };
  await writeFile(catalogPath(), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return template;
}

export async function changeK2TemplateStatus(templateId: string, status: "draft" | "retired", reviewer: string, note: string): Promise<CatalogTemplate> {
  if (!reviewer.trim()) throw new Error("A named human reviewer is required.");
  const catalog = await loadK2ContentCatalog();
  const template = catalog.templates.find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown content template: ${templateId}`);
  template.review = { status, reviewer, reviewedAt: new Date().toISOString(), note: note || (status === "retired" ? "Retired by reviewer." : "Returned to draft by reviewer.") };
  await writeFile(catalogPath(), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return template;
}
