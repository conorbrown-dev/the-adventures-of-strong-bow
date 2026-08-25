import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { LessonActivity, LessonPlanDay, LessonPlanSequence, LessonPlanReviewStatus } from "../domain/lesson-plan";
import type { Standard } from "../domain/standard";
import type { CatalogTemplate } from "./k2-content-catalog";
import { loadK2ContentCatalog } from "./k2-content-catalog";
import { loadLearningStandards } from "./learning-standards";
import { getCurriculumPaths } from "./vendored-standards.validator";

export class LessonPlanValidationError extends Error {}

const reviewStatuses = new Set<LessonPlanReviewStatus>(["draft", "validated", "reviewed", "retired"]);
const activityFields = ["minutes", "directions"] as const;

function lessonPlanDirectory(): string {
  return resolve(getCurriculumPaths().root, "data/curriculum/content/lesson-plans");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new LessonPlanValidationError(`${path} must be an object.`);
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) throw new LessonPlanValidationError(`${path} must be a non-empty string.`);
  return value;
}

function requireInteger(value: unknown, path: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) throw new LessonPlanValidationError(`${path} must be an integer from ${minimum} through ${maximum}.`);
  return Number(value);
}

function requireStringArray(value: unknown, path: string, minimum = 1): string[] {
  if (!Array.isArray(value) || value.length < minimum || value.some((item) => typeof item !== "string" || !item.trim()) || new Set(value).size !== value.length) {
    throw new LessonPlanValidationError(`${path} must be a unique list of at least ${minimum} non-empty strings.`);
  }
  return value as string[];
}

function requireOnlyFields(value: Record<string, unknown>, fields: readonly string[], path: string): void {
  const allowed = new Set(fields);
  const unexpected = Object.keys(value).find((field) => !allowed.has(field));
  if (unexpected) throw new LessonPlanValidationError(`${path} has unsupported property ${unexpected}.`);
}

function validateActivity(value: unknown, path: string, isIndependent = false): LessonActivity {
  const activity = requireRecord(value, path);
  requireOnlyFields(activity, isIndependent ? [...activityFields, "templateIds", "itemCount"] : activityFields, path);
  requireInteger(activity.minutes, `${path}.minutes`, 1, 30);
  requireStringArray(activity.directions, `${path}.directions`);
  if (isIndependent) {
    requireStringArray(activity.templateIds, `${path}.templateIds`, 2);
    requireInteger(activity.itemCount, `${path}.itemCount`, 3, 10);
  }
  return activity as LessonActivity;
}

function validateDay(value: unknown, path: string): LessonPlanDay {
  const day = requireRecord(value, path);
  requireOnlyFields(day, ["day", "title", "objective", "standardIds", "adultSetup", "textRecommendation", "warmUp", "explicitModel", "guidedPractice", "independentPractice", "extension", "reteach", "masteryEvidence"], path);
  requireInteger(day.day, `${path}.day`, 1, 30);
  requireString(day.title, `${path}.title`);
  requireString(day.objective, `${path}.objective`);
  requireStringArray(day.standardIds, `${path}.standardIds`);
  requireStringArray(day.adultSetup, `${path}.adultSetup`);
  requireString(day.textRecommendation, `${path}.textRecommendation`);
  validateActivity(day.warmUp, `${path}.warmUp`);
  validateActivity(day.explicitModel, `${path}.explicitModel`);
  validateActivity(day.guidedPractice, `${path}.guidedPractice`);
  validateActivity(day.independentPractice, `${path}.independentPractice`, true);
  validateActivity(day.extension, `${path}.extension`);
  validateActivity(day.reteach, `${path}.reteach`);
  requireStringArray(day.masteryEvidence, `${path}.masteryEvidence`);
  return day as unknown as LessonPlanDay;
}

export function lessonPlanContentHash(plan: LessonPlanSequence): string {
  const { review: _review, ...content } = plan;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function validateLessonPlanSequence(value: unknown, standards: readonly Standard[], templates: readonly CatalogTemplate[], production = false): LessonPlanSequence {
  const plan = requireRecord(value, "lessonPlan");
  requireOnlyFields(plan, ["schemaVersion", "id", "version", "grade", "subject", "unitId", "title", "summary", "standardIds", "materials", "days", "accessibility", "provenance", "review"], "lessonPlan");
  if (plan.schemaVersion !== 1) throw new LessonPlanValidationError("lessonPlan.schemaVersion must be 1.");
  const id = requireString(plan.id, "lessonPlan.id");
  if (!/^[a-z0-9][a-z0-9._-]+$/.test(id)) throw new LessonPlanValidationError("lessonPlan.id has an invalid format.");
  requireInteger(plan.version, "lessonPlan.version", 1, 1000);
  if (!(["K", "1", "2"] as const).includes(plan.grade as "K" | "1" | "2")) throw new LessonPlanValidationError("lessonPlan.grade must be K, 1, or 2.");
  if (plan.subject !== "math" && plan.subject !== "ela") throw new LessonPlanValidationError("lessonPlan.subject must be math or ela.");
  requireString(plan.unitId, "lessonPlan.unitId");
  requireString(plan.title, "lessonPlan.title");
  requireString(plan.summary, "lessonPlan.summary");
  const standardIds = requireStringArray(plan.standardIds, "lessonPlan.standardIds");

  const standardsById = new Map(standards.filter((standard) => standard.active).map((standard) => [standard.officialId, standard]));
  for (const standardId of standardIds) {
    const standard = standardsById.get(standardId);
    if (!standard || standard.grade !== plan.grade || standard.subject !== plan.subject) throw new LessonPlanValidationError(`lessonPlan references unavailable or mismatched standard ${standardId}.`);
  }

  if (!Array.isArray(plan.materials) || plan.materials.length === 0) throw new LessonPlanValidationError("lessonPlan.materials must not be empty.");
  for (const [index, value] of plan.materials.entries()) {
    const material = requireRecord(value, `lessonPlan.materials[${index}]`);
    requireOnlyFields(material, ["name", "alternatives"], `lessonPlan.materials[${index}]`);
    requireString(material.name, `lessonPlan.materials[${index}].name`);
    requireStringArray(material.alternatives, `lessonPlan.materials[${index}].alternatives`, 0);
  }

  if (!Array.isArray(plan.days) || plan.days.length < 2) throw new LessonPlanValidationError("lessonPlan.days must contain a multi-day sequence.");
  const days = plan.days.map((day, index) => validateDay(day, `lessonPlan.days[${index}]`));
  if (days.some((day, index) => day.day !== index + 1)) throw new LessonPlanValidationError("lessonPlan day numbers must be consecutive and begin at 1.");

  const sequenceStandards = new Set(standardIds);
  const templatesById = new Map(templates.map((template) => [template.id, template]));
  const coveredStandards = new Set<string>();
  for (const day of days) {
    for (const standardId of day.standardIds) {
      if (!sequenceStandards.has(standardId)) throw new LessonPlanValidationError(`Day ${day.day} references standard ${standardId} outside the sequence.`);
      coveredStandards.add(standardId);
    }
    for (const templateId of day.independentPractice.templateIds) {
      const template = templatesById.get(templateId);
      if (!template || template.review.status !== "reviewed") throw new LessonPlanValidationError(`Day ${day.day} references unavailable or unreviewed template ${templateId}.`);
      if (template.grade !== plan.grade || template.subject !== plan.subject || !day.standardIds.includes(template.standardId)) throw new LessonPlanValidationError(`Day ${day.day} template ${templateId} does not match its grade, subject, and standards.`);
    }
  }
  if (standardIds.some((standardId) => !coveredStandards.has(standardId))) throw new LessonPlanValidationError("Every sequence standard must be taught on at least one day.");

  const accessibility = requireRecord(plan.accessibility, "lessonPlan.accessibility");
  requireOnlyFields(accessibility, ["audioSupported", "requiresColor", "reducedMotionSafe", "accommodationNotes"], "lessonPlan.accessibility");
  if (accessibility.audioSupported !== true || accessibility.requiresColor !== false || typeof accessibility.reducedMotionSafe !== "boolean") throw new LessonPlanValidationError("lessonPlan accessibility must support audio and must not require color.");
  requireStringArray(accessibility.accommodationNotes, "lessonPlan.accessibility.accommodationNotes");

  const provenance = requireRecord(plan.provenance, "lessonPlan.provenance");
  requireOnlyFields(provenance, ["origin", "license"], "lessonPlan.provenance");
  if (provenance.origin !== "original") throw new LessonPlanValidationError("lessonPlan.provenance.origin must be original.");
  requireString(provenance.license, "lessonPlan.provenance.license");

  const review = requireRecord(plan.review, "lessonPlan.review");
  requireOnlyFields(review, ["status", "reviewer", "reviewedAt", "notes", "contentHash"], "lessonPlan.review");
  if (!reviewStatuses.has(review.status as LessonPlanReviewStatus)) throw new LessonPlanValidationError("lessonPlan.review.status is invalid.");
  if (review.status === "reviewed") {
    requireString(review.reviewer, "lessonPlan.review.reviewer");
    const reviewedAt = requireString(review.reviewedAt, "lessonPlan.review.reviewedAt");
    if (Number.isNaN(Date.parse(reviewedAt))) throw new LessonPlanValidationError("lessonPlan.review.reviewedAt must be a date-time.");
    if (review.contentHash !== lessonPlanContentHash(plan as unknown as LessonPlanSequence)) throw new LessonPlanValidationError("Lesson-plan approval is stale because reviewed content changed.");
  }
  if (production && review.status !== "reviewed") throw new LessonPlanValidationError(`Unreviewed lesson plan ${id} cannot enter a production bundle.`);
  return plan as unknown as LessonPlanSequence;
}

async function loadLessonPlanDocuments(directory: string): Promise<Array<{ path: string; value: unknown }>> {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => ({ path: resolve(directory, name), value: JSON.parse(await readFile(resolve(directory, name), "utf8")) as unknown })));
}

async function validationContext(): Promise<{ standards: Standard[]; templates: CatalogTemplate[] }> {
  const [standards, catalog] = await Promise.all([loadLearningStandards(), loadK2ContentCatalog()]);
  return { standards, templates: catalog.templates };
}

export async function loadLessonPlanCatalog(directory = lessonPlanDirectory()): Promise<LessonPlanSequence[]> {
  const [documents, context] = await Promise.all([loadLessonPlanDocuments(directory), validationContext()]);
  const plans = documents.map((document) => validateLessonPlanSequence(document.value, context.standards, context.templates));
  if (new Set(plans.map((plan) => plan.id)).size !== plans.length) throw new LessonPlanValidationError("Lesson-plan IDs must be unique.");
  return plans;
}

export async function loadProductionLessonPlans(directory = lessonPlanDirectory()): Promise<LessonPlanSequence[]> {
  return (await loadLessonPlanCatalog(directory)).filter((plan) => plan.review.status === "reviewed");
}

export async function validateLessonPlanCatalog(directory = lessonPlanDirectory()): Promise<{ total: number; draft: number; validated: number; reviewed: number; retired: number; days: number }> {
  const plans = await loadLessonPlanCatalog(directory);
  return {
    total: plans.length,
    draft: plans.filter((plan) => plan.review.status === "draft").length,
    validated: plans.filter((plan) => plan.review.status === "validated").length,
    reviewed: plans.filter((plan) => plan.review.status === "reviewed").length,
    retired: plans.filter((plan) => plan.review.status === "retired").length,
    days: plans.reduce((total, plan) => total + plan.days.length, 0)
  };
}

const escapeHtml = (value: unknown): string => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
const orderedList = (items: string[]): string => `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
const unorderedList = (items: string[]): string => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

function renderReviewDay(day: LessonPlanDay): string {
  return `<article><h3>Day ${day.day}: ${escapeHtml(day.title)}</h3><p><strong>Objective:</strong> ${escapeHtml(day.objective)}</p><p><strong>Adult setup:</strong> ${day.adultSetup.map(escapeHtml).join(" ")}</p><p><strong>Text recommendation:</strong> ${escapeHtml(day.textRecommendation)}</p><h4>Warm-up</h4>${orderedList(day.warmUp.directions)}<h4>Explicit model</h4>${orderedList(day.explicitModel.directions)}<h4>Guided practice</h4>${orderedList(day.guidedPractice.directions)}<h4>Independent practice</h4>${orderedList(day.independentPractice.directions)}<p>Templates: ${day.independentPractice.templateIds.map(escapeHtml).join(", ")}</p><h4>Extension</h4>${orderedList(day.extension.directions)}<h4>Reteach</h4>${orderedList(day.reteach.directions)}<h4>Mastery evidence</h4>${unorderedList(day.masteryEvidence)}</article>`;
}

function renderReviewPlan(plan: LessonPlanSequence): string {
  const materials = plan.materials.map((material) => `<li>${escapeHtml(material.name)}${material.alternatives.length ? ` (alternatives: ${material.alternatives.map(escapeHtml).join(", ")})` : ""}</li>`).join("");
  return `<section><h2>${escapeHtml(plan.title)}</h2><p><strong>${escapeHtml(plan.id)}</strong> · Grade ${escapeHtml(plan.grade)} ${escapeHtml(plan.subject)} · ${escapeHtml(plan.review.status)}</p><p>${escapeHtml(plan.summary)}</p><h3>Standards</h3><p>${plan.standardIds.map(escapeHtml).join(", ")}</p><h3>Materials</h3><ul>${materials}</ul>${plan.days.map(renderReviewDay).join("")}<h3>Accessibility and accommodations</h3>${unorderedList(plan.accessibility.accommodationNotes)}<p><strong>Audio supported:</strong> ${plan.accessibility.audioSupported ? "Yes" : "No"}; <strong>requires color:</strong> ${plan.accessibility.requiresColor ? "Yes" : "No"}; <strong>reduced-motion safe:</strong> ${plan.accessibility.reducedMotionSafe ? "Yes" : "No"}.</p><h3>Provenance and review</h3><p>${escapeHtml(plan.provenance.origin)} · ${escapeHtml(plan.provenance.license)}</p><p>${escapeHtml(plan.review.notes ?? "No reviewer notes yet.")}</p></section>`;
}

export async function createLessonPlanReviewPacket(outputDirectory = resolve(getCurriculumPaths().root, "data/curriculum/content")): Promise<{ html: string; json: string; lessonPlans: number }> {
  const plans = await loadLessonPlanCatalog();
  const sections = plans.map(renderReviewPlan).join("");
  const html = resolve(outputDirectory, "lesson-plan-review-packet.html");
  const json = resolve(outputDirectory, "lesson-plan-review-packet.json");
  await Promise.all([
    writeFile(html, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Lesson-plan review packet</title><style>body{font:16px/1.5 system-ui;max-width:900px;margin:auto;padding:2rem;color:#223}section{border-top:3px solid #487;padding-top:1rem}article{border:1px solid #ccd;border-radius:.5rem;margin:1rem 0;padding:1rem}h1,h2,h3,h4{line-height:1.2}</style></head><body><h1>K–2 lesson-plan review packet</h1><p>These sequences remain outside production until a named human reviewer approves them.</p>${sections}</body></html>`, "utf8"),
    writeFile(json, `${JSON.stringify({ generatedAt: new Date().toISOString(), plans }, null, 2)}\n`, "utf8")
  ]);
  return { html, json, lessonPlans: plans.length };
}

export async function approveLessonPlan(planId: string, reviewer: string, notes: string, directory = lessonPlanDirectory()): Promise<LessonPlanSequence> {
  if (!reviewer.trim()) throw new LessonPlanValidationError("A named human reviewer is required.");
  const documents = await loadLessonPlanDocuments(directory);
  const document = documents.find(({ value }) => isRecord(value) && value.id === planId);
  if (!document) throw new LessonPlanValidationError(`Unknown lesson plan: ${planId}.`);
  const context = await validationContext();
  const plan = validateLessonPlanSequence(document.value, context.standards, context.templates);
  if (plan.review.status === "retired") throw new LessonPlanValidationError("A retired lesson plan cannot be approved.");
  plan.review = { status: "reviewed", reviewer: reviewer.trim(), reviewedAt: new Date().toISOString(), notes: notes.trim() || "Approved for production use.", contentHash: lessonPlanContentHash(plan) };
  validateLessonPlanSequence(plan, context.standards, context.templates, true);
  await writeFile(document.path, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

export async function changeLessonPlanStatus(planId: string, status: Extract<LessonPlanReviewStatus, "draft" | "retired">, reviewer: string, notes: string, directory = lessonPlanDirectory()): Promise<LessonPlanSequence> {
  if (!reviewer.trim()) throw new LessonPlanValidationError("A named human reviewer is required.");
  const documents = await loadLessonPlanDocuments(directory);
  const document = documents.find(({ value }) => isRecord(value) && value.id === planId);
  if (!document) throw new LessonPlanValidationError(`Unknown lesson plan: ${planId}.`);
  const context = await validationContext();
  const plan = validateLessonPlanSequence(document.value, context.standards, context.templates);
  plan.review = { status, reviewer: reviewer.trim(), reviewedAt: new Date().toISOString(), notes: notes.trim() || (status === "retired" ? "Retired by reviewer." : "Returned to draft by reviewer.") };
  await writeFile(document.path, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}
