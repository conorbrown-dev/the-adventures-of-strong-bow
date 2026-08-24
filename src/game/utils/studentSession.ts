import type { CurriculumGrade, CurriculumSubject } from "../data/commonCoreQuizzes";

export interface StudentSession {
  token: string;
  demo?: boolean;
  student: { id: string; username: string; grade: CurriculumGrade; subjects: CurriculumSubject[]; curriculumLevels?: Partial<Record<CurriculumSubject, CurriculumGrade>> };
}

const SESSION_KEY = "mollys-learning-academy.student-session";
const API_ROOT = import.meta.env.VITE_API_URL ?? "/api";

export function loadStudentSession(): StudentSession | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    if (!isStudentSession(value)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return value;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}
export function isStudentSession(value: unknown): value is StudentSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StudentSession>;
  return typeof candidate.token === "string" && !!candidate.student && typeof candidate.student.id === "string" && typeof candidate.student.username === "string" && typeof candidate.student.grade === "string" && Array.isArray(candidate.student.subjects);
}
export function saveStudentSession(session: StudentSession): void {
  if (!isStudentSession(session)) throw new Error("The learning server returned an incomplete student session.");
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function clearStudentSession(): void { localStorage.removeItem(SESSION_KEY); }

export async function studentApi<T>(path: string, method = "GET", body?: object): Promise<T> {
  const session = loadStudentSession();
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("The learning server is unavailable. Start the student API and try again.");
  }
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("The learning service is temporarily unavailable. Please try again soon.");
    }
    const message = (payload as { message?: unknown }).message;
    throw new Error(Array.isArray(message) ? message.join(" ") : typeof message === "string" ? message : "Unable to reach the learning server.");
  }
  if (!isJson) {
    throw new Error("The learning server is unavailable. Start the student API and try again.");
  }
  return payload as T;
}
