import { loadStudentSession, studentApi } from "../game/utils/studentSession";
import type { CurriculumGrade, CurriculumSubject } from "../game/data/commonCoreQuizzes";

export type LearningMode = "practice" | "diagnostic" | "placement" | "proctored" | "adultScored";
export type LearningSubject = "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY";
export type QuestionView = { schemaVersion: number; id: string; templateId: string; templateVersion: number; standardIds: string[]; responseType: string; prompt: { text: string; audioText: string | null; instructions: string | null }; interaction: { choices?: Array<{ id: string; label: string }>; visual?: { count: number; objectKey: string }; items?: string[]; categories?: string[]; adultChecklist?: string[]; learningTip?: string }; explanation: string; accessibility: { spokenPrompt: string | null; textAlternative: string } };
export type LessonSupportLevel = "L0_REPLAY" | "L1_FOCUS" | "L2_CONTRAST" | "L3_PARTIAL" | "L4_MODEL";
export type LessonChoiceView = { id: string; label: string; audioText?: string; visual?: string; conceptDomain: string };
export type LessonPresentationView =
  | { kind: "TUTOR_MESSAGE"; displayTokens?: readonly string[]; modelText?: string; audioCueIds?: readonly string[] }
  | { kind: "CHOICE_BOARD"; choices: readonly LessonChoiceView[]; audioCueIds?: readonly string[] }
  | { kind: "CARD_WORKSPACE"; cards: readonly string[]; slots: number; wordAudioText?: string; audioCueIds?: readonly string[] }
  | { kind: "CONTROLLED_TEXT"; text: string; choices: readonly LessonChoiceView[]; helpNarration: string };
export type LessonActivityView = {
  instanceId: string;
  activityId: string;
  activityVersion: number;
  recipeId: string;
  primarySkill: { id: string; name: string; domain: string };
  purpose: "INSTRUCTION" | "MODELED_EXAMPLE" | "GUIDED_PRACTICE" | "INDEPENDENT_PRACTICE" | "MASTERY_CHECK" | "REVIEW";
  stage: string;
  evidenceMode: "SPOKEN_ONLY" | "LISTENING" | "VISUAL_PRINT_WITH_NARRATED_DIRECTIONS" | "SUPPORTED_READING" | "INDEPENDENT_READING";
  selectionReason: string;
  tutor: { state: "IDLE" | "SPEAKING" | "POINTING" | "ENCOURAGING" | "GENTLE_CORRECTION" | "CELEBRATING"; message: string };
  prompt: string;
  narration: string;
  presentation: LessonPresentationView;
  availableSupports: readonly LessonSupportLevel[];
  highestSupport?: LessonSupportLevel;
  celebrationEligible: boolean;
};
export type SessionView = { sessionId: string; position: number; length: number; assessmentStage?: { grade: string; number: number; total: number }; activity?: LessonActivityView; question: QuestionView };
export type PlacementResult = {
  grouping: string;
  grade: string;
  learningTargetIds: string[];
  placementConfidence?: "LOW" | "MODERATE" | "HIGH";
  evidenceCoverage?: number;
  totalItems?: number;
  demonstratedStrengths?: string[];
  needsReinforcement?: string[];
  criticalPrerequisiteGaps?: string[];
  unresolvedSkills?: string[];
  strandPlacements?: Array<{ domain: string; label: string; instructionalGrade: string; status: "ready" | "needsReinforcement" | "unresolved" }>;
};
export type AnswerResult = { correct: boolean; explanation: string; masteryState: string; complete: boolean; retry?: boolean; placement?: PlacementResult; celebrate?: boolean; evidenceMode?: LessonActivityView["evidenceMode"]; misconception?: string; tutorState?: LessonActivityView["tutor"]["state"]; tutorMessage?: string };
export type HintResult = { message: string; narration?: string; highestSupport: LessonSupportLevel; evidenceMode: LessonActivityView["evidenceMode"] };
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
type SavedLearningSession = { studentId: string; sessionId: string; position: number; length: number; mode?: LearningMode; subject?: LearningSubject };
export type ResumableLearningSession = { session: SessionView; mode: "practice" | "diagnostic" | "placement"; subject?: LearningSubject };

function authenticatedStudentId(): string {
  const session = loadStudentSession();
  if (!session || session.demo) throw new Error("Sign in with a student account to save Learning progress.");
  return session.student.id;
}

function readSavedSession(): SavedLearningSession | null {
  const studentId = authenticatedStudentId();
  const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<SavedLearningSession> | null;
  if (!saved?.sessionId || saved.studentId !== studentId) {
    localStorage.removeItem(key);
    return null;
  }
  return { studentId, sessionId: saved.sessionId, position: saved.position ?? 0, length: saved.length ?? 0, mode: saved.mode, subject: saved.subject };
}

function save(session: SessionView, context?: { mode: LearningMode; subject?: LearningSubject }): void {
  const existing = (() => { try { return readSavedSession(); } catch { return null; } })();
  const metadata = context ?? (existing?.sessionId === session.sessionId ? { mode: existing.mode, subject: existing.subject } : undefined);
  localStorage.setItem(key, JSON.stringify({
    studentId: authenticatedStudentId(), sessionId: session.sessionId, position: session.position, length: session.length,
    ...(metadata?.mode ? { mode: metadata.mode } : {}), ...(metadata?.subject ? { subject: metadata.subject } : {})
  } satisfies SavedLearningSession));
}
export const learningApplication = {
  async start(purpose: LearningMode, proctorCode?: string, grade = "K", subject?: LearningSubject): Promise<SessionView> { authenticatedStudentId(); const session = await studentApi<SessionView>("/curriculum/learning/sessions", "POST", { purpose, grade, ...(subject ? { subject } : {}), ...(proctorCode ? { proctorCode } : {}) }); save(session, { mode: purpose, subject }); return session; },
  async restore(): Promise<SessionView | null> { try { const saved = readSavedSession(); return saved ? await studentApi<SessionView>(`/curriculum/learning/sessions/${saved.sessionId}`) : null; } catch { localStorage.removeItem(key); return null; } },
  async resumableSession(): Promise<ResumableLearningSession | null> {
    try {
      const saved = readSavedSession();
      if (!saved || (saved.mode !== "practice" && saved.mode !== "diagnostic" && saved.mode !== "placement")) return null;
      const session = await studentApi<SessionView>(`/curriculum/learning/sessions/${saved.sessionId}`);
      return { session, mode: saved.mode, subject: saved.subject };
    } catch { localStorage.removeItem(key); return null; }
  },
  async pause(session: SessionView): Promise<void> { const saved = await studentApi<SessionView>(`/curriculum/learning/sessions/${session.sessionId}/pause`, "POST"); save(saved); },
  async submit(sessionId: string, answer: unknown, usedHint = false): Promise<AnswerResult> { return studentApi<AnswerResult>(`/curriculum/learning/sessions/${sessionId}/answers`, "POST", { answer, usedHint }); },
  async scoreAdult(sessionId: string, demonstrated: boolean, evidenceNote?: string): Promise<AnswerResult> { return studentApi<AnswerResult>(`/curriculum/learning/sessions/${sessionId}/adult-score`, "POST", { demonstrated, ...(evidenceNote?.trim() ? { evidenceNote: evidenceNote.trim() } : {}) }); },
  async updateSubjectLevel(subject: "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY", grade: "K" | "GRADE_1" | "GRADE_2", verificationCode: string): Promise<StudentPlacement> { const studentId = authenticatedStudentId(); return studentApi<StudentPlacement>(`/students/${studentId}/subject-level`, "PUT", { subject, grade, verificationCode }); },
  async next(sessionId: string): Promise<SessionView | null> { const response = await studentApi<{ session: SessionView | null }>(`/curriculum/learning/sessions/${sessionId}/next`, "POST"); if (response.session) save(response.session); else localStorage.removeItem(key); return response.session; },
  async completeActivity(sessionId: string, instanceId: string): Promise<{ complete: boolean }> { return studentApi<{ complete: boolean }>(`/curriculum/learning/sessions/${sessionId}/activities/${instanceId}/complete`, "POST"); },
  async hint(sessionId: string, instanceId: string, level?: LessonSupportLevel): Promise<HintResult> { return studentApi<HintResult>(`/curriculum/learning/sessions/${sessionId}/activities/${instanceId}/hints`, "POST", level ? { level } : {}); },
  async lessonPlans(): Promise<LessonPlanView[]> { authenticatedStudentId(); return studentApi<LessonPlanView[]>("/curriculum/learning/lesson-plans"); },
  async progress() { authenticatedStudentId(); return studentApi<{ attempts: Array<{ sessionId: string; primaryStandardId: string; correct: boolean; usedHint: boolean; independent: boolean; purpose: string; submittedAnswer: unknown }>; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; skillProgress: Array<{ skillId: string; skillName: string; domain: string; state: string }>; latestDiagnosticPlacement: PlacementResult | null; latestAssessmentSessionId: string | null }>("/curriculum/learning/progress"); }
};
