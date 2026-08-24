import { oklahomaComputerScienceStandards } from "./oklahoma-computer-science-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma computer science investigation; adult observation and device-safety support required." };
export const oklahomaComputerScienceTemplates: CatalogTemplate[] = oklahomaComputerScienceStandards.map((standard) => ({
  id: `ok.cs.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId, grade: standard.grade, subject: "computerScience", generatorKind: "oklahomaComputerScienceAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed
}));
