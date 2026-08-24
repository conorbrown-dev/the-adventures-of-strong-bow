import { oklahomaElaStandards } from "./oklahoma-ela-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma ELA 2021 Kindergarten literacy activity; adult observation required." };
export const oklahomaElaTemplates: CatalogTemplate[] = oklahomaElaStandards.map((standard) => ({
  id: `ok.ela.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId, grade: standard.grade, subject: "ela", generatorKind: "oklahomaElaAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed
}));
