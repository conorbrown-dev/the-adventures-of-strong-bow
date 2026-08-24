import { oklahomaMathStandards } from "./oklahoma-math-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma Mathematics 2022 Kindergarten hands-on activity; adult observation required." };
export const oklahomaMathTemplates: CatalogTemplate[] = oklahomaMathStandards.map((standard) => ({
  id: `ok.math.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId, grade: standard.grade, subject: "math", generatorKind: "oklahomaMathAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed
}));
