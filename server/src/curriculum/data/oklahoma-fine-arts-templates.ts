import { oklahomaFineArtsStandards } from "./oklahoma-fine-arts-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma Fine Arts performance and reflection activity; adult observation required." };
const gradesFor = (id: string) => id.startsWith("E.MA.") ? ["K", "1", "2"] : [id.split(".")[0]!];

export const oklahomaFineArtsTemplates: CatalogTemplate[] = oklahomaFineArtsStandards.flatMap((standard) => gradesFor(standard.officialId).map((grade) => ({
  id: `ok.fa.${grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId,
  grade,
  subject: "fineArts",
  generatorKind: "oklahomaFineArtsAdult",
  responseType: "constructedResponse",
  diagnosticEligible: false,
  audioSupported: true,
  provenance: "Project original",
  review: reviewed
})));
