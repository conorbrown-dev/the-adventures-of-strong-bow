import type { CurriculumGrade, CurriculumSubject } from "../data/commonCoreQuizzes";

export interface StudentSession {
  token: string;
  demo?: boolean;
  student: { id: string; username: string; grade: CurriculumGrade; subjects: CurriculumSubject[] };
}

const SESSION_KEY = "mollys-learning-academy.student-session";
const API_ROOT = import.meta.env.VITE_API_URL ?? "/api";

export function loadStudentSession(): StudentSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as StudentSession | null; } catch { return null; }
}
export function saveStudentSession(session: StudentSession): void { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
export function clearStudentSession(): void { localStorage.removeItem(SESSION_KEY); }

export async function studentApi<T>(path: string, method = "GET", body?: object): Promise<T> {
  const session = loadStudentSession();
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(" ") : payload.message ?? "Unable to reach the learning server.");
  return payload as T;
}
