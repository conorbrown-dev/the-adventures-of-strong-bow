import type { Standard } from "../domain/standard";

const sourceUrl = "https://oklahoma.gov/content/dam/ok/en/osde/documents/services/standards-learning/computer-science/Emerging%20Tech%20and%20AI%20Competencies%20for%20CS%20Students.pdf";
const license = { name: "Oklahoma Student Competencies", notice: "Oklahoma State Department of Education voluntary AI competencies; identifiers and short descriptions are used for alignment." };
const entries = [
  ["K.ET.AI.01", "K", "identify examples of artificial intelligence in daily life, such as digital assistants and smart devices"],
  ["1.ET.AI.01", "1", "describe how artificial intelligence helps people complete daily tasks"],
  ["2.ET.AI.01", "2", "explain how artificial intelligence systems learn from patterns and make simple decisions"]
] as const;

export const oklahomaAiCompetencies: Standard[] = entries.map(([officialId, grade, statement]) => ({
  schemaVersion: 1, officialId, canonicalId: `oklahoma.ai-competencies.${officialId.toLowerCase()}`, subject: "computerScience", grade, gradeName: grade === "K" ? "Kindergarten" : `Grade ${grade}`, domainCode: "ET", domain: "Oklahoma Emerging Technologies & Artificial Intelligence Competencies", strand: "Supplemental AI", clusterCode: null, parentId: null, sourceItem: officialId, statement, childFriendlyDescription: `I can ${statement}.`, isLeaf: true, instructionalStatus: "assessable", prerequisiteIds: [], tags: ["oklahoma", "ai", "computer-science", "supplemental", "2025"], source: { publisher: "Oklahoma State Department of Education", package: "Student Competencies for Emerging Technologies & Artificial Intelligence", reference: officialId, recoverySourceUrl: sourceUrl, recoveryRevision: "2025", officialReferencePdf: sourceUrl, verification: "Voluntary competencies that complement, and do not replace, the adopted 2023 Oklahoma Computer Science standards." }, license, active: true
}));
