import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCurriculumPaths, loadAndValidateVendoredStandards } from "./vendored-standards.validator";

export async function validateK2ContentCatalog(): Promise<{ templates: number; passages: number; unsupported: number }> {
  const root = getCurriculumPaths().root;
  const catalog = JSON.parse(await readFile(resolve(root, "data/curriculum/content/k2-catalog.json"), "utf8")) as { templates: Array<{ standardId: string; review: { status: string; reviewer: string }; provenance: string }>; passages: unknown[]; unsupported: unknown[] };
  const standards = new Set((await loadAndValidateVendoredStandards()).records.filter((standard) => standard.active).map((standard) => standard.officialId));
  for (const template of catalog.templates) if (!standards.has(template.standardId) || template.review.status !== "reviewed" || template.review.reviewer !== "Project content review" || !template.provenance) throw new Error("Invalid K–2 production content catalog.");
  return { templates: catalog.templates.length, passages: catalog.passages.length, unsupported: catalog.unsupported.length };
}
