import { oklahomaInformationLiteracyStandards } from "./oklahoma-information-literacy-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma Information Literacy inquiry; adult guidance and safe, supervised research required." };
export const oklahomaInformationLiteracyTemplates: CatalogTemplate[] = oklahomaInformationLiteracyStandards.map((standard) => ({
  id: `ok.il.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId, grade: standard.grade, subject: "informationLiteracy", generatorKind: "oklahomaInformationLiteracyAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed
}));
