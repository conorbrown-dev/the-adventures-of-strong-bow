import { studentApi } from "../game/utils/studentSession";
import type { CurriculumGrade, CurriculumSubject } from "../game/data/commonCoreQuizzes";

export type LearningMode = "practice" | "diagnostic" | "placement" | "proctored" | "adultScored";
export type QuestionView = { schemaVersion: number; id: string; templateId: string; templateVersion: number; standardIds: string[]; responseType: string; prompt: { text: string; audioText: string | null; instructions: string | null }; interaction: { choices?: Array<{ id: string; label: string }>; visual?: { count: number; objectKey: string }; items?: string[]; categories?: string[] }; explanation: string; accessibility: { spokenPrompt: string | null; textAlternative: string } };
export type SessionView = { sessionId: string; position: number; length: number; question: QuestionView };
export type AnswerResult = { correct: boolean; explanation: string; masteryState: string; complete: boolean };
export type StudentPlacement = { id: string; username: string; grade: CurriculumGrade; subjects: CurriculumSubject[]; curriculumLevels: Partial<Record<"ELA" | "MATH", CurriculumGrade>> };
const key = "molly-curriculum-active-session-v3";
const save = (session: SessionView) => localStorage.setItem(key, JSON.stringify({ sessionId: session.sessionId, position: session.position, length: session.length }));
export const learningApplication = {
  async start(learnerId: string, purpose: LearningMode, proctorCode?: string, grade = "K", subject?: "ELA" | "MATH"): Promise<SessionView> { const session = await studentApi<SessionView>("/curriculum/learning/sessions", "POST", { learnerId, purpose, grade, ...(subject ? { subject } : {}), ...(proctorCode ? { proctorCode } : {}) }); save(session); return session; },
  async restore(): Promise<SessionView | null> { try { const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { sessionId?: string } | null; return saved?.sessionId ? await studentApi<SessionView>(`/curriculum/learning/sessions/${saved.sessionId}`) : null; } catch { localStorage.removeItem(key); return null; } },
  async submit(sessionId: string, answer: unknown): Promise<AnswerResult> { return studentApi<AnswerResult>(`/curriculum/learning/sessions/${sessionId}/answers`, "POST", { answer }); },
  async scoreAdult(sessionId: string, demonstrated: boolean): Promise<AnswerResult> { return studentApi<AnswerResult>(`/curriculum/learning/sessions/${sessionId}/adult-score`, "POST", { demonstrated }); },
  async updateSubjectLevel(studentId: string, subject: "ELA" | "MATH", grade: "K" | "GRADE_1", verificationCode: string): Promise<StudentPlacement> { return studentApi<StudentPlacement>(`/students/${studentId}/subject-level`, "PUT", { subject, grade, verificationCode }); },
  async next(sessionId: string): Promise<SessionView | null> { const response = await studentApi<{ session: SessionView | null }>(`/curriculum/learning/sessions/${sessionId}/next`, "POST"); if (response.session) save(response.session); else localStorage.removeItem(key); return response.session; },
  async progress(learnerId: string) { return studentApi<{ attempts: Array<{ primaryStandardId: string; correct: boolean }>; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; latestDiagnosticPlacement: { grouping: string; grade: string } | null }>(`/curriculum/learning/progress/${learnerId}`); }
};
