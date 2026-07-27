import { studentApi } from "../game/utils/studentSession";

export type LearningMode = "practice" | "diagnostic";
export type QuestionView = { schemaVersion: number; id: string; templateId: string; templateVersion: number; standardIds: string[]; responseType: string; prompt: { text: string; audioText: string | null; instructions: string | null }; interaction: { choices?: Array<{ id: string; label: string }>; visual?: { count: number; objectKey: string }; items?: string[]; categories?: string[] }; explanation: string; accessibility: { spokenPrompt: string | null; textAlternative: string } };
export type SessionView = { sessionId: string; position: number; length: number; question: QuestionView };
export type AnswerResult = { correct: boolean; explanation: string; masteryState: string; complete: boolean };
const key = "molly-curriculum-active-session-v3";
const save = (session: SessionView) => localStorage.setItem(key, JSON.stringify({ sessionId: session.sessionId, position: session.position, length: session.length }));
export const learningApplication = {
  async start(learnerId: string, purpose: LearningMode): Promise<SessionView> { const session = await studentApi<SessionView>("/curriculum/learning/sessions", "POST", { learnerId, purpose }); save(session); return session; },
  async restore(): Promise<SessionView | null> { try { const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { sessionId?: string } | null; return saved?.sessionId ? await studentApi<SessionView>(`/curriculum/learning/sessions/${saved.sessionId}`) : null; } catch { localStorage.removeItem(key); return null; } },
  async submit(sessionId: string, answer: unknown): Promise<AnswerResult> { return studentApi<AnswerResult>(`/curriculum/learning/sessions/${sessionId}/answers`, "POST", { answer }); },
  async next(sessionId: string): Promise<SessionView | null> { const session = await studentApi<SessionView | null>(`/curriculum/learning/sessions/${sessionId}/next`, "POST"); if (session) save(session); else localStorage.removeItem(key); return session; },
  async progress(learnerId: string) { return studentApi<{ attempts: Array<{ primaryStandardId: string; correct: boolean }>; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; latestDiagnosticPlacement: { grouping: string; grade: string } | null }>(`/curriculum/learning/progress/${learnerId}`); }
};
