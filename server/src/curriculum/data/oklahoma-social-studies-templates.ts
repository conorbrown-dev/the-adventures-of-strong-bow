import { oklahomaSocialStudiesStandards } from "./oklahoma-social-studies-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma 2026 social studies inquiry; adult observation required." };

export const oklahomaSocialStudiesTemplates: CatalogTemplate[] = oklahomaSocialStudiesStandards.map((standard) => ({
  id: `ok.social-studies.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId,
  grade: standard.grade,
  subject: "socialStudies",
  generatorKind: "oklahomaSocialStudiesAdult",
  responseType: "constructedResponse",
  diagnosticEligible: false,
  audioSupported: true,
  provenance: "Project original",
  review: reviewed
}));
