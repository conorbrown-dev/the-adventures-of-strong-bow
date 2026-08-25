import { loadStudentSession, studentApi } from "../game/utils/studentSession";
import type { CurriculumGrade, CurriculumSubject } from "../game/data/commonCoreQuizzes";

export type LearningMode = "practice" | "diagnostic" | "placement" | "proctored" | "adultScored";
export type QuestionView = { schemaVersion: number; id: string; templateId: string; templateVersion: number; standardIds: string[]; responseType: string; prompt: { text: string; audioText: string | null; instructions: string | null }; interaction: { choices?: Array<{ id: string; label: string }>; visual?: { count: number; objectKey: string }; items?: string[]; categories?: string[]; adultChecklist?: string[]; learningTip?: string }; explanation: string; accessibility: { spokenPrompt: string | null; textAlternative: string } };
export type SessionView = { sessionId: string; position: number; length: number; assessmentStage?: { grade: string; number: number; total: number }; question: QuestionView };
export type PlacementResult = { grouping: string; grade: string; learningTargetIds: string[] };
export type AnswerResult = { correct: boolean; explanation: string; masteryState: string; complete: boolean; retry?: boolean; placement?: PlacementResult };
export type StudentPlacement = { id: string; username: string; grade: CurriculumGrade; subjects: CurriculumSubject[]; curriculumLevels: Partial<Record<CurriculumSubject, CurriculumGrade>> };
export type LessonPlanActivity = { minutes: number; directions: string[] };
export type LessonPlanView = {
  id: string;
  version: number;
  grade: "K" | "1" | "2";
  subject: "math" | "ela";
  unitId: string;
  title: string;
  summary: string;
  standardIds: string[];
  materials: Array<{ name: string; alternatives: string[] }>;
  days: Array<{
    day: number;
    title: string;
    objective: string;
    standardIds: string[];
    adultSetup: string[];
    textRecommendation: string;
    warmUp: LessonPlanActivity;
    explicitModel: LessonPlanActivity;
    guidedPractice: LessonPlanActivity;
    independentPractice: LessonPlanActivity & { templateIds: string[]; itemCount: number };
    extension: LessonPlanActivity;
    reteach: LessonPlanActivity;
    masteryEvidence: string[];
  }>;
  accessibility: { audioSupported: boolean; requiresColor: boolean; reducedMotionSafe: boolean; accommodationNotes: string[] };
};
const key = "molly-curriculum-active-session-v4";

function authenticatedStudentId(): string {
  const session = loadStudentSession();
  if (!session || session.demo) throw new Error("Sign in with a student account to save Learning progress.");
  return session.student.id;
}

const save = (session: SessionView) => localStorage.setItem(key, JSON.stringify({ studentId: authenticatedStudentId(), sessionId: session.sessionId, position: session.position, length: session.length }));
export const learningApplication = {
  async start(purpose: LearningMode, proctorCode?: string, grade = "K", subject?: "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY"): Promise<SessionView> { authenticatedStudentId(); const session = await studentApi<SessionView>("/curriculum/learning/sessions", "POST", { purpose, grade, ...(subject ? { subject } : {}), ...(proctorCode ? { proctorCode } : {}) }); save(session); return session; },
  async restore(): Promise<SessionView | null> { try { const studentId = authenticatedStudentId(); const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { studentId?: string; sessionId?: string } | null; if (!saved?.sessionId || saved.studentId !== studentId) { localStorage.removeItem(key); return null; } return await studentApi<SessionView>(`/curriculum/learning/sessions/${saved.sessionId}`); } catch { localStorage.removeItem(key); return null; } },
  async submit(sessionId: string, answer: unknown, usedHint = false): Promise<AnswerResult> { return studentApi<AnswerResult>(`/curriculum/learning/sessions/${sessionId}/answers`, "POST", { answer, usedHint }); },
  async scoreAdult(sessionId: string, demonstrated: boolean, evidenceNote?: string): Promise<AnswerResult> { return studentApi<AnswerResult>(`/curriculum/learning/sessions/${sessionId}/adult-score`, "POST", { demonstrated, ...(evidenceNote?.trim() ? { evidenceNote: evidenceNote.trim() } : {}) }); },
  async updateSubjectLevel(subject: "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY", grade: "K" | "GRADE_1" | "GRADE_2", verificationCode: string): Promise<StudentPlacement> { const studentId = authenticatedStudentId(); return studentApi<StudentPlacement>(`/students/${studentId}/subject-level`, "PUT", { subject, grade, verificationCode }); },
  async next(sessionId: string): Promise<SessionView | null> { const response = await studentApi<{ session: SessionView | null }>(`/curriculum/learning/sessions/${sessionId}/next`, "POST"); if (response.session) save(response.session); else localStorage.removeItem(key); return response.session; },
  async lessonPlans(): Promise<LessonPlanView[]> { authenticatedStudentId(); return studentApi<LessonPlanView[]>("/curriculum/learning/lesson-plans"); },
  async progress() { authenticatedStudentId(); return studentApi<{ attempts: Array<{ sessionId: string; primaryStandardId: string; correct: boolean; usedHint: boolean; independent: boolean; purpose: string; submittedAnswer: unknown }>; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; latestDiagnosticPlacement: PlacementResult | null; latestAssessmentSessionId: string | null }>("/curriculum/learning/progress"); }
};
