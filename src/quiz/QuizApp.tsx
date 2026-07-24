import { useEffect, useMemo, useState } from "react";
import { gradeLabel, type CurriculumGrade, type CurriculumQuiz, type CurriculumSubject } from "../game/data/commonCoreQuizzes";
import { clearStudentSession, isStudentSession, loadStudentSession, saveStudentSession, studentApi, type StudentSession } from "../game/utils/studentSession";
import { speak, stopSpeaking } from "./speech";
import { chooseQuiz, isCorrectAnswer } from "./quizLogic";

type Screen = "hidden" | "home" | "games" | "access" | "library" | "lesson" | "quiz" | "complete" | "progress";
type BrowserRecognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;

export function QuizApp(): JSX.Element | null {
  const [screen, setScreen] = useState<Screen>("home");
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
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState("");
  const [listening, setListening] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [progress, setProgress] = useState<{ completedQuizzes: number; accuracy: number | null; masteredSightWords: number } | null>(null);
  const [activeSubject, setActiveSubject] = useState<CurriculumSubject | undefined>();

  useEffect(() => {
    const open = () => { const current = loadStudentSession(); setSession(current); setScreen(current ? "library" : "access"); };
    window.addEventListener("quiz-ui:open", open);
    return () => window.removeEventListener("quiz-ui:open", open);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (screen === "lesson" && quiz) speak(`${quiz.lesson.title}. ${quiz.lesson.explanation} Key idea: ${quiz.lesson.keyIdea}`);
    if (screen === "quiz" && question) speak(question.prompt);
  }, [screen, quiz, questionIndex]);

  const question = quiz?.questions[questionIndex] ?? null;
  const heading = useMemo(() => session?.demo ? "DEMO MODE · ALL ACCESS" : session ? `${session.student.username.toUpperCase()} · ${gradeLabel(session.student.grade).toUpperCase()}` : "STUDENT ACCESS", [session]);

  function startQuiz(current = session, subject = activeSubject): void {
    if (!current) return;
    setActiveSubject(subject); setQuiz(chooseQuiz(current, subject)); setQuestionIndex(0); setCorrect(0); setResponse(""); setFeedback(""); setStartedAt(Date.now()); setMessage(""); setScreen("lesson");
  }
  function close(): void { stopSpeaking(); setScreen("home"); }
  function openLessons(): void {
    stopSpeaking();
    const current = loadStudentSession();
    setSession(current);
    setScreen(current ? "library" : "access");
  }
  async function login(): Promise<void> {
    if (!username.trim() || !/^\d{4}$/.test(pin)) { setMessage("Enter a username and exactly four PIN digits."); return; }
    try {
      const result = await studentApi<StudentSession>(createMode ? "/students" : "/auth/login", "POST", createMode ? { username: username.trim(), pin, grade, subjects } : { username: username.trim(), pin });
      if (!isStudentSession(result)) throw new Error("The learning server returned an incomplete student session. Please sign in again.");
      saveStudentSession(result); setSession(result); setScreen("library");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to sign in."); }
  }
  function toggleSubject(subject: CurriculumSubject): void { setSubjects((current) => current.includes(subject) ? current.length === 1 ? current : current.filter((item) => item !== subject) : [...current, subject]); }
  function demo(): void {
    const result: StudentSession = { demo: true, token: "demo-mode", student: { id: "demo-player", username: "Demo Player", grade: "K", subjects: ["ELA", "MATH"] } };
    saveStudentSession(result); setSession(result); setScreen("library");
  }
  function answer(transcript: string): void {
    if (!quiz || !question) return;
    stopSpeaking();
    if (!isCorrectAnswer(transcript, question.acceptedAnswers)) { setFeedback("Try again. Listen to the question and say your answer."); speak("Try again. Listen to the question and say your answer."); return; }
    const nextCorrect = correct + 1;
    if (questionIndex + 1 < quiz.questions.length) { setCorrect(nextCorrect); setQuestionIndex((index) => index + 1); setResponse(""); setFeedback(""); return; }
    setCorrect(nextCorrect); setScreen("complete");
    if (session && !session.demo) void studentApi(`/students/${session.student.id}/quiz-attempts`, "POST", { subject: quiz.subject, grade: quiz.grade, quizId: quiz.id, standardCode: quiz.questions.map((item) => item.standardCode).join(", "), correctAnswers: nextCorrect, questionCount: quiz.questions.length, durationMs: Date.now() - startedAt });
  }
  function listen(): void {
    const recognitionWindow = window as typeof window & { SpeechRecognition?: BrowserRecognitionConstructor; webkitSpeechRecognition?: BrowserRecognitionConstructor };
    const SpeechRecognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) { setFeedback("Voice answers are not available in this browser. Type an answer below instead."); return; }
    stopSpeaking();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript ?? ""; setResponse(transcript); setListening(false); answer(transcript); };
    recognition.onerror = () => { setListening(false); setFeedback("I could not hear that. Try the microphone again or type an answer."); };
    recognition.onend = () => setListening(false);
    setListening(true); recognition.start();
  }
  async function viewProgress(): Promise<void> {
    if (!session || session.demo) { setProgress(null); setScreen("progress"); return; }
    try { const data = await studentApi<{ summary: { completedQuizzes: number; accuracy: number | null; masteredSightWords: number } }>(`/students/${session.student.id}/progress`); setProgress(data.summary); setScreen("progress"); }
    catch { setMessage("Progress is temporarily unavailable."); }
  }
  function signOut(): void { clearStudentSession(); setSession(null); setUsername(""); setPin(""); setScreen("home"); }
  function launchGame(scene: string, sceneData?: object): void { stopSpeaking(); setScreen("hidden"); window.dispatchEvent(new CustomEvent("phaser-game:launch", { detail: { scene, sceneData } })); }

  if (screen === "hidden") return null;
  return <main className={`quiz-app ${screen === "home" || screen === "games" ? "menu-app" : ""}`}><section className="quiz-shell">
    {screen !== "home" && screen !== "games" && <header className="quiz-header"><p>{heading}</p><button className="text-button" onClick={close}>MAIN MENU</button></header>}
    {screen === "home" && <div className="library-panel main-menu-panel"><p className="eyebrow">MOLLY'S LEARNING ACADEMY</p><h1>Choose an adventure</h1><p>Explore a lesson or play a learning game.</p><div className="library-grid main-menu-grid"><MenuCard title="Lessons & Quizzes" description="Explore guided Math, Reading, and Language practice." color="cyan" onClick={openLessons} /><MenuCard title="Games" description="Choose a focused learning game to play." color="pink" onClick={() => { stopSpeaking(); setScreen("games"); }} /></div></div>}
    {screen === "games" && <div className="library-panel main-menu-panel"><p className="eyebrow">LEARNING GAMES</p><h1>Pick a game</h1><p>Each game starts immediately after you choose it.</p><div className="library-grid"> <MenuCard title="Sight Word Studio" description="Listen, say, and practise high-frequency words." color="yellow" onClick={() => launchGame("SightWordsQuizScene")} /><MenuCard title="Vowel Sounds" description="Practise short and long vowel sounds at the barn." color="pink" onClick={() => launchGame("BarnDoorVowelsScene")} /><MenuCard title="Addition Lab" description="Solve sums, then launch into starship mode." color="cyan" onClick={() => launchGame("AdditionGameScene")} /><MenuCard title="Fossil Dig" description="Find fossils and build a dinosaur skeleton." color="purple" onClick={() => launchGame("FossilDigScene")} /><MenuCard title="Kitten Catch: Vowels" description="Catch vowels and build early reading skills." color="yellow" onClick={() => launchGame("LetterCatchScene", { variant: "vowels" })} /><MenuCard title="Kitten Catch: Consonants" description="Catch consonants and build early reading skills." color="purple" onClick={() => launchGame("LetterCatchScene", { variant: "consonants" })} /></div><div className="actions"><button className="secondary" onClick={close}>BACK</button></div></div>}
    {screen === "access" && <div className="access-panel"><h1>{createMode ? "CREATE STUDENT" : "STUDENT QUIZZES"}</h1><p>{createMode ? "Set up a username, four-digit PIN, grade, and subjects." : "Sign in with your username and four-digit PIN."}</p><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label><label>PIN<input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" autoComplete="current-password" /></label>{createMode && <><label>Grade<select value={grade} onChange={(event) => setGrade(event.target.value as CurriculumGrade)}>{(["K", "GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5"] as CurriculumGrade[]).map((item) => <option key={item} value={item}>{gradeLabel(item)}</option>)}</select></label><fieldset><legend>Subjects</legend>{(["ELA", "MATH"] as CurriculumSubject[]).map((subject) => <label className="check" key={subject}><input type="checkbox" checked={subjects.includes(subject)} onChange={() => toggleSubject(subject)} /> {subject === "ELA" ? "English Language Arts" : "Math"}</label>)}</fieldset></>}{message && <p className="error">{message}</p>}<div className="actions"><button onClick={() => void login()}>{createMode ? "CREATE STUDENT" : "SIGN IN"}</button><button className="secondary" onClick={() => { setCreateMode((current) => !current); setMessage(""); }}>{createMode ? "I HAVE AN ACCOUNT" : "NEW STUDENT"}</button>{!createMode && <button className="secondary" onClick={demo}>DEMO MODE</button>}</div><p className="hint">Demo Mode unlocks all K–5 ELA and Math quizzes without saving results.</p></div>}
    {screen === "library" && session && <div className="library-panel"><p className="eyebrow">LESSONS & QUIZZES</p><h1>What would you like to learn?</h1><p>Pick a subject for a guided lesson and oral practice.</p><div className="library-grid">{(session.demo || session.student.subjects.includes("MATH")) && <MenuCard title="Math Lessons" description={`${session.demo ? "All grades" : gradeLabel(session.student.grade)} · guided lesson and oral practice`} color="cyan" onClick={() => startQuiz(session, "MATH")} />}{(session.demo || session.student.subjects.includes("ELA")) && <MenuCard title="Reading & Language" description={`${session.demo ? "All grades" : gradeLabel(session.student.grade)} · guided lesson and oral practice`} color="purple" onClick={() => startQuiz(session, "ELA")} />}</div><div className="actions"><button className="secondary" onClick={() => void viewProgress()}>MY PROGRESS</button><button className="secondary" onClick={signOut}>SIGN OUT</button></div></div>}
    {screen === "lesson" && quiz && <div className="lesson-panel"><p className="eyebrow">MINI LESSON · {quiz.title.toUpperCase()}</p><div className="prompt"><h1>{quiz.lesson.title}</h1><SpeakerButton text={`${quiz.lesson.title}. ${quiz.lesson.explanation} Key idea: ${quiz.lesson.keyIdea}`} label="Read lesson aloud" /></div><p className="lesson-explanation">{quiz.lesson.explanation}</p><aside><strong>KEY IDEA</strong><span>{quiz.lesson.keyIdea}</span></aside><div className="actions"><button onClick={() => { stopSpeaking(); setScreen("quiz"); }}>START PRACTICE</button></div></div>}
    {screen === "quiz" && quiz && question && <div className="quiz-panel"><p className="eyebrow">{quiz.title.toUpperCase()} · {questionIndex + 1} OF {quiz.questions.length}</p><div className="prompt"><h1>{question.prompt}</h1><SpeakerButton text={question.prompt} label="Read question aloud" /></div><section className="oral-answer"><p>Say your answer out loud.</p><button className="microphone-button" onClick={listen}>{listening ? "LISTENING…" : "🎙️ SAY ANSWER"}</button><p className="or">or type an answer</p><form onSubmit={(event) => { event.preventDefault(); answer(response); }}><input aria-label="Type your answer" value={response} onChange={(event) => setResponse(event.target.value)} /><button type="submit">CHECK</button></form>{feedback && <p className="feedback">{feedback}</p>}</section><footer><button className="text-button" onClick={() => void viewProgress()}>MY PROGRESS</button><button className="text-button pink" onClick={signOut}>SIGN OUT</button></footer></div>}
    {screen === "complete" && quiz && <div className="result-panel"><p className="eyebrow">QUIZ COMPLETE</p><h1>Great learning!</h1><p>You scored <strong>{correct} / {quiz.questions.length}</strong>.</p><p>{session?.demo ? "Demo activity is not saved." : "Your progress has been saved."}</p><div className="actions"><button onClick={() => startQuiz()}>NEXT QUIZ</button><button className="secondary" onClick={() => setScreen("library")}>CHOOSE PRACTICE</button><button className="secondary" onClick={() => void viewProgress()}>MY PROGRESS</button></div></div>}
    {screen === "progress" && <div className="result-panel"><p className="eyebrow">MY PROGRESS</p><h1>{session?.demo ? "Demo Mode" : "Learning progress"}</h1>{session?.demo ? <p>All grades and subjects are unlocked. Demo activity is not saved.</p> : progress ? <p>Quizzes completed: <strong>{progress.completedQuizzes}</strong><br />Quiz accuracy: <strong>{progress.accuracy === null ? "Not scored yet" : `${progress.accuracy}%`}</strong><br />Mastered sight words: <strong>{progress.masteredSightWords}</strong></p> : <p>{message || "Loading progress…"}</p>}<div className="actions"><button onClick={() => startQuiz()}>BACK TO QUIZ</button></div></div>}
  </section></main>;
}

function SpeakerButton({ text, label }: { text: string; label: string }): JSX.Element {
  return <button className="speaker-button" onClick={() => speak(text)} aria-label={label} title={label}><span aria-hidden="true">🔊</span></button>;
}

function MenuCard({ title, description, color, onClick }: { title: string; description: string; color: "cyan" | "purple" | "yellow" | "pink"; onClick: () => void }): JSX.Element {
  const announce = (): void => { void speak(title); };
  return <button className={`library-card ${color}`} onClick={onClick} onMouseEnter={announce} onFocus={announce}><strong>{title}</strong><span>{description}</span></button>;
}
