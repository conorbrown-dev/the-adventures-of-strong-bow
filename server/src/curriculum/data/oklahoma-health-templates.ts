import { oklahomaHealthStandards } from "./oklahoma-health-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma 2026 health PreK–2 performance task; adult observation required." };

export const oklahomaHealthTemplates: CatalogTemplate[] = ["K", "1", "2"].flatMap((grade) => oklahomaHealthStandards.map((standard) => ({
  id: `ok.health.${grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId,
  grade,
  subject: "health",
  generatorKind: "oklahomaHealthAdult",
  responseType: "constructedResponse",
  diagnosticEligible: false,
  audioSupported: true,
  provenance: "Project original",
  review: reviewed
})));
