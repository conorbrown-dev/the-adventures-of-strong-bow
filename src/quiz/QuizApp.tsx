import { useEffect, useMemo, useState } from "react";
import { commonCoreQuizzes, gradeLabel, type CurriculumGrade, type CurriculumQuiz, type CurriculumSubject } from "../game/data/commonCoreQuizzes";
import { clearStudentSession, loadStudentSession, saveStudentSession, studentApi, type StudentSession } from "../game/utils/studentSession";

type Screen = "hidden" | "access" | "quiz" | "complete" | "progress";

function chooseQuiz(session: StudentSession): CurriculumQuiz {
  const available = session.demo
    ? commonCoreQuizzes
    : commonCoreQuizzes.filter((quiz) => quiz.grade === session.student.grade && session.student.subjects.includes(quiz.subject));
  return available[Math.floor(Math.random() * available.length)] ?? commonCoreQuizzes[0];
}

export function QuizApp(): JSX.Element | null {
  const [screen, setScreen] = useState<Screen>("hidden");
  const [session, setSession] = useState<StudentSession | null>(loadStudentSession());
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [createMode, setCreateMode] = useState(false);
  const [grade, setGrade] = useState<CurriculumGrade>("K");
  const [subjects, setSubjects] = useState<CurriculumSubject[]>(["ELA", "MATH"]);
  const [quiz, setQuiz] = useState<CurriculumQuiz | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [progress, setProgress] = useState<{ completedQuizzes: number; accuracy: number | null; masteredSightWords: number } | null>(null);

  useEffect(() => {
    const open = () => { const current = loadStudentSession(); setSession(current); setScreen(current ? "quiz" : "access"); if (current) startQuiz(current); };
    window.addEventListener("quiz-ui:open", open);
    return () => window.removeEventListener("quiz-ui:open", open);
  }, []);

  const question = quiz?.questions[questionIndex] ?? null;
  const heading = useMemo(() => session?.demo ? "DEMO MODE · ALL ACCESS" : session ? `${session.student.username.toUpperCase()} · ${gradeLabel(session.student.grade).toUpperCase()}` : "STUDENT ACCESS", [session]);

  function startQuiz(current = session): void {
    if (!current) return;
    setQuiz(chooseQuiz(current)); setQuestionIndex(0); setCorrect(0); setStartedAt(Date.now()); setMessage(""); setScreen("quiz");
  }
  function close(): void { setScreen("hidden"); window.dispatchEvent(new Event("quiz-ui:close")); }
  async function login(): Promise<void> {
    if (!username.trim() || !/^\d{4}$/.test(pin)) { setMessage("Enter a username and exactly four PIN digits."); return; }
    try {
      const result = await studentApi<StudentSession>(createMode ? "/students" : "/auth/login", "POST", createMode ? { username: username.trim(), pin, grade, subjects } : { username: username.trim(), pin });
      saveStudentSession(result); setSession(result); startQuiz(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to sign in."); }
  }
  function toggleSubject(subject: CurriculumSubject): void { setSubjects((current) => current.includes(subject) ? current.length === 1 ? current : current.filter((item) => item !== subject) : [...current, subject]); }
  function demo(): void {
    const result: StudentSession = { demo: true, token: "demo-mode", student: { id: "demo-player", username: "Demo Player", grade: "K", subjects: ["ELA", "MATH"] } };
    saveStudentSession(result); setSession(result); startQuiz(result);
  }
  function answer(choice: number): void {
    if (!quiz || !question) return;
    const nextCorrect = correct + (choice === question.answerIndex ? 1 : 0);
    if (questionIndex + 1 < quiz.questions.length) { setCorrect(nextCorrect); setQuestionIndex((index) => index + 1); return; }
    setCorrect(nextCorrect); setScreen("complete");
    if (session && !session.demo) void studentApi(`/students/${session.student.id}/quiz-attempts`, "POST", { subject: quiz.subject, grade: quiz.grade, quizId: quiz.id, standardCode: quiz.questions.map((item) => item.standardCode).join(", "), correctAnswers: nextCorrect, questionCount: quiz.questions.length, durationMs: Date.now() - startedAt });
  }
  async function viewProgress(): Promise<void> {
    if (!session || session.demo) { setProgress(null); setScreen("progress"); return; }
    try { const data = await studentApi<{ summary: { completedQuizzes: number; accuracy: number | null; masteredSightWords: number } }>(`/students/${session.student.id}/progress`); setProgress(data.summary); setScreen("progress"); }
    catch { setMessage("Progress is temporarily unavailable."); }
  }
  function signOut(): void { clearStudentSession(); setSession(null); setUsername(""); setPin(""); setScreen("access"); }

  if (screen === "hidden") return null;
  return <main className="quiz-app"><section className="quiz-shell">
    <header className="quiz-header"><p>{heading}</p><button className="text-button" onClick={close}>GAMES</button></header>
    {screen === "access" && <div className="access-panel"><h1>{createMode ? "CREATE STUDENT" : "STUDENT QUIZZES"}</h1><p>{createMode ? "Set up a username, four-digit PIN, grade, and subjects." : "Sign in with your username and four-digit PIN."}</p><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label><label>PIN<input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" autoComplete="current-password" /></label>{createMode && <><label>Grade<select value={grade} onChange={(event) => setGrade(event.target.value as CurriculumGrade)}>{(["K", "GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5"] as CurriculumGrade[]).map((item) => <option key={item} value={item}>{gradeLabel(item)}</option>)}</select></label><fieldset><legend>Subjects</legend>{(["ELA", "MATH"] as CurriculumSubject[]).map((subject) => <label className="check" key={subject}><input type="checkbox" checked={subjects.includes(subject)} onChange={() => toggleSubject(subject)} /> {subject === "ELA" ? "English Language Arts" : "Math"}</label>)}</fieldset></>}{message && <p className="error">{message}</p>}<div className="actions"><button onClick={() => void login()}>{createMode ? "CREATE STUDENT" : "SIGN IN"}</button><button className="secondary" onClick={() => { setCreateMode((current) => !current); setMessage(""); }}>{createMode ? "I HAVE AN ACCOUNT" : "NEW STUDENT"}</button>{!createMode && <button className="secondary" onClick={demo}>DEMO MODE</button>}</div><p className="hint">Demo Mode unlocks all K–5 ELA and Math quizzes without saving results.</p></div>}
    {screen === "quiz" && quiz && question && <div className="quiz-panel"><p className="eyebrow">{quiz.title.toUpperCase()} · {questionIndex + 1} OF {quiz.questions.length}</p><h1>{question.prompt}</h1><div className="answers">{question.choices.map((choice, index) => <button key={choice} onClick={() => answer(index)}>{choice}</button>)}</div><footer><button className="text-button" onClick={() => void viewProgress()}>MY PROGRESS</button><button className="text-button pink" onClick={signOut}>SIGN OUT</button></footer></div>}
    {screen === "complete" && quiz && <div className="result-panel"><p className="eyebrow">QUIZ COMPLETE</p><h1>Great learning!</h1><p>You scored <strong>{correct} / {quiz.questions.length}</strong>.</p><p>{session?.demo ? "Demo activity is not saved." : "Your progress has been saved."}</p><div className="actions"><button onClick={() => startQuiz()}>NEXT QUIZ</button><button className="secondary" onClick={() => void viewProgress()}>MY PROGRESS</button></div></div>}
    {screen === "progress" && <div className="result-panel"><p className="eyebrow">MY PROGRESS</p><h1>{session?.demo ? "Demo Mode" : "Learning progress"}</h1>{session?.demo ? <p>All grades and subjects are unlocked. Demo activity is not saved.</p> : progress ? <p>Quizzes completed: <strong>{progress.completedQuizzes}</strong><br />Quiz accuracy: <strong>{progress.accuracy === null ? "Not scored yet" : `${progress.accuracy}%`}</strong><br />Mastered sight words: <strong>{progress.masteredSightWords}</strong></p> : <p>{message || "Loading progress…"}</p>}<div className="actions"><button onClick={() => startQuiz()}>BACK TO QUIZ</button></div></div>}
  </section></main>;
}
