import { oklahomaEducationTechnologyStandards } from "./oklahoma-education-technology-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Supplemental Oklahoma educational-technology activity; adult guidance and safe, supervised digital use required." };
export const oklahomaEducationTechnologyTemplates: CatalogTemplate[] = oklahomaEducationTechnologyStandards.map((standard) => ({
  id: `ok.edtech.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId, grade: standard.grade, subject: "computerScience", generatorKind: "oklahomaComputerScienceAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed
}));
