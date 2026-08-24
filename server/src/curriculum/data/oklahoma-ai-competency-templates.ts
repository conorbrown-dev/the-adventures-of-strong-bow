import { oklahomaAiCompetencies } from "./oklahoma-ai-competencies";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Supplemental Oklahoma AI competency; adult-guided, human-centered, and no independent AI tool use required." };
export const oklahomaAiCompetencyTemplates: CatalogTemplate[] = oklahomaAiCompetencies.map((standard) => ({
  id: `ok.ai.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`,
  standardId: standard.officialId, grade: standard.grade, subject: "computerScience", generatorKind: "oklahomaComputerScienceAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed
}));
