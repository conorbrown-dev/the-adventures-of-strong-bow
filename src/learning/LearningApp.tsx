import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { speak, stopSpeaking } from "../quiz/speech";
import { normalizeAnswer } from "../quiz/quizLogic";
import { loadStudentSession, saveStudentSession, type StudentSession } from "../game/utils/studentSession";
import { learningApplication, type AnswerResult, type SessionView } from "./learningApplication";
import { coreCourseRoadmap } from "./coreCourseRoadmaps";

type Progress = { attempts: Array<{ primaryStandardId: string; correct: boolean; usedHint: boolean; independent: boolean; purpose: string; submittedAnswer: unknown }>; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; latestDiagnosticPlacement: { grouping: string; grade: string } | null };
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

function adultEvidenceNote(answer: unknown): string | null {
  if (typeof answer !== "object" || answer === null || !("adultEvidence" in answer)) return null;
  const evidence = (answer as { adultEvidence?: unknown }).adultEvidence;
  return typeof evidence === "string" && evidence.trim() ? evidence : null;
}

type LearningSubject = "ELA" | "MATH" | "SCIENCE" | "SOCIAL_STUDIES" | "HEALTH" | "PHYSICAL_EDUCATION" | "FINE_ARTS" | "COMPUTER_SCIENCE" | "INFORMATION_LITERACY";
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
  const isAdultObservedOnly = ["SCIENCE", "SOCIAL_STUDIES", "HEALTH", "PHYSICAL_EDUCATION", "FINE_ARTS", "COMPUTER_SCIENCE", "INFORMATION_LITERACY"].includes(selectedSubject);
  const adultActivityLabel = selectedSubject === "MATH" ? "HANDS-ON MATH ACTIVITY" : selectedSubject === "SCIENCE" ? "SCIENCE INVESTIGATION" : selectedSubject === "SOCIAL_STUDIES" ? "SOCIAL STUDIES INQUIRY" : selectedSubject === "HEALTH" ? "HEALTH ACTIVITY" : selectedSubject === "PHYSICAL_EDUCATION" ? "MOVEMENT ACTIVITY" : selectedSubject === "FINE_ARTS" ? "FINE ARTS ACTIVITY" : selectedSubject === "COMPUTER_SCIENCE" ? "COMPUTER SCIENCE ACTIVITY" : selectedSubject === "INFORMATION_LITERACY" ? "INFORMATION LITERACY INQUIRY" : "ADULT-SCORED ELA";
  const roadmap = coreCourseRoadmap(selectedSubject, learningGrade(student?.curriculumLevels?.[selectedSubject] ?? student?.grade));
  return <section className="learning-dashboard mx-auto max-w-4xl">
    <div className="learning-hero mb-8">
      <p className="learning-kicker mb-3 inline-flex rounded-full px-4 py-2 text-xs font-black tracking-[.18em]">OKLAHOMA-ALIGNED LEARNING</p>
      <h1 className="max-w-3xl !text-[clamp(2.25rem,6vw,4.5rem)]">Ready to learn something new?</h1>
      <p className="learning-intro mt-4 max-w-2xl text-lg">Choose one subject, then begin a focused activity at your current level.</p>
    </div>

    <section aria-labelledby="subject-heading" className="learning-card subject-card mb-7 rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><p className="learning-step text-xs font-black tracking-[.16em]">STEP 1</p><h2 id="subject-heading" className="!m-0 !text-2xl">Choose a subject</h2></div>
        <span className="learning-card-note hidden text-sm sm:block">You can learn at a different level in each subject.</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(["ELA", "MATH", "SCIENCE", "SOCIAL_STUDIES", "HEALTH", "PHYSICAL_EDUCATION", "FINE_ARTS", "COMPUTER_SCIENCE", "INFORMATION_LITERACY"] as const).map((subject) => {
          const isSelected = selectedSubject === subject;
          return <button className={`${isSelected ? "selected" : "secondary"} subject-choice !min-h-32 !rounded-2xl !p-6 !text-left`} key={subject} onClick={() => setSelectedSubject(subject)} aria-pressed={isSelected}>
            <span aria-hidden="true" className="subject-icon">{subject === "ELA" ? "Aa" : subject === "MATH" ? "1+2" : subject === "SCIENCE" ? "✦" : subject === "SOCIAL_STUDIES" ? "⌂" : subject === "HEALTH" ? "♥" : subject === "PHYSICAL_EDUCATION" ? "↟" : subject === "FINE_ARTS" ? "✎" : subject === "COMPUTER_SCIENCE" ? "⌘" : "⌕"}</span>
            <span><strong className="block text-xl">{subject === "ELA" ? "Reading & Language" : subject === "MATH" ? "Math" : subject === "SCIENCE" ? "Science" : subject === "SOCIAL_STUDIES" ? "Social Studies" : subject === "HEALTH" ? "Health" : subject === "PHYSICAL_EDUCATION" ? "Physical Education" : subject === "FINE_ARTS" ? "Fine Arts" : subject === "COMPUTER_SCIENCE" ? "Computer Science" : "Information Literacy"}</strong><small className="mt-1 block text-sm">{gradeName(student?.curriculumLevels?.[subject] ?? student?.grade)}</small></span>
          </button>;
        })}
      </div>
    </section>

    <section aria-labelledby="activity-heading" className="learning-card activity-card mb-7 rounded-3xl p-5 sm:p-7">
      <p className="learning-step text-xs font-black tracking-[.16em]">STEP 2</p>
      <h2 id="activity-heading" className="!mb-2 !mt-1 !text-2xl">Start your activity</h2>
      <p className="learning-card-note mb-5">{selectedSubject === "MATH" ? "Practice follows a small set of next number skills. Hands-on activities with an adult build mathematical reasoning with real objects and drawings." : selectedSubject === "SCIENCE" ? "Oklahoma science is learned through hands-on investigations with an adult." : selectedSubject === "SOCIAL_STUDIES" ? "Oklahoma social studies is learned through conversations, maps, sources, and real-life inquiry with an adult." : selectedSubject === "HEALTH" ? "Oklahoma health is learned through safe, age-appropriate conversations and everyday healthy routines with an adult." : selectedSubject === "PHYSICAL_EDUCATION" ? "Physical education is guided movement. Choose a clear, safe space and complete each activity with an adult." : selectedSubject === "FINE_ARTS" ? "Fine arts uses making, performing, noticing, and reflecting across dance, drama, media arts, music, and visual art with an adult." : selectedSubject === "COMPUTER_SCIENCE" ? "Computer science uses safe hands-on and unplugged investigations of data, algorithms, programming, networks, and computing systems with an adult." : selectedSubject === "INFORMATION_LITERACY" ? "Information literacy uses books, people, libraries, and safe supervised digital tools to ask questions, research, organize ideas, and share learning." : "Practice follows a small set of next skills. A diagnostic finds the best place to focus next."}</p>
      {!isAdultObservedOnly && <div className="grid gap-3 sm:grid-cols-2">
        <button className="activity-button !min-h-16 !rounded-2xl" disabled={isLoading} onClick={() => void start("practice")}>START PRACTICE</button>
        <button className="activity-button secondary !min-h-16 !rounded-2xl" disabled={isLoading} onClick={() => void start("diagnostic")}>START DIAGNOSTIC</button>
      </div>}
    </section>

    {roadmap && <section aria-labelledby="roadmap-heading" className="learning-card mb-7 rounded-3xl p-5 sm:p-7">
      <p className="learning-step text-xs font-black tracking-[.16em]">YOUR ROADMAP</p>
      <h2 id="roadmap-heading" className="!mb-2 !mt-1 !text-2xl">{roadmap.title}</h2>
      <p className="learning-card-note mb-5">{roadmap.introduction}</p>
      <ol className="grid gap-3 sm:grid-cols-2">{roadmap.units.map((unit, index) => <li className="level-panel rounded-2xl p-4" key={unit.title}><strong className="learning-step block text-xs">UNIT {index + 1}</strong><span className="mt-1 block text-lg font-black">{unit.title}</span><span className="mt-1 block text-sm">{unit.focus}</span></li>)}</ol>
    </section>}

    <details className="adult-tools group rounded-3xl p-5 sm:p-7">
      <summary className="cursor-pointer list-none text-xl font-black marker:hidden">
        <span className="flex items-center justify-between">Parent & teacher tools <span aria-hidden="true" className="text-2xl transition-transform group-open:rotate-45">＋</span></span>
      </summary>
      <div className="adult-tools-content mt-6 pt-6">
        <p className="learning-card-note mb-5 max-w-2xl">These tools require an adult verification code and should be completed with the student.</p>
        <label className="!my-0 !max-w-sm font-bold">Verification code<input value={proctorCode} onChange={(event) => setProctorCode(event.target.value)} inputMode="numeric" type="password" autoComplete="one-time-code" /></label>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {!isAdultObservedOnly && <button className="secondary !rounded-2xl" disabled={isLoading || !proctorCode} onClick={() => void start("placement")}>NEW-STUDENT PLACEMENT</button>}
          {!isAdultObservedOnly && <button className="secondary !rounded-2xl" disabled={isLoading || !proctorCode} onClick={() => void start("proctored")}>PROCTORED CHECK</button>}
          <button className="secondary !rounded-2xl" disabled={isLoading || !proctorCode} onClick={() => void start("adultScored")}>{adultActivityLabel}</button>
        </div>
        <div className="level-panel mt-7 rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-black">Set subject level</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="!my-0">Level for {selectedSubject === "ELA" ? "Reading & Language" : selectedSubject === "MATH" ? "Math" : selectedSubject === "SCIENCE" ? "Science" : selectedSubject === "SOCIAL_STUDIES" ? "Social Studies" : selectedSubject === "HEALTH" ? "Health" : selectedSubject === "PHYSICAL_EDUCATION" ? "Physical Education" : selectedSubject === "FINE_ARTS" ? "Fine Arts" : selectedSubject === "COMPUTER_SCIENCE" ? "Computer Science" : "Information Literacy"}<select value={placementGrade} onChange={(event) => setPlacementGrade(event.target.value as LearningLevel)}><option value="K">Kindergarten</option><option value="GRADE_1">Grade 1</option><option value="GRADE_2">Grade 2</option></select></label>
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
  const curriculumSubject = useState<LearningSubject>("ELA");
  const selectedSubject = curriculumSubject[0];
  const setSelectedSubject = curriculumSubject[1];
  const curriculumGrade = learningGrade(student?.curriculumLevels?.[selectedSubject] ?? student?.grade);
  const [session, setSession] = useState<SessionView | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [classification, setClassification] = useState<Classification>({});
  const [sequenceAnswer, setSequenceAnswer] = useState<string[]>([]);
  const [adultChecks, setAdultChecks] = useState<string[]>([]);
  const [adultEvidence, setAdultEvidence] = useState("");
  const [usedHint, setUsedHint] = useState(false);
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
  const adultChecklist = session?.question.interaction.adultChecklist ?? [];
  const adultObservationNotes = progress.attempts.flatMap((attempt) => {
    const note = attempt.purpose === "adultScored" ? adultEvidenceNote(attempt.submittedAnswer) : null;
    return note ? [{ standardId: attempt.primaryStandardId, note }] : [];
  });
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

  const resetQuestionState = () => { setSelectedAnswer(""); setClassification({}); setSequenceAnswer([]); setAdultChecks([]); setAdultEvidence(""); setUsedHint(false); setResult(null); setIsListening(false); };
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
      setResult(await learningApplication.submit(session.sessionId, submittedAnswer, usedHint));
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
    try { setError(null); setResult(await learningApplication.scoreAdult(session.sessionId, demonstrated, adultEvidence)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save the adult score."); }
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
      <p className="eyebrow">{location.pathname === "/learning/adult-scored" ? selectedSubject === "MATH" ? "HANDS-ON MATH ACTIVITY" : selectedSubject === "SCIENCE" ? "SCIENCE INVESTIGATION" : selectedSubject === "SOCIAL_STUDIES" ? "SOCIAL STUDIES INQUIRY" : selectedSubject === "HEALTH" ? "HEALTH ACTIVITY" : selectedSubject === "PHYSICAL_EDUCATION" ? "MOVEMENT ACTIVITY" : selectedSubject === "FINE_ARTS" ? "FINE ARTS ACTIVITY" : selectedSubject === "COMPUTER_SCIENCE" ? "COMPUTER SCIENCE ACTIVITY" : selectedSubject === "INFORMATION_LITERACY" ? "INFORMATION LITERACY INQUIRY" : "ADULT-SCORED ELA CHECK" : `QUESTION ${session.position + 1} OF ${session.length}`}</p>
      {session.question.interaction.visual && <div className="learning-visual" role="img" aria-label={`${session.question.interaction.visual.count} stars`}>
        {session.question.interaction.visual.count > 0 ? "★".repeat(session.question.interaction.visual.count) : <span className="empty-visual">No stars</span>}
      </div>}
      <div className="prompt"><h1>{session.question.prompt.text}</h1><button className="speaker-button" onClick={() => void speak(session.question.accessibility.spokenPrompt ?? session.question.prompt.text)} aria-label="Replay question">🔊</button></div>
      {session.question.prompt.instructions && <p className="question-instructions">{session.question.prompt.instructions}</p>}
      {session.question.interaction.learningTip && !result && location.pathname !== "/learning/adult-scored" && <details className="learning-tip" onToggle={(event) => { if (event.currentTarget.open) setUsedHint(true); }}><summary>Need a hint?</summary><p>{session.question.interaction.learningTip}</p></details>}
      {location.pathname === "/learning/adult-scored" && !result ? <section className="adult-score">
        <p>Adult: observe the student complete this activity, then record the result.</p>
        {adultChecklist.length > 0 && <fieldset className="adult-checklist"><legend>Before recording a result, check each item.</legend>{adultChecklist.map((item, index) => <label className="check" key={item}><input type="checkbox" checked={adultChecks.includes(String(index))} onChange={() => setAdultChecks((current) => current.includes(String(index)) ? current.filter((value) => value !== String(index)) : [...current, String(index)])} /> {item}</label>)}</fieldset>}
        <label className="adult-evidence-label">Observation note <span>(optional)</span><textarea value={adultEvidence} onChange={(event) => setAdultEvidence(event.target.value)} maxLength={1000} placeholder="What did the student show, say, make, read, or write?" /></label>
        <div className="actions"><button disabled={adultChecklist.length > 0 && adultChecks.length !== adultChecklist.length} onClick={() => void scoreAdult(true)}>SKILL DEMONSTRATED</button><button className="secondary" onClick={() => void scoreAdult(false)}>KEEP PRACTICING</button></div>
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
    {location.pathname === "/learning/progress" && <section className="learning-progress"><p className="eyebrow">LEARNING PROGRESS</p><h1>Your skills</h1><p className="learning-card-note">Independent answers and supported work are listed separately so you and your adult can decide what to practice next.</p><div className="progress-grid">{Object.entries(progress.attempts.reduce<Record<string, { total: number; correct: number; independent: number; supported: number }>>((all, attempt) => { const row = all[attempt.primaryStandardId] ?? { total: 0, correct: 0, independent: 0, supported: 0 }; row.total += 1; row.correct += Number(attempt.correct); if (attempt.independent && !attempt.usedHint) row.independent += 1; else row.supported += 1; all[attempt.primaryStandardId] = row; return all; }, {})).map(([standardId, value]) => <article key={standardId}><strong>{standardId}</strong><span>{value.total} attempts · {Math.round(value.correct / value.total * 100)}% correct</span><span>{value.independent} independent · {value.supported} supported</span><b>{progress.mastery.find((item) => item.standardId === standardId)?.state ?? "Learning"}</b></article>)}{progress.latestDiagnosticPlacement && <p>Latest check-in: {progress.latestDiagnosticPlacement.grouping} · {progress.latestDiagnosticPlacement.grade}</p>}{!progress.attempts.length && <p>Start a practice session to see your learning activity here.</p>}</div>{adultObservationNotes.length > 0 && <section className="adult-observation-notes"><h2>Adult observation notes</h2><ul>{adultObservationNotes.map((observation, index) => <li key={`${observation.standardId}-${index}`}><strong>{observation.standardId}</strong><span>{observation.note}</span></li>)}</ul></section>}</section>}
  </section></main>;
}
