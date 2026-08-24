import { oklahomaScienceStandards } from "./oklahoma-science-standards";
import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-08-24T00:00:00.000Z", note: "Oklahoma 2026 science performance task; adult observation required." };
const task = (standardId: string, grade: string, id: string): CatalogTemplate => ({ id, standardId, grade, subject: "science", generatorKind: "oklahomaScienceAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed });

const gradeTasks = oklahomaScienceStandards.filter((standard) => !standard.officialId.startsWith("K2.")).map((standard) => task(standard.officialId, standard.grade, `ok.science.${standard.grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`));
const engineeringTasks = ["K", "1", "2"].flatMap((grade) => oklahomaScienceStandards.filter((standard) => standard.officialId.startsWith("K2.")).map((standard) => task(standard.officialId, grade, `ok.science.${grade.toLowerCase()}.${standard.officialId.toLowerCase().replaceAll(".", "-")}`)));

export const oklahomaScienceTemplates: CatalogTemplate[] = [...gradeTasks, ...engineeringTasks];
