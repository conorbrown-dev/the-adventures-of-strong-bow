import { oklahomaPhysicalEducationStandards } from "./oklahoma-physical-education-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma 2026 physical education performance task; adult observation required." };
const gradesFor = (id: string, grade: string) => id.startsWith("PLE.") ? ["K", "1", "2"] : grade === "K" ? ["K"] : ["1", "2"];

export const oklahomaPhysicalEducationTemplates: CatalogTemplate[] = oklahomaPhysicalEducationStandards.flatMap((standard) => gradesFor(standard.officialId, standard.grade).map((grade) => ({
  id: `ok.pe.${grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId,
  grade,
  subject: "physicalEducation",
  generatorKind: "oklahomaPhysicalEducationAdult",
  responseType: "constructedResponse",
  diagnosticEligible: false,
  audioSupported: true,
  provenance: "Project original",
  review: reviewed
})));
