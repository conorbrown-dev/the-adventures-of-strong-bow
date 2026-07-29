import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { speak, stopSpeaking } from "../quiz/speech";
import { normalizeAnswer } from "../quiz/quizLogic";
import { loadStudentSession } from "../game/utils/studentSession";
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

export function LearningApp(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const learnerId = loadStudentSession()?.student.id ?? "anonymous";
  const curriculumGrade = loadStudentSession()?.student.grade === "GRADE_1" ? "1" : "K";
  const [session, setSession] = useState<SessionView | null>(null);
  const [classification, setClassification] = useState<Classification>({});
  const [sequenceAnswer, setSequenceAnswer] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [proctorCode, setProctorCode] = useState("");
  const [progress, setProgress] = useState<Progress>({ attempts: [], mastery: [], latestDiagnosticPlacement: null });
  const isQuestion = location.pathname === "/learning/practice" || location.pathname === "/learning/diagnostic" || location.pathname === "/learning/proctored";
  const sorting = classificationData(session);
  const sequence = sequenceData(session);
  const choices = session?.question.interaction.choices ?? [];
  const hasPhonemeChoices = isPhonemeChoiceQuestion(session, choices);
  const usesVoiceAnswer = Boolean(session && !sorting && !sequence);
  const canSubmit = sorting ? sorting.items.every((item) => Boolean(classification[item])) : sequence ? sequenceAnswer.length === sequence.length : false;

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

  const resetQuestionState = () => { setClassification({}); setSequenceAnswer([]); setResult(null); setIsListening(false); };
  const start = async (purpose: "practice" | "diagnostic" | "proctored") => {
    try {
      setIsLoadingSession(true);
      const next = await learningApplication.start(learnerId, purpose, purpose === "proctored" ? proctorCode : undefined, curriculumGrade);
      setSession(next);
      resetQuestionState();
      setError(null);
      navigate(`/learning/${purpose}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start learning.");
    } finally {
      setIsLoadingSession(false);
    }
  };
  const submit = async (submittedAnswer: unknown = sorting ? classification : sequence ? sequenceAnswer : undefined) => {
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
    const next = await learningApplication.next(session.sessionId);
    if (!next) { navigate("/learning/progress"); return; }
    setSession(next);
    resetQuestionState();
  };
  const choosePhoneme = (choice: string) => { stopSpeaking(); void submit(choice); };

  return <main className="learning-app"><section className="learning-shell">
    <header><Link to="/">MOLLY'S LEARNING</Link><nav><Link to="/learning">Learning</Link><Link to="/learning/progress">Progress</Link></nav></header>
    {location.pathname === "/learning" && <section><p className="eyebrow">COMMON CORE LEARNING</p><h1>What would you like to practise?</h1><div className="actions"><button disabled={isLoadingSession} onClick={() => void start("practice")}>START PRACTICE</button><button className="secondary" disabled={isLoadingSession} onClick={() => void start("diagnostic")}>START DIAGNOSTIC</button></div><section className="proctored-start" aria-label="Parent or teacher proctored assessment"><h2>Parent or teacher check-in</h2><p>Enter the adult verification code, then stay with the student for a five-question skill check.</p><label>Verification code<input value={proctorCode} onChange={(event) => setProctorCode(event.target.value)} inputMode="numeric" type="password" autoComplete="one-time-code" /></label><button className="secondary" disabled={isLoadingSession || !proctorCode} onClick={() => void start("proctored")}>START PROCTORED CHECK</button></section>{error && <p className="feedback">{error}</p>}</section>}
    {isQuestion && isLoadingSession && !session && <p className="feedback">Loading your learning session…</p>}
    {isQuestion && !isLoadingSession && !session && <section><h1>Choose a learning activity</h1><p className="feedback">{error ?? "This session is no longer available. Start a new one to continue."}</p><div className="actions"><button onClick={() => void start(location.pathname.endsWith("diagnostic") ? "diagnostic" : "practice")}>START NEW SESSION</button><Link className="secondary" to="/learning">BACK TO LEARNING</Link></div></section>}
    {isQuestion && session && <section className="learning-question"><p className="eyebrow">QUESTION {session.position + 1} OF {session.length}</p>{session.question.interaction.visual && <p className="learning-visual" aria-label={session.question.accessibility.textAlternative}>{"★".repeat(session.question.interaction.visual.count)}</p>}<div className="prompt"><h1>{session.question.prompt.text}</h1><button className="speaker-button" onClick={() => void speak(session.question.accessibility.spokenPrompt ?? session.question.prompt.text)} aria-label="Replay question">🔊</button></div>{sorting ? <section className="classification-answer" aria-label="Letter sorting activity">{sorting.items.map((item) => <div className="classification-item" key={item}><strong>{item}</strong><div>{sorting.categories.map((category) => <button className={classification[item] === category ? "selected" : "secondary"} key={category} onClick={() => setClassification((current) => ({ ...current, [item]: category }))}>{category}</button>)}</div></div>)}</section> : sequence ? <section className="sequence-answer" aria-label="Number ordering activity"><p>Tap each number in counting order.</p><div className="answer-options">{sequence.map((item) => { const position = sequenceAnswer.indexOf(item); return <button className={position >= 0 ? "selected" : "secondary"} disabled={position >= 0} key={item} onClick={() => setSequenceAnswer((current) => [...current, item])}>{position >= 0 ? `${position + 1}. ${item}` : item}</button>; })}</div>{sequenceAnswer.length > 0 && <button className="secondary" onClick={() => setSequenceAnswer((current) => current.slice(0, -1))}>UNDO LAST</button>}</section> : hasPhonemeChoices ? <section className="phoneme-choice-answer" aria-label="Sound answer choices"><p>Listen to each sound, then choose one.</p><div>{choices.map((choice, index) => <button className="phoneme-choice-button" key={choice.id} onPointerEnter={() => void speak(phonemeChoiceAudio(choice.label))} onFocus={() => void speak(phonemeChoiceAudio(choice.label))} onClick={() => choosePhoneme(choice.label)} aria-label={`Listen to sound choice ${index + 1}`}><span aria-hidden="true">🔊</span></button>)}</div><button className="secondary microphone-fallback" disabled={isListening} onClick={listenForAnswer}>{isListening ? "LISTENING…" : "🎙️ SAY IT"}</button></section> : <button className="microphone-button" disabled={isListening} onClick={listenForAnswer} aria-label={isListening ? "Listening for your answer" : "Say your answer"}>{isListening ? "LISTENING…" : "🎙️"}</button>}{!result && !usesVoiceAnswer && <button disabled={!canSubmit} onClick={() => void submit()}>CHECK ANSWER</button>}{result && <><p className={result.correct ? "feedback correct" : "feedback"}>{result.explanation}</p><button onClick={() => void advance()}>{result.complete ? "FINISH SESSION" : "CONTINUE"}</button></>}{error && <p className="feedback">{error}</p>}</section>}
    {location.pathname === "/learning/progress" && <section><p className="eyebrow">LEARNING PROGRESS</p><h1>Your skills</h1><div className="progress-grid">{Object.entries(progress.attempts.reduce<Record<string, { total: number; correct: number }>>((all, attempt) => { const row = all[attempt.primaryStandardId] ?? { total: 0, correct: 0 }; row.total += 1; row.correct += Number(attempt.correct); all[attempt.primaryStandardId] = row; return all; }, {})).map(([standardId, value]) => <article key={standardId}><strong>{standardId}</strong><span>{value.total} attempts · {Math.round(value.correct / value.total * 100)}% correct</span><b>{progress.mastery.find((item) => item.standardId === standardId)?.state ?? "Learning"}</b></article>)}{progress.latestDiagnosticPlacement && <p>Latest check-in: {progress.latestDiagnosticPlacement.grouping} · {progress.latestDiagnosticPlacement.grade}</p>}{!progress.attempts.length && <p>Start a practice session to see your learning activity here.</p>}</div></section>}
  </section></main>;
}
