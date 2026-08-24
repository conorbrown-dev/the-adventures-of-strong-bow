export const CURRICULUM_GRADES = ["K", "1", "2", "3", "4", "5"] as const;
export const CURRICULUM_SUBJECTS = ["math", "ela", "science"] as const;
export const INSTRUCTIONAL_STATUSES = [
  "assessable",
  "broadStandard",
  "notApplicableAtGrade"
] as const;

export type CurriculumGrade = (typeof CURRICULUM_GRADES)[number];
export type CurriculumSubject = (typeof CURRICULUM_SUBJECTS)[number];
export type InstructionalStatus = (typeof INSTRUCTIONAL_STATUSES)[number];

export interface StandardSource {
  publisher: string;
  package: string;
  reference: string;
  recoverySourceUrl: string;
  recoveryRevision: string;
  officialReferencePdf: string;
  verification: string;
}

export interface StandardLicense {
  name: string;
  notice: string;
}

/** Exact, provenance-bearing representation of a Common Core source row. */
export interface Standard {
  schemaVersion: 1;
  officialId: string;
  canonicalId: string;
  subject: CurriculumSubject;
  grade: CurriculumGrade;
  gradeName: string;
  domainCode: string;
  domain: string;
  strand: string | null;
  clusterCode: string | null;
  parentId: string | null;
  sourceItem: string | null;
  statement: string;
  childFriendlyDescription: string | null;
  isLeaf: boolean;
  instructionalStatus: InstructionalStatus;
  prerequisiteIds: string[];
  tags: string[];
  source: StandardSource;
  license: StandardLicense;
  active: boolean;
}

/** Only active, assessable leaf standards are eligible for future quiz targeting. */
export function isQuizTarget(standard: Standard): boolean {
  return standard.active && standard.isLeaf && standard.instructionalStatus === "assessable";
}
