import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { speak, stopSpeaking } from "../quiz/speech";
import { normalizeAnswer } from "../quiz/quizLogic";
import { loadStudentSession, saveStudentSession, type StudentSession } from "../game/utils/studentSession";
import { learningApplication, type AnswerResult, type SessionView } from "./learningApplication";

type Progress = { attempts: Array<{ primaryStandardId: string; correct: boolean }>; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; latestDiagnosticPlacement: { grouping: string; grade: string } | null };
type Classification = Record<string, string>;
type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;

function answerFromTranscript(transcript: string, choices: Array<{ label: string }>): string {
  const normalizedTranscript = normalizeAnswer(transcript);
  return choices.find((choice) => normalizeAnswer(choice.label) === normalizedTranscript)?.label ?? transcript;
}

function classificationData(session: SessionView | null): { items: string[]; categories: string[] } | null {
  if (session?.question.responseType !== "classification") return null;
  const { items, categories } = session.question.interaction;
  return Array.isArray(items) && Array.isArray(categories) ? { items, categories } : null;
}

function sequenceData(session: SessionView | null): string[] | null {
  if (session?.question.responseType !== "sequence") return null;
  const { items } = session.question.interaction;
  return Array.isArray(items) ? items : null;
}

const phonemeAudio: Record<string, string> = {
  a: "ah", b: "buh", c: "kuh", d: "duh", e: "eh", f: "fff", g: "guh", h: "huh", i: "ih", j: "juh", k: "kuh", l: "lll", m: "mmm", n: "nnn", o: "oh", p: "puh", q: "kwuh", r: "rrr", s: "sss", t: "tuh", u: "uh", v: "vvv", w: "wuh", x: "ks", y: "yuh", z: "zzz", sh: "shh", ch: "ch", th: "th"
};

function phonemeChoiceAudio(label: string): string {
  return label.split(",").map((sound) => phonemeAudio[sound.trim().toLowerCase()] ?? sound.trim()).join(", ");
}

function isPhonemeChoiceQuestion(session: SessionView | null, choices: Array<{ id: string; label: string }>): boolean {
  return Boolean(session && choices.length > 1 && /\b(sound|phoneme)\b/i.test(session.question.prompt.text) && choices.every((choice) => choice.label.split(",").every((sound) => sound.trim().length <= 2)));
}

type LearningSubject = "ELA" | "MATH";
type LearningPurpose = "practice" | "diagnostic" | "placement" | "proctored" | "adultScored";
type LearningLevel = "K" | "GRADE_1" | "GRADE_2";

function gradeName(grade: string | undefined): string {
  if (grade === "GRADE_2") return "Grade 2";
  return grade === "GRADE_1" ? "Grade 1" : "Kindergarten";
}

function learningGrade(grade: string | undefined): "K" | "1" | "2" {
  if (grade === "GRADE_2") return "2";
  return grade === "GRADE_1" ? "1" : "K";
}

function LearningDashboard({ student, selectedSubject, setSelectedSubject, isLoading, proctorCode, setProctorCode, placementGrade, setPlacementGrade, start, updatePlacement, error }: {
  student: StudentSession["student"] | undefined;
  selectedSubject: LearningSubject;
  setSelectedSubject: (subject: LearningSubject) => void;
  isLoading: boolean;
  proctorCode: string;
  setProctorCode: (code: string) => void;
  placementGrade: LearningLevel;
  setPlacementGrade: (grade: LearningLevel) => void;
  start: (purpose: LearningPurpose) => Promise<void>;
  updatePlacement: () => Promise<void>;
  error: string | null;
}): JSX.Element {
  return <section className="learning-dashboard mx-auto max-w-4xl">
    <div className="learning-hero mb-8">
      <p className="learning-kicker mb-3 inline-flex rounded-full px-4 py-2 text-xs font-black tracking-[.18em]">COMMON CORE LEARNING</p>
      <h1 className="max-w-3xl !text-[clamp(2.25rem,6vw,4.5rem)]">Ready to learn something new?</h1>
      <p className="learning-intro mt-4 max-w-2xl text-lg">Choose one subject, then begin a focused activity at your current level.</p>
    </div>

    <section aria-labelledby="subject-heading" className="learning-card subject-card mb-7 rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><p className="learning-step text-xs font-black tracking-[.16em]">STEP 1</p><h2 id="subject-heading" className="!m-0 !text-2xl">Choose a subject</h2></div>
        <span className="learning-card-note hidden text-sm sm:block">You can learn at a different level in each subject.</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["ELA", "MATH"] as const).map((subject) => {
          const isSelected = selectedSubject === subject;
          return <button className={`${isSelected ? "selected" : "secondary"} subject-choice !min-h-32 !rounded-2xl !p-6 !text-left`} key={subject} onClick={() => setSelectedSubject(subject)} aria-pressed={isSelected}>
            <span aria-hidden="true" className="subject-icon">{subject === "ELA" ? "Aa" : "1+2"}</span>
            <span><strong className="block text-xl">{subject === "ELA" ? "Reading & Language" : "Math"}</strong><small className="mt-1 block text-sm">{gradeName(student?.curriculumLevels?.[subject] ?? student?.grade)}</small></span>
          </button>;
        })}
      </div>
    </section>

    <section aria-labelledby="activity-heading" className="learning-card activity-card mb-7 rounded-3xl p-5 sm:p-7">
      <p className="learning-step text-xs font-black tracking-[.16em]">STEP 2</p>
      <h2 id="activity-heading" className="!mb-2 !mt-1 !text-2xl">Start your activity</h2>
      <p className="learning-card-note mb-5">Practice builds skills. A diagnostic finds the best place to focus next.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="activity-button !min-h-16 !rounded-2xl" disabled={isLoading} onClick={() => void start("practice")}>START PRACTICE</button>
        <button className="activity-button secondary !min-h-16 !rounded-2xl" disabled={isLoading} onClick={() => void start("diagnostic")}>START DIAGNOSTIC</button>
      </div>
    </section>

    <details className="adult-tools group rounded-3xl p-5 sm:p-7">
      <summary className="cursor-pointer list-none text-xl font-black marker:hidden">
        <span className="flex items-center justify-between">Parent & teacher tools <span aria-hidden="true" className="text-2xl transition-transform group-open:rotate-45">＋</span></span>
      </summary>
      <div className="adult-tools-content mt-6 pt-6">
        <p className="learning-card-note mb-5 max-w-2xl">These tools require an adult verification code and should be completed with the student.</p>
        <label className="!my-0 !max-w-sm font-bold">Verification code<input value={proctorCode} onChange={(event) => setProctorCode(event.target.value)} inputMode="numeric" type="password" autoComplete="one-time-code" /></label>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <button className="secondary !rounded-2xl" disabled={isLoading || !proctorCode} onClick={() => void start("placement")}>NEW-STUDENT PLACEMENT</button>
          <button className="secondary !rounded-2xl" disabled={isLoading || !proctorCode} onClick={() => void start("proctored")}>PROCTORED CHECK</button>
          {selectedSubject === "ELA" && <button className="secondary !rounded-2xl" disabled={isLoading || !proctorCode} onClick={() => void start("adultScored")}>ADULT-SCORED ELA</button>}
        </div>
        <div className="level-panel mt-7 rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-black">Set subject level</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="!my-0">Level for {selectedSubject === "ELA" ? "Reading & Language" : "Math"}<select value={placementGrade} onChange={(event) => setPlacementGrade(event.target.value as LearningLevel)}><option value="K">Kindergarten</option><option value="GRADE_1">Grade 1</option><option value="GRADE_2">Grade 2</option></select></label>
            <button className="secondary" disabled={!proctorCode} onClick={() => void updatePlacement()}>SAVE LEVEL</button>
          </div>
        </div>
      </div>
    </details>
    {error && <p className="feedback mt-5" role="alert">{error}</p>}
  </section>;
}

export function LearningApp(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [studentSession, setStudentSession] = useState<StudentSession | null>(() => loadStudentSession());
  const student = studentSession?.student;
  const learnerId = student?.id ?? "anonymous";
  const curriculumSubject = useState<"ELA" | "MATH">("ELA");
  const selectedSubject = curriculumSubject[0];
  const setSelectedSubject = curriculumSubject[1];
  const curriculumGrade = learningGrade(student?.curriculumLevels?.[selectedSubject] ?? student?.grade);
  const [session, setSession] = useState<SessionView | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [classification, setClassification] = useState<Classification>({});
  const [sequenceAnswer, setSequenceAnswer] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [proctorCode, setProctorCode] = useState("");
  const [placementGrade, setPlacementGrade] = useState<LearningLevel>("K");
  const [progress, setProgress] = useState<Progress>({ attempts: [], mastery: [], latestDiagnosticPlacement: null });
  const isQuestion = location.pathname === "/learning/practice" || location.pathname === "/learning/diagnostic" || location.pathname === "/learning/placement" || location.pathname === "/learning/proctored" || location.pathname === "/learning/adult-scored";
  const sorting = classificationData(session);
  const sequence = sequenceData(session);
  const choices = session?.question.interaction.choices ?? [];
  const hasPhonemeChoices = isPhonemeChoiceQuestion(session, choices);
  const canSubmit = sorting
    ? sorting.items.every((item) => Boolean(classification[item]))
    : sequence
      ? sequenceAnswer.length === sequence.length
      : Boolean(selectedAnswer);

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    if (!isQuestion) return;
    let isActive = true;
    setIsLoadingSession(true);
    void learningApplication.restore()
      .then((restored) => { if (isActive) setSession(restored); })
      .catch((reason) => { if (isActive) setError(reason instanceof Error ? reason.message : "Unable to restore your learning session."); })
      .finally(() => { if (isActive) setIsLoadingSession(false); });
    return () => { isActive = false; };
  }, [isQuestion]);
  useEffect(() => {
    if (location.pathname === "/learning/progress") {
      void learningApplication.progress(learnerId).then(setProgress).catch(() => setError("Progress is temporarily unavailable."));
    }
  }, [learnerId, location.pathname]);

  const resetQuestionState = () => { setSelectedAnswer(""); setClassification({}); setSequenceAnswer([]); setResult(null); setIsListening(false); };
  const start = async (purpose: "practice" | "diagnostic" | "placement" | "proctored" | "adultScored") => {
    try {
      setIsLoadingSession(true);
      const next = await learningApplication.start(learnerId, purpose, purpose === "proctored" || purpose === "adultScored" || purpose === "placement" ? proctorCode : undefined, curriculumGrade, selectedSubject);
      setSession(next);
      resetQuestionState();
      setError(null);
      navigate(purpose === "adultScored" ? "/learning/adult-scored" : `/learning/${purpose}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start learning.");
    } finally {
      setIsLoadingSession(false);
    }
  };
  const submit = async (submittedAnswer: unknown = sorting ? classification : sequence ? sequenceAnswer : selectedAnswer) => {
    if (!session) return;
    try {
      setError(null);
      setResult(await learningApplication.submit(session.sessionId, submittedAnswer));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save your answer.");
    }
  };
  const listenForAnswer = () => {
    const recognitionWindow = window as typeof window & { SpeechRecognition?: BrowserRecognitionConstructor; webkitSpeechRecognition?: BrowserRecognitionConstructor };
    const SpeechRecognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice answers are not available in this browser."); return; }
    stopSpeaking();
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setIsListening(false);
      if (transcript) void submit(answerFromTranscript(transcript, choices));
    };
    recognition.onerror = () => { setIsListening(false); setError("I could not hear that. Please try the microphone again."); };
    recognition.onend = () => setIsListening(false);
    setError(null);
    setIsListening(true);
    recognition.start();
  };
  const advance = async () => {
    if (!session) return;
    try {
      setError(null);
      stopSpeaking();
      const next = await learningApplication.next(session.sessionId);
      if (!next) { navigate("/learning/progress"); return; }
      setSession(next);
      resetQuestionState();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue your learning session.");
    }
  };
  const choosePhoneme = (choice: string) => { stopSpeaking(); void submit(choice); };
  const scoreAdult = async (demonstrated: boolean) => {
    if (!session) return;
    try { setError(null); setResult(await learningApplication.scoreAdult(session.sessionId, demonstrated)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save the adult score."); }
  };
  const updatePlacement = async () => {
    if (!studentSession) return;
    try {
      setError(null);
      const updated = await learningApplication.updateSubjectLevel(studentSession.student.id, selectedSubject, placementGrade, proctorCode);
      const next = { ...studentSession, student: { ...studentSession.student, ...updated, subjects: updated.subjects as StudentSession["student"]["subjects"], curriculumLevels: updated.curriculumLevels } };
      saveStudentSession(next);
      setStudentSession(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update this subject level."); }
  };

  return <main className="learning-app"><section className="learning-shell">
    <header><button className="learning-home-button" onClick={() => navigate("/")}>MOLLY'S LEARNING</button><nav aria-label="Learning navigation"><button className="learning-nav-button" onClick={() => navigate("/learning")}>LEARNING</button><button className="learning-nav-button" onClick={() => navigate("/learning/progress")}>PROGRESS</button></nav></header>
    {location.pathname === "/learning" && <LearningDashboard student={student} selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} isLoading={isLoadingSession} proctorCode={proctorCode} setProctorCode={setProctorCode} placementGrade={placementGrade} setPlacementGrade={setPlacementGrade} start={start} updatePlacement={updatePlacement} error={error} />}
    {isQuestion && isLoadingSession && !session && <p className="feedback">Loading your learning session…</p>}
    {isQuestion && !isLoadingSession && !session && <section className="learning-empty-state"><h1>Choose a learning activity</h1><p className="feedback">{error ?? "This session is no longer available. Start a new one to continue."}</p><div className="actions"><button onClick={() => void start(location.pathname.endsWith("diagnostic") ? "diagnostic" : "practice")}>START NEW SESSION</button><Link className="secondary" to="/learning">BACK TO LEARNING</Link></div></section>}
    {isQuestion && session && <section className="learning-question">
      <p className="eyebrow">{location.pathname === "/learning/adult-scored" ? "ADULT-SCORED ELA CHECK" : `QUESTION ${session.position + 1} OF ${session.length}`}</p>
      {session.question.interaction.visual && <div className="learning-visual" role="img" aria-label={`${session.question.interaction.visual.count} stars`}>
        {session.question.interaction.visual.count > 0 ? "★".repeat(session.question.interaction.visual.count) : <span className="empty-visual">No stars</span>}
      </div>}
      <div className="prompt"><h1>{session.question.prompt.text}</h1><button className="speaker-button" onClick={() => void speak(session.question.accessibility.spokenPrompt ?? session.question.prompt.text)} aria-label="Replay question">🔊</button></div>
      {session.question.prompt.instructions && <p className="question-instructions">{session.question.prompt.instructions}</p>}
      {location.pathname === "/learning/adult-scored" && !result ? <section className="adult-score">
        <p>Adult: observe the student complete this activity, then record the result.</p>
        <div className="actions"><button onClick={() => void scoreAdult(true)}>SKILL DEMONSTRATED</button><button className="secondary" onClick={() => void scoreAdult(false)}>KEEP PRACTICING</button></div>
      </section> : sorting ? <section className="classification-answer" aria-label="Letter sorting activity">
        {sorting.items.map((item) => <div className="classification-item" key={item}><strong>{item}</strong><div>{sorting.categories.map((category) => <button aria-pressed={classification[item] === category} className={classification[item] === category ? "selected" : "secondary"} disabled={Boolean(result)} key={category} onClick={() => setClassification((current) => ({ ...current, [item]: category }))}>{category}</button>)}</div></div>)}
      </section> : sequence ? <section className="sequence-answer" aria-label="Number ordering activity">
        <div className="answer-options">{sequence.map((item) => { const position = sequenceAnswer.indexOf(item); return <button className={position >= 0 ? "selected" : "secondary"} disabled={Boolean(result) || position >= 0} key={item} onClick={() => setSequenceAnswer((current) => [...current, item])}>{position >= 0 ? `${position + 1}. ${item}` : item}</button>; })}</div>
        {sequenceAnswer.length > 0 && !result && <button className="secondary" onClick={() => setSequenceAnswer((current) => current.slice(0, -1))}>UNDO LAST</button>}
      </section> : hasPhonemeChoices ? <section className="phoneme-choice-answer" aria-label="Sound answer choices">
        <p>Listen to each sound, then choose one.</p>
        <div>{choices.map((choice) => <button className="phoneme-choice-button" disabled={Boolean(result)} key={choice.id} onPointerEnter={() => void speak(phonemeChoiceAudio(choice.label))} onFocus={() => void speak(phonemeChoiceAudio(choice.label))} onClick={() => choosePhoneme(choice.label)} aria-label={`Choose ${choice.label}`}><span aria-hidden="true">🔊</span><strong aria-hidden="true">{choice.label}</strong></button>)}</div>
        {!result && <button className="secondary microphone-fallback" disabled={isListening} onClick={listenForAnswer}>{isListening ? "LISTENING…" : "🎙️ SAY IT"}</button>}
      </section> : <section className="choice-answer" aria-label="Answer choices">
        <div className="answer-options">{choices.map((choice) => <button aria-pressed={selectedAnswer === choice.label} className={selectedAnswer === choice.label ? "selected" : "secondary"} disabled={Boolean(result)} onClick={() => setSelectedAnswer(choice.label)} key={choice.id}>{choice.label}</button>)}</div>
        {!result && <button className="secondary microphone-fallback" disabled={isListening} onClick={listenForAnswer}>{isListening ? "LISTENING…" : "🎙️ SAY ANSWER"}</button>}
      </section>}
      {!result && !hasPhonemeChoices && location.pathname !== "/learning/adult-scored" && <button disabled={!canSubmit} onClick={() => void submit()}>CHECK ANSWER</button>}
      {result && <><p className={result.correct ? "feedback correct" : "feedback"}>{result.explanation}</p><button onClick={() => void advance()}>{result.complete ? "FINISH SESSION" : "CONTINUE"}</button></>}
      {error && <p className="feedback">{error}</p>}
    </section>}
    {location.pathname === "/learning/progress" && <section className="learning-progress"><p className="eyebrow">LEARNING PROGRESS</p><h1>Your skills</h1><div className="progress-grid">{Object.entries(progress.attempts.reduce<Record<string, { total: number; correct: number }>>((all, attempt) => { const row = all[attempt.primaryStandardId] ?? { total: 0, correct: 0 }; row.total += 1; row.correct += Number(attempt.correct); all[attempt.primaryStandardId] = row; return all; }, {})).map(([standardId, value]) => <article key={standardId}><strong>{standardId}</strong><span>{value.total} attempts · {Math.round(value.correct / value.total * 100)}% correct</span><b>{progress.mastery.find((item) => item.standardId === standardId)?.state ?? "Learning"}</b></article>)}{progress.latestDiagnosticPlacement && <p>Latest check-in: {progress.latestDiagnosticPlacement.grouping} · {progress.latestDiagnosticPlacement.grade}</p>}{!progress.attempts.length && <p>Start a practice session to see your learning activity here.</p>}</div></section>}
  </section></main>;
}
