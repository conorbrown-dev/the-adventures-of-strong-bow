import type { CurriculumGrade, CurriculumSubject } from "./standard";

export const QUESTION_RESPONSE_TYPES = [
  "singleChoice", "multipleChoice", "numericInput", "textInput", "sequence",
  "classification", "matching", "pointSelection", "constructedResponse"
] as const;
export type QuestionResponseType = (typeof QUESTION_RESPONSE_TYPES)[number];

export type QuestionReviewStatus = "draft" | "validated" | "reviewed" | "retired";

export interface QuestionTemplate {
  schemaVersion: number;
  id: string;
  version: number;
  primaryStandardId: string;
  supportingStandardIds: string[];
  subject: CurriculumSubject;
  grade: CurriculumGrade;
  responseType: QuestionResponseType;
  prompt: { text: string; audioText?: string | null; instructions?: string | null };
  generator: { kind: string; parameters: Record<string, unknown> };
  answerSpec?: Record<string, unknown> | null;
  distractorStrategy?: Record<string, unknown> | null;
  difficulty: { band: number; dimensions?: Record<string, unknown> };
  gameModes: string[];
  modalities: { requiresReading: boolean; audioSupported: boolean; visualSupported: boolean };
  diagnosticEligible?: boolean;
  provenance: { origin: "original" | "adapted" | "copied" | "aiDraft"; license: string; [key: string]: unknown };
  review: { status: QuestionReviewStatus; reviewer?: string | null; reviewedAt?: string | null; notes?: string | null };
}

export interface QuestionInstance {
  schemaVersion: number;
  id: string;
  templateId: string;
  templateVersion: number;
  seed: string | number;
  standardIds: string[];
  responseType: QuestionResponseType;
  prompt: { text: string; audioText?: string | null; instructions?: string | null };
  interaction: Record<string, unknown>;
  canonicalAnswer: unknown;
  answerNormalization: Record<string, unknown> | null;
  explanation: string;
  accessibility: { spokenPrompt: string | null; textAlternative: string; reducedMotionSafe?: boolean };
  provenance: Record<string, unknown>;
}

export interface QuestionTemplateRepository {
  list(): Promise<QuestionTemplate[]>;
  findById(id: string): Promise<QuestionTemplate | null>;
}
