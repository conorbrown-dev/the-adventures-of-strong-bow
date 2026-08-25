import type { CurriculumGrade, CurriculumSubject } from "./standard";

export type LessonPlanReviewStatus = "draft" | "validated" | "reviewed" | "retired";

export type LessonActivity = {
  minutes: number;
  directions: string[];
};

export type LessonPlanDay = {
  day: number;
  title: string;
  objective: string;
  standardIds: string[];
  adultSetup: string[];
  textRecommendation: string;
  warmUp: LessonActivity;
  explicitModel: LessonActivity;
  guidedPractice: LessonActivity;
  independentPractice: LessonActivity & { templateIds: string[]; itemCount: number };
  extension: LessonActivity;
  reteach: LessonActivity;
  masteryEvidence: string[];
};

export type LessonPlanSequence = {
  schemaVersion: 1;
  id: string;
  version: number;
  grade: Extract<CurriculumGrade, "K" | "1" | "2">;
  subject: Extract<CurriculumSubject, "math" | "ela">;
  unitId: string;
  title: string;
  summary: string;
  standardIds: string[];
  materials: Array<{ name: string; alternatives: string[] }>;
  days: LessonPlanDay[];
  accessibility: {
    audioSupported: boolean;
    requiresColor: boolean;
    reducedMotionSafe: boolean;
    accommodationNotes: string[];
  };
  provenance: { origin: "original"; license: string };
  review: {
    status: LessonPlanReviewStatus;
    reviewer?: string;
    reviewedAt?: string;
    notes?: string;
    contentHash?: string;
  };
};
