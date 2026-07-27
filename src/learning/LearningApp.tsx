import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { speak, stopSpeaking } from "../quiz/speech";
import { loadStudentSession } from "../game/utils/studentSession";
import { learningApplication, type AnswerResult, type SessionView } from "./learningApplication";

type Progress = { attempts: Array<{ primaryStandardId: string; correct: boolean }>; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; latestDiagnosticPlacement: { grouping: string; grade: string } | null };
type Classification = Record<string, string>;

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

export function LearningApp(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const learnerId = loadStudentSession()?.student.id ?? "anonymous";
  const [session, setSession] = useState<SessionView | null>(null);
  const [answer, setAnswer] = useState("");
  const [classification, setClassification] = useState<Classification>({});
  const [sequenceAnswer, setSequenceAnswer] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [progress, setProgress] = useState<Progress>({ attempts: [], mastery: [], latestDiagnosticPlacement: null });
  const isQuestion = location.pathname === "/learning/practice" || location.pathname === "/learning/diagnostic";
  const sorting = classificationData(session);
  const sequence = sequenceData(session);
  const choices = session?.question.interaction.choices ?? [];
  const canSubmit = sorting ? sorting.items.every((item) => Boolean(classification[item])) : sequence ? sequenceAnswer.length === sequence.length : Boolean(answer);

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

  const resetQuestionState = () => { setAnswer(""); setClassification({}); setSequenceAnswer([]); setResult(null); };
  const start = async (purpose: "practice" | "diagnostic") => {
    try {
      setIsLoadingSession(true);
      const next = await learningApplication.start(learnerId, purpose);
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
  const submit = async () => {
    if (!session) return;
    try {
      setResult(await learningApplication.submit(session.sessionId, sorting ? classification : sequence ? sequenceAnswer : answer));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save your answer.");
    }
  };
  const advance = async () => {
    if (!session) return;
    const next = await learningApplication.next(session.sessionId);
    if (!next) { navigate("/learning/progress"); return; }
    setSession(next);
    resetQuestionState();
  };

  return <main className="learning-app"><section className="learning-shell">
    <header><Link to="/">MOLLY'S LEARNING</Link><nav><Link to="/learning">Learning</Link><Link to="/learning/progress">Progress</Link></nav></header>
    {location.pathname === "/learning" && <section><p className="eyebrow">COMMON CORE LEARNING</p><h1>What would you like to practise?</h1><div className="actions"><button disabled={isLoadingSession} onClick={() => void start("practice")}>START PRACTICE</button><button className="secondary" disabled={isLoadingSession} onClick={() => void start("diagnostic")}>START DIAGNOSTIC</button></div>{error && <p className="feedback">{error}</p>}</section>}
    {isQuestion && isLoadingSession && !session && <p className="feedback">Loading your learning session…</p>}
    {isQuestion && !isLoadingSession && !session && <section><h1>Choose a learning activity</h1><p className="feedback">{error ?? "This session is no longer available. Start a new one to continue."}</p><div className="actions"><button onClick={() => void start(location.pathname.endsWith("diagnostic") ? "diagnostic" : "practice")}>START NEW SESSION</button><Link className="secondary" to="/learning">BACK TO LEARNING</Link></div></section>}
    {isQuestion && session && <section className="learning-question"><p className="eyebrow">QUESTION {session.position + 1} OF {session.length}</p>{session.question.interaction.visual && <p className="learning-visual" aria-label={session.question.accessibility.textAlternative}>{"★".repeat(session.question.interaction.visual.count)}</p>}<div className="prompt"><h1>{session.question.prompt.text}</h1><button className="speaker-button" onClick={() => void speak(session.question.accessibility.spokenPrompt ?? session.question.prompt.text)} aria-label="Replay question">🔊</button></div>{sorting ? <section className="classification-answer" aria-label="Letter sorting activity">{sorting.items.map((item) => <div className="classification-item" key={item}><strong>{item}</strong><div>{sorting.categories.map((category) => <button className={classification[item] === category ? "selected" : "secondary"} key={category} onClick={() => setClassification((current) => ({ ...current, [item]: category }))}>{category}</button>)}</div></div>)}</section> : sequence ? <section className="sequence-answer" aria-label="Number ordering activity"><p>Tap each number in counting order.</p><div className="answer-options">{sequence.map((item) => { const position = sequenceAnswer.indexOf(item); return <button className={position >= 0 ? "selected" : "secondary"} disabled={position >= 0} key={item} onClick={() => setSequenceAnswer((current) => [...current, item])}>{position >= 0 ? `${position + 1}. ${item}` : item}</button>; })}</div>{sequenceAnswer.length > 0 && <button className="secondary" onClick={() => setSequenceAnswer((current) => current.slice(0, -1))}>UNDO LAST</button>}</section> : <div className="answer-options">{choices.map((choice) => <button className={answer === choice.label ? "selected" : "secondary"} onClick={() => setAnswer(choice.label)} key={choice.id}>{choice.label}</button>)}</div>}{!result ? <button disabled={!canSubmit} onClick={() => void submit()}>CHECK ANSWER</button> : <><p className={result.correct ? "feedback correct" : "feedback"}>{result.explanation}</p><button onClick={() => void advance()}>{result.complete ? "FINISH SESSION" : "CONTINUE"}</button></>}{error && <p className="feedback">{error}</p>}</section>}
    {location.pathname === "/learning/progress" && <section><p className="eyebrow">LEARNING PROGRESS</p><h1>Your skills</h1><div className="progress-grid">{Object.entries(progress.attempts.reduce<Record<string, { total: number; correct: number }>>((all, attempt) => { const row = all[attempt.primaryStandardId] ?? { total: 0, correct: 0 }; row.total += 1; row.correct += Number(attempt.correct); all[attempt.primaryStandardId] = row; return all; }, {})).map(([standardId, value]) => <article key={standardId}><strong>{standardId}</strong><span>{value.total} attempts · {Math.round(value.correct / value.total * 100)}% correct</span><b>{progress.mastery.find((item) => item.standardId === standardId)?.state ?? "Learning"}</b></article>)}{progress.latestDiagnosticPlacement && <p>Latest check-in: {progress.latestDiagnosticPlacement.grouping} · {progress.latestDiagnosticPlacement.grade}</p>}{!progress.attempts.length && <p>Start a practice session to see your learning activity here.</p>}</div></section>}
  </section></main>;
}
