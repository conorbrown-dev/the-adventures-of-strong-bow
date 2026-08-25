import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { speak, stopSpeaking } from "../quiz/speech";
import { normalizeAnswer } from "../quiz/quizLogic";
import { clearStudentSession, loadStudentSession, saveStudentSession, type StudentSession } from "../game/utils/studentSession";
import { learningApplication, type AnswerResult, type HintResult, type LearningSubject, type LessonPlanActivity, type LessonPlanView, type LessonSupportLevel, type PlacementResult, type ResumableLearningSession, type SessionView } from "./learningApplication";
import { coreCourseRoadmap } from "./coreCourseRoadmaps";
import { KindergartenLessonActivity } from "./KindergartenLessonActivity";

type ProgressAttempt = { sessionId: string; primaryStandardId: string; correct: boolean; usedHint: boolean; independent: boolean; purpose: string; submittedAnswer: unknown };
type Progress = { attempts: ProgressAttempt[]; mastery: Array<{ standardId: string; state: string; nextReviewAt: string | null }>; skillProgress: Array<{ skillId: string; skillName: string; domain: string; state: string }>; latestDiagnosticPlacement: PlacementResult | null; latestAssessmentSessionId: string | null };
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

const CORRECT_ANSWER_ADVANCE_MS = 2_200;
const confettiColors = ["#e76f51", "#f4c95d", "#4ca58c", "#7563a6", "#e88dac", "#3f87c5"];
const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  color: confettiColors[index % confettiColors.length],
  delayMs: (index * 47) % 360,
  drift: ((index * 73) % 180) - 90,
  left: (index * 37) % 100,
  rotation: (index * 67) % 360
}));

function CorrectAnswerConfetti({ burstKey }: { burstKey: string }): JSX.Element {
  return <div className="learning-confetti" aria-hidden="true" key={burstKey}>{confettiPieces.map((piece, index) => <span
    className="learning-confetti-piece"
    key={`${burstKey}-${index}`}
    style={{
      left: `${piece.left}%`,
      "--confetti-color": piece.color,
      "--confetti-delay": `${piece.delayMs}ms`,
      "--confetti-drift": `${piece.drift}px`,
      "--confetti-rotation": `${piece.rotation}deg`
    } as CSSProperties}
  />)}</div>;
}

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

function placementGradeName(grade: string): string {
  if (grade === "2" || grade === "GRADE_2") return "Grade 2";
  if (grade === "1" || grade === "GRADE_1") return "Grade 1";
  return "Kindergarten";
}

function masteryLabel(state: string | undefined, attempts: ProgressAttempt[]): string {
  const hasPractice = attempts.some((attempt) => ["learning", "practice", "review"].includes(attempt.purpose));
  if (!hasPractice && attempts.some((attempt) => attempt.purpose === "diagnostic" || attempt.purpose === "placement")) return "Diagnostic checked";
  if (!hasPractice && attempts.some((attempt) => attempt.purpose === "adultScored")) return "Adult observation recorded";
  if (state === "mastered") return "Mastered";
  if (state === "reviewDue") return "Review due";
  if (state === "practicing") return "Practicing";
  if (state === "learning") return "Learning";
  return "Ready for practice";
}

function PlacementSummary({ placement, title }: { placement: PlacementResult; title: string }): JSX.Element {
  return <section className="level-panel my-5 rounded-2xl p-5" aria-live="polite">
    <p className="learning-step text-xs font-black tracking-[.16em]">{title.toUpperCase()}</p>
    <h2 className="!mb-2 !mt-1 !text-2xl">{placement.grouping}</h2>
    <p>Recommended starting level: <strong>{placementGradeName(placement.grade)}</strong></p>
    {placement.placementConfidence && <p>Placement confidence: <strong>{placement.placementConfidence.toLowerCase()}</strong>{typeof placement.totalItems === "number" ? ` · ${placement.totalItems} learning checks` : ""}</p>}
    <p>{placement.learningTargetIds.length > 0 ? `${placement.learningTargetIds.length} skill ${placement.learningTargetIds.length === 1 ? "area is" : "areas are"} ready for focused practice.` : "No priority gaps were found in this check. Regular practice will build and confirm mastery."}</p>
    {placement.learningTargetIds.length > 0 && <details className="mt-3"><summary>See skills to practice</summary><ul className="mt-2 list-disc pl-6">{placement.learningTargetIds.map((standardId) => <li key={standardId}>{standardId}</li>)}</ul></details>}
    {placement.strandPlacements && placement.strandPlacements.length > 0 && <details className="mt-3"><summary>See skill-area placement</summary><ul className="mt-2 list-disc pl-6">{placement.strandPlacements.map((strand) => <li key={strand.domain}><strong>{strand.label}:</strong> {placementGradeName(strand.instructionalGrade)} · {strand.status === "ready" ? "ready" : strand.status === "unresolved" ? "more evidence needed" : "focused practice recommended"}</li>)}</ul></details>}
  </section>;
}

function groupAttempts(attempts: ProgressAttempt[]): Array<[string, ProgressAttempt[]]> {
  return Object.entries(attempts.reduce<Record<string, ProgressAttempt[]>>((all, attempt) => {
    all[attempt.primaryStandardId] = [...(all[attempt.primaryStandardId] ?? []), attempt];
    return all;
  }, {}));
}

function SkillProgressCards({ groups, mastery, isDiagnostic = false }: { groups: Array<[string, ProgressAttempt[]]>; mastery: Progress["mastery"]; isDiagnostic?: boolean }): JSX.Element {
  return <div className="progress-grid">{groups.map(([standardId, attempts]) => { const correct = attempts.filter((attempt) => attempt.correct).length; const independent = attempts.filter((attempt) => attempt.independent && !attempt.usedHint).length; return <article key={standardId}><strong>{standardId}</strong><span>{attempts.length} {isDiagnostic ? "checked" : "practice"} {attempts.length === 1 ? "answer" : "answers"} · {Math.round(correct / attempts.length * 100)}% correct</span><span>{independent} independent · {attempts.length - independent} supported</span><b>{isDiagnostic ? "Diagnostic checked" : masteryLabel(mastery.find((item) => item.standardId === standardId)?.state, attempts)}</b></article>; })}</div>;
}

function LessonActivitySection({ title, activity }: { title: string; activity: LessonPlanActivity }): JSX.Element {
  return <section className="lesson-activity">
    <h3>{title} <span>{activity.minutes} min</span></h3>
    <ol>{activity.directions.map((direction) => <li key={direction}>{direction}</li>)}</ol>
  </section>;
}

function LessonPlanScreen({ plan, onBack }: { plan: LessonPlanView; onBack: () => void }): JSX.Element {
  const spokenOverview = `${plan.title}. ${plan.summary}. This lesson has ${plan.days.length} days. Day 1: ${plan.days[0]?.objective ?? ""}`;
  return <section className="learning-question lesson-plan">
    <button className="secondary lesson-back" onClick={onBack}>BACK TO LEARNING</button>
    <p className="eyebrow">GUIDED LESSON · {plan.grade === "K" ? "KINDERGARTEN" : `GRADE ${plan.grade}`} {plan.subject.toUpperCase()}</p>
    <div className="prompt"><h1>{plan.title}</h1><button className="speaker-button" onClick={() => void speak(spokenOverview)} aria-label="Listen to lesson overview">🔊</button></div>
    <p className="learning-card-note">{plan.summary}</p>
    <section className="lesson-materials" aria-labelledby="lesson-materials-heading">
      <h2 id="lesson-materials-heading">Get ready</h2>
      <ul>{plan.materials.map((material) => <li key={material.name}><strong>{material.name}</strong>{material.alternatives.length > 0 && <span> Try: {material.alternatives.join(", ")}.</span>}</li>)}</ul>
    </section>
    <section aria-labelledby="lesson-days-heading">
      <h2 id="lesson-days-heading">Your five-day plan</h2>
      {plan.days.map((day) => <details className="lesson-day" key={day.day} open={day.day === 1}>
        <summary><span>DAY {day.day}</span><strong>{day.title}</strong><small>{day.objective}</small></summary>
        <div className="lesson-day-content">
          <p><strong>Adult setup:</strong> {day.adultSetup.join(" ")}</p>
          <p><strong>Book or text idea:</strong> {day.textRecommendation}</p>
          <LessonActivitySection title="Warm-up" activity={day.warmUp} />
          <LessonActivitySection title="Model it together" activity={day.explicitModel} />
          <LessonActivitySection title="Practice together" activity={day.guidedPractice} />
          <LessonActivitySection title={`Independent practice · ${day.independentPractice.itemCount} questions`} activity={day.independentPractice} />
          <LessonActivitySection title="Try more" activity={day.extension} />
          <LessonActivitySection title="If it feels tricky" activity={day.reteach} />
          <section className="lesson-activity"><h3>Look for</h3><ul>{day.masteryEvidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></section>
        </div>
      </details>)}</section>
    <details className="lesson-accommodations"><summary>Accessibility and accommodations</summary><ul>{plan.accessibility.accommodationNotes.map((note) => <li key={note}>{note}</li>)}</ul></details>
    <button className="secondary lesson-back" onClick={onBack}>BACK TO LEARNING</button>
  </section>;
}

function LearningDashboard({ student, selectedSubject, setSelectedSubject, isLoading, proctorCode, setProctorCode, placementGrade, setPlacementGrade, resumableAssessment, resumeAssessment, start, updatePlacement, lessonPlan, openLesson, error }: {
  student: StudentSession["student"] | undefined;
  selectedSubject: LearningSubject;
  setSelectedSubject: (subject: LearningSubject) => void;
  isLoading: boolean;
  proctorCode: string;
  setProctorCode: (code: string) => void;
  placementGrade: LearningLevel;
  setPlacementGrade: (grade: LearningLevel) => void;
  resumableAssessment: ResumableLearningSession | null;
  resumeAssessment: () => void;
  start: (purpose: LearningPurpose) => Promise<void>;
  updatePlacement: () => Promise<void>;
  lessonPlan: LessonPlanView | null;
  openLesson: (lessonPlanId: string) => void;
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
      {resumableAssessment && <div className="level-panel mb-5 rounded-2xl p-5" role="status">
        <strong className="block text-lg">Your {resumableAssessment.mode === "practice" ? "lesson" : "learning check"} is saved</strong>
        <span className="learning-card-note mb-3 mt-1 block">Continue with activity {resumableAssessment.session.position + 1} right where you stopped.</span>
        <button className="activity-button !rounded-2xl" disabled={isLoading} onClick={resumeAssessment}>RESUME {resumableAssessment.mode === "practice" ? "LESSON" : resumableAssessment.mode === "placement" ? "PLACEMENT" : "DIAGNOSTIC"} <span aria-hidden="true">→</span></button>
      </div>}
      {!isAdultObservedOnly && <div className="grid gap-3 sm:grid-cols-2">
        <button className="activity-button !min-h-16 !rounded-2xl" disabled={isLoading} onClick={() => void start("practice")}>START PRACTICE</button>
        <button className="activity-button secondary !min-h-16 !rounded-2xl" disabled={isLoading} onClick={() => void start("diagnostic")}>{resumableAssessment ? "START NEW DIAGNOSTIC" : "START DIAGNOSTIC"}</button>
      </div>}
      {!isAdultObservedOnly && <p className="learning-card-note mt-4">The learning check starts with Kindergarten skills and adapts through Grade 2. It checks each important skill area more than once and asks a few more activities when an answer pattern is unclear. You can take a break and continue later.</p>}
    </section>

    {lessonPlan && <section aria-labelledby="guided-lesson-heading" className="learning-card guided-lesson-card mb-7 rounded-3xl p-5 sm:p-7">
      <p className="learning-step text-xs font-black tracking-[.16em]">GUIDED LESSON</p>
      <h2 id="guided-lesson-heading" className="!mb-2 !mt-1 !text-2xl">{lessonPlan.title}</h2>
      <p className="learning-card-note mb-5">{lessonPlan.summary}</p>
      <button className="secondary !rounded-2xl" onClick={() => openLesson(lessonPlan.id)}>OPEN {lessonPlan.days.length}-DAY LESSON</button>
    </section>}

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
  const hasAuthenticatedStudent = Boolean(studentSession && !studentSession.demo);
  const curriculumSubject = useState<LearningSubject>("ELA");
  const selectedSubject = curriculumSubject[0];
  const setSelectedSubject = curriculumSubject[1];
  const curriculumGrade = learningGrade(student?.curriculumLevels?.[selectedSubject] ?? student?.grade);
  const [session, setSession] = useState<SessionView | null>(null);
  const [resumableAssessment, setResumableAssessment] = useState<ResumableLearningSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [classification, setClassification] = useState<Classification>({});
  const [sequenceAnswer, setSequenceAnswer] = useState<string[]>([]);
  const [adultChecks, setAdultChecks] = useState<string[]>([]);
  const [adultEvidence, setAdultEvidence] = useState("");
  const [usedHint, setUsedHint] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const isAdvancingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [proctorCode, setProctorCode] = useState("");
  const [placementGrade, setPlacementGrade] = useState<LearningLevel>("K");
  const [progress, setProgress] = useState<Progress>({ attempts: [], mastery: [], skillProgress: [], latestDiagnosticPlacement: null, latestAssessmentSessionId: null });
  const [lessonPlans, setLessonPlans] = useState<LessonPlanView[]>([]);
  const isQuestion = location.pathname === "/learning/practice" || location.pathname === "/learning/diagnostic" || location.pathname === "/learning/placement" || location.pathname === "/learning/proctored" || location.pathname === "/learning/adult-scored";
  const activeLessonId = location.pathname.match(/^\/learning\/lessons\/([a-z0-9._-]+)$/)?.[1] ?? null;
  const activeLessonPlan = activeLessonId ? lessonPlans.find((plan) => plan.id === activeLessonId) ?? null : null;
  const selectedLessonPlan = lessonPlans.find((plan) => plan.grade === curriculumGrade && plan.subject === selectedSubject.toLowerCase()) ?? null;
  const sorting = classificationData(session);
  const sequence = sequenceData(session);
  const choices = session?.question.interaction.choices ?? [];
  const hasPhonemeChoices = isPhonemeChoiceQuestion(session, choices);
  const adultChecklist = session?.question.interaction.adultChecklist ?? [];
  const adultObservationNotes = progress.attempts.flatMap((attempt) => {
    const note = attempt.purpose === "adultScored" ? adultEvidenceNote(attempt.submittedAnswer) : null;
    return note ? [{ standardId: attempt.primaryStandardId, note }] : [];
  });
  const latestDiagnosticProgress = groupAttempts(progress.attempts.filter((attempt) => attempt.sessionId === progress.latestAssessmentSessionId));
  const practiceProgress = groupAttempts(progress.attempts.filter((attempt) => attempt.purpose !== "diagnostic" && attempt.purpose !== "placement"));
  const canSubmit = sorting
    ? sorting.items.every((item) => Boolean(classification[item]))
    : sequence
      ? sequenceAnswer.length === sequence.length
      : Boolean(selectedAnswer);

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    if (!isQuestion || !hasAuthenticatedStudent) return;
    let isActive = true;
    setIsLoadingSession(true);
    void learningApplication.restore()
      .then((restored) => { if (isActive) setSession(restored); })
      .catch((reason) => { if (isActive) setError(reason instanceof Error ? reason.message : "Unable to restore your learning session."); })
      .finally(() => { if (isActive) setIsLoadingSession(false); });
    return () => { isActive = false; };
  }, [hasAuthenticatedStudent, isQuestion]);
  useEffect(() => {
    if (location.pathname !== "/learning" || !hasAuthenticatedStudent) return;
    let isActive = true;
    void learningApplication.resumableSession().then((saved) => {
      if (!isActive) return;
      setResumableAssessment(saved);
      if (saved?.subject) setSelectedSubject(saved.subject);
    });
    return () => { isActive = false; };
  }, [hasAuthenticatedStudent, location.pathname, setSelectedSubject]);
  useEffect(() => {
    if (location.pathname === "/learning/progress" && hasAuthenticatedStudent) {
      void learningApplication.progress().then(setProgress).catch(() => setError("Progress is temporarily unavailable."));
    }
  }, [hasAuthenticatedStudent, location.pathname]);
  useEffect(() => {
    if (!hasAuthenticatedStudent) return;
    let isActive = true;
    void learningApplication.lessonPlans()
      .then((plans) => { if (isActive) setLessonPlans(plans); })
      .catch(() => { if (isActive) setError("Guided lesson plans are temporarily unavailable."); });
    return () => { isActive = false; };
  }, [hasAuthenticatedStudent]);

  const resetQuestionState = () => { isAdvancingRef.current = false; setIsAdvancing(false); setSelectedAnswer(""); setClassification({}); setSequenceAnswer([]); setAdultChecks([]); setAdultEvidence(""); setUsedHint(false); setResult(null); setIsListening(false); };
  const start = async (purpose: "practice" | "diagnostic" | "placement" | "proctored" | "adultScored") => {
    try {
      setIsLoadingSession(true);
      const next = await learningApplication.start(purpose, purpose === "proctored" || purpose === "adultScored" || purpose === "placement" ? proctorCode : undefined, curriculumGrade, selectedSubject);
      setSession(next);
      setResumableAssessment(null);
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
    if (!session || isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);
    try {
      setError(null);
      stopSpeaking();
      const next = await learningApplication.next(session.sessionId);
      if (!next) { navigate("/learning/progress"); return; }
      setSession(next);
      resetQuestionState();
    } catch (reason) {
      isAdvancingRef.current = false;
      setIsAdvancing(false);
      setError(reason instanceof Error ? reason.message : "Unable to continue your learning session.");
    }
  };
  const resumeAssessmentSession = () => {
    if (!resumableAssessment) return;
    stopSpeaking();
    setSession(resumableAssessment.session);
    setSelectedSubject(resumableAssessment.subject ?? selectedSubject);
    resetQuestionState();
    setError(null);
    navigate(`/learning/${resumableAssessment.mode}`);
  };
  const takeBreak = async () => {
    if (!session) return;
    stopSpeaking();
    try {
      await learningApplication.pause(session);
      navigate("/learning");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your progress is not saved yet. Please try again.");
    }
  };
  useEffect(() => {
    const canAutoAdvance = Boolean(!session?.activity && result && !result.complete && !result.retry && !result.placement);
    if (!canAutoAdvance) return;
    const timeoutId = window.setTimeout(() => { void advance(); }, CORRECT_ANSWER_ADVANCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [result, session?.question.id]);
  const choosePhoneme = (choice: string) => { stopSpeaking(); void submit(choice); };
  const completeLessonActivityAndAdvance = async (): Promise<void> => {
    if (!session?.activity) return;
    try {
      setIsAdvancing(true);
      const completion = await learningApplication.completeActivity(session.sessionId, session.activity.instanceId);
      if (completion.complete) { navigate("/learning/progress"); return; }
      await advance();
    } catch (reason) {
      isAdvancingRef.current = false;
      setIsAdvancing(false);
      setError(reason instanceof Error ? reason.message : "Unable to save this lesson step.");
    }
  };
  const requestLessonHint = async (level?: LessonSupportLevel): Promise<HintResult> => {
    if (!session?.activity) throw new Error("This lesson step is no longer active.");
    const hint = await learningApplication.hint(session.sessionId, session.activity.instanceId, level);
    setSession((current) => current?.activity ? { ...current, activity: { ...current.activity, highestSupport: hint.highestSupport, evidenceMode: hint.evidenceMode } } : current);
    return hint;
  };
  const openLesson = (lessonPlanId: string) => { stopSpeaking(); setError(null); navigate(`/learning/lessons/${lessonPlanId}`); };
  const returnToLearning = () => { stopSpeaking(); navigate("/learning"); };
  const scoreAdult = async (demonstrated: boolean) => {
    if (!session) return;
    try { setError(null); setResult(await learningApplication.scoreAdult(session.sessionId, demonstrated, adultEvidence)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save the adult score."); }
  };
  const updatePlacement = async () => {
    if (!studentSession || studentSession.demo) return;
    try {
      setError(null);
      const updated = await learningApplication.updateSubjectLevel(selectedSubject, placementGrade, proctorCode);
      const next = { ...studentSession, student: { ...studentSession.student, ...updated, subjects: updated.subjects as StudentSession["student"]["subjects"], curriculumLevels: updated.curriculumLevels } };
      saveStudentSession(next);
      setStudentSession(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update this subject level."); }
  };

  if (!hasAuthenticatedStudent) return <main className="learning-app"><section className="learning-shell"><section className="learning-empty-state"><p className="eyebrow">STUDENT LOGIN REQUIRED</p><h1>Sign in to start Learning</h1><p>Your answers, skill progress, and scheduled reviews need a student account so they stay with the right learner.</p><div className="actions"><button onClick={() => { stopSpeaking(); clearStudentSession(); navigate("/lessons"); }}>SIGN IN OR CREATE A STUDENT</button><button className="secondary" onClick={() => navigate("/")}>BACK TO MAIN MENU</button></div></section></section></main>;

  return <main className="learning-app"><section className="learning-shell">
    <header><button className="learning-home-button" onClick={() => navigate("/")}>MOLLY'S LEARNING</button><nav aria-label="Learning navigation"><button className="learning-nav-button" onClick={() => navigate("/learning")}>LEARNING</button><button className="learning-nav-button" onClick={() => navigate("/learning/progress")}>PROGRESS</button></nav></header>
    {location.pathname === "/learning" && <LearningDashboard student={student} selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} isLoading={isLoadingSession} proctorCode={proctorCode} setProctorCode={setProctorCode} placementGrade={placementGrade} setPlacementGrade={setPlacementGrade} resumableAssessment={resumableAssessment} resumeAssessment={resumeAssessmentSession} start={start} updatePlacement={updatePlacement} lessonPlan={selectedLessonPlan} openLesson={openLesson} error={error} />}
    {activeLessonPlan && <LessonPlanScreen plan={activeLessonPlan} onBack={returnToLearning} />}
    {activeLessonId && !activeLessonPlan && <section className="learning-empty-state"><h1>Guided lesson unavailable</h1><p className="feedback">This lesson is not available for your account right now. Return to Learning and try again.</p><button className="secondary" onClick={returnToLearning}>BACK TO LEARNING</button></section>}
    {isQuestion && isLoadingSession && !session && <p className="feedback">Loading your learning session…</p>}
    {isQuestion && !isLoadingSession && !session && <section className="learning-empty-state"><h1>Choose a learning activity</h1><p className="feedback">{error ?? "This session is no longer available. Start a new one to continue."}</p><div className="actions"><button onClick={() => void start(location.pathname.endsWith("diagnostic") ? "diagnostic" : "practice")}>START NEW SESSION</button><Link className="secondary" to="/learning">BACK TO LEARNING</Link></div></section>}
    {isQuestion && session?.activity && <>
      {result?.correct && result.celebrate && <CorrectAnswerConfetti burstKey={session.activity.instanceId} />}
      <KindergartenLessonActivity activity={session.activity} position={session.position} length={session.length} result={result} isBusy={isAdvancing} onSubmit={async (answer) => { await submit(answer); }} onCompleteAndNext={completeLessonActivityAndAdvance} onNext={async () => { await advance(); }} onHint={requestLessonHint} onTakeBreak={takeBreak} />
      {error && <p className="feedback" role="alert">{error}</p>}
    </>}
    {isQuestion && session && !session.activity && <section className="learning-question">
      {result?.correct && <CorrectAnswerConfetti burstKey={session.question.id} />}
      <p className="eyebrow">{location.pathname === "/learning/adult-scored" ? selectedSubject === "MATH" ? "HANDS-ON MATH ACTIVITY" : selectedSubject === "SCIENCE" ? "SCIENCE INVESTIGATION" : selectedSubject === "SOCIAL_STUDIES" ? "SOCIAL STUDIES INQUIRY" : selectedSubject === "HEALTH" ? "HEALTH ACTIVITY" : selectedSubject === "PHYSICAL_EDUCATION" ? "MOVEMENT ACTIVITY" : selectedSubject === "FINE_ARTS" ? "FINE ARTS ACTIVITY" : selectedSubject === "COMPUTER_SCIENCE" ? "COMPUTER SCIENCE ACTIVITY" : selectedSubject === "INFORMATION_LITERACY" ? "INFORMATION LITERACY INQUIRY" : "ADULT-SCORED ELA CHECK" : session.assessmentStage ? `${placementGradeName(session.assessmentStage.grade).toUpperCase()} LEARNING CHECK · ACTIVITY ${session.position + 1}` : `QUESTION ${session.position + 1} OF ${session.length}`}</p>
      {session.assessmentStage && !result && <button className="secondary" onClick={() => void takeBreak()}>TAKE A BREAK</button>}
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
      {result && <><p className={result.correct ? "feedback correct" : "feedback"}>{result.explanation}</p>{result.placement && <PlacementSummary placement={result.placement} title={location.pathname === "/learning/placement" ? "Placement complete" : "Diagnostic complete"} />}{!result.complete && !result.retry && !result.placement ? <button className="learning-continue-button" data-auto-advance="true" disabled={isAdvancing} onClick={() => void advance()} aria-label="Continue to the next activity"><span>CONTINUE</span><span className="continue-arrow" aria-hidden="true">→</span></button> : <button disabled={isAdvancing} onClick={() => void advance()}>{result.complete && result.placement ? "VIEW SKILLS PROGRESS" : result.complete ? "FINISH SESSION" : "TRY ANOTHER ONE"}</button>}</>}
      {error && <p className="feedback">{error}</p>}
    </section>}
    {location.pathname === "/learning/progress" && <section className="learning-progress"><p className="eyebrow">LEARNING PROGRESS</p><h1>Your skills</h1><p className="learning-card-note">Your latest diagnostic is kept separate from earlier practice so its results are clear.</p>{progress.skillProgress.length > 0 && <section aria-labelledby="foundational-skills-heading"><h2 id="foundational-skills-heading">Foundational reading path</h2><div className="progress-grid">{progress.skillProgress.map((skill) => <article key={skill.skillId}><strong>{skill.skillName}</strong><span>{skill.domain}</span><b>{skill.state.toLowerCase().split("_").join(" ")}</b></article>)}</div></section>}{progress.latestDiagnosticPlacement && <PlacementSummary placement={progress.latestDiagnosticPlacement} title="Latest diagnostic" />}{latestDiagnosticProgress.length > 0 && <section aria-labelledby="diagnostic-skills-heading"><h2 id="diagnostic-skills-heading">Latest diagnostic skills</h2><SkillProgressCards groups={latestDiagnosticProgress} mastery={progress.mastery} isDiagnostic /></section>}{practiceProgress.length > 0 && <section aria-labelledby="practice-progress-heading"><h2 id="practice-progress-heading">Ongoing practice progress</h2><SkillProgressCards groups={practiceProgress} mastery={progress.mastery} /></section>}{!progress.attempts.length && <p>Start a practice or diagnostic session to see learning activity here.</p>}{latestDiagnosticProgress.length > 0 && <p className="learning-card-note mt-5">A diagnostic records what was checked and recommends where to begin. Skills move into Learning and Mastered states through practice or a verified check.</p>}{adultObservationNotes.length > 0 && <section className="adult-observation-notes"><h2>Adult observation notes</h2><ul>{adultObservationNotes.map((observation, index) => <li key={`${observation.standardId}-${index}`}><strong>{observation.standardId}</strong><span>{observation.note}</span></li>)}</ul></section>}</section>}
  </section></main>;
}
