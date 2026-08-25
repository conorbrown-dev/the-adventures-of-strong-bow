import { useEffect, useRef, useState } from "react";
import { isReviewedCurriculumCueAvailable, playReviewedCurriculumCue, speak, stopSpeaking } from "../quiz/speech";
import type { AnswerResult, HintResult, LessonActivityView, LessonChoiceView, LessonPresentationView, LessonSupportLevel } from "./learningApplication";

const CONTINUE_FILL_MS = 1_200;

function purposeLabel(purpose: LessonActivityView["purpose"]): string {
  const labels: Record<LessonActivityView["purpose"], string> = {
    INSTRUCTION: "LEARN",
    MODELED_EXAMPLE: "WATCH ONE",
    GUIDED_PRACTICE: "TRY TOGETHER",
    INDEPENDENT_PRACTICE: "TRY BY YOURSELF",
    MASTERY_CHECK: "CHECK WHAT YOU KNOW",
    REVIEW: "REVIEW",
  };
  return labels[purpose];
}

function tutorIcon(state: LessonActivityView["tutor"]["state"]): string {
  if (state === "CELEBRATING") return "★";
  if (state === "POINTING") return "☝";
  if (state === "GENTLE_CORRECTION") return "↻";
  if (state === "ENCOURAGING") return "♥";
  return "Aa";
}

function cueLabel(cueId: string): string {
  const parts = cueId.split(".");
  const sound = parts[1] === "a" ? "short a" : parts[1] ?? "sound";
  return `${sound} sound`;
}

function TutorPanel({ activity, result }: { activity: LessonActivityView; result: AnswerResult | null }): JSX.Element {
  const state = result?.tutorState ?? activity.tutor.state;
  const message = result?.tutorMessage ?? activity.tutor.message;
  return <aside className={`tutor-panel tutor-${state.toLowerCase().split("_").join("-")}`} aria-label="Learning guide">
    <span className="tutor-badge" aria-hidden="true">{tutorIcon(state)}</span>
    <div><strong>{activity.primarySkill.name}</strong><p>{message}</p></div>
  </aside>;
}

function SoundCueStrip({ cueIds }: { cueIds: readonly string[] }): JSX.Element | null {
  if (cueIds.length === 0) return null;
  return <section className="sound-cue-review" aria-label="Sound cards">
    <div className="sound-cue-list">{cueIds.map((cueId) => {
      const isAvailable = isReviewedCurriculumCueAvailable(cueId);
      return <button className="sound-cue-chip secondary" type="button" disabled={!isAvailable} onClick={() => { if (isAvailable) void playReviewedCurriculumCue(cueId); }} key={cueId} aria-label={isAvailable ? `Hear ${cueLabel(cueId)}` : `${cueLabel(cueId)} recording pending review`}>{cueLabel(cueId)}</button>;
    })}</div>
    <p>Isolated sound buttons stay unavailable until each recording passes qualified curriculum review. The app will not guess these sounds with a computer voice.</p>
  </section>;
}

function ChoiceBoard({ choices, selected, disabled, onSelect }: { choices: readonly LessonChoiceView[]; selected: string; disabled: boolean; onSelect: (choiceId: string) => void }): JSX.Element {
  return <fieldset className="lesson-choice-board" disabled={disabled}>
    <legend>Choose one answer.</legend>
    <div>{choices.map((choice) => <div className={`lesson-choice ${selected === choice.id ? "is-selected" : ""}`} key={choice.id}>
      <button type="button" className={selected === choice.id ? "selected" : "secondary"} aria-pressed={selected === choice.id} onClick={() => onSelect(choice.id)}>
        {choice.visual && <span className="lesson-choice-visual" aria-hidden="true">{choice.visual}</span>}
        <span className={choice.visual ? "lesson-choice-label" : undefined}>{choice.label}</span>
      </button>
      {choice.audioText && <button type="button" className="choice-speaker" onClick={() => { stopSpeaking(); void speak(choice.audioText!); }} aria-label={`Hear ${choice.label}`}>🔊</button>}
    </div>)}</div>
  </fieldset>;
}

function CardWorkspace({ cards, answer, disabled, onChange, wordAudioText }: { cards: readonly string[]; answer: readonly string[]; disabled: boolean; onChange: (answer: string[]) => void; wordAudioText?: string }): JSX.Element {
  return <section className="lesson-card-workspace" aria-label="Build the word">
    {wordAudioText && <button className="secondary word-audio-button" type="button" onClick={() => { stopSpeaking(); void speak(wordAudioText); }}>🔊 HEAR THE WORD</button>}
    <div className="word-slots" aria-live="polite">{cards.map((_, index) => <span key={index}>{answer[index] ?? "_"}</span>)}</div>
    <div className="letter-card-bank">{cards.map((card, index) => {
      const cardKey = `${card}-${index}`;
      const isUsed = answer.includes(card);
      return <button type="button" className="letter-card secondary" key={cardKey} disabled={disabled || isUsed} onClick={() => onChange([...answer, card])}>{card}</button>;
    })}</div>
    {answer.length > 0 && !disabled && <button type="button" className="secondary" onClick={() => onChange(answer.slice(0, -1))}>UNDO LAST</button>}
  </section>;
}

function FocusDisplay({ presentation, cueIds }: { presentation: Extract<LessonPresentationView, { kind: "TUTOR_MESSAGE" }>; cueIds: readonly string[] }): JSX.Element {
  return <section className="lesson-focus-display" aria-label="Tutor example">
    {presentation.modelText && <p className="lesson-model-text">{presentation.modelText}</p>}
    {presentation.displayTokens && <div className="lesson-display-tokens">{presentation.displayTokens.map((token, index) => <span key={`${token}-${index}`}>{token}</span>)}</div>}
    <SoundCueStrip cueIds={cueIds} />
  </section>;
}

function ControlledTextReader({ presentation, selectedChoice, result, isBusy, isRequestingHint, onSelect, onReadHelp }: {
  presentation: Extract<LessonPresentationView, { kind: "CONTROLLED_TEXT" }>;
  selectedChoice: string;
  result: AnswerResult | null;
  isBusy: boolean;
  isRequestingHint: boolean;
  onSelect: (choiceId: string) => void;
  onReadHelp: () => void;
}): JSX.Element {
  return <section className="controlled-text-reader">
    <p className="controlled-sentence">{presentation.text}</p>
    {!result && <button className="secondary" type="button" disabled={isRequestingHint || isBusy} onClick={onReadHelp}>READ IT TO ME FOR HELP</button>}
    <ChoiceBoard choices={presentation.choices} selected={selectedChoice} disabled={Boolean(result) || isBusy} onSelect={onSelect} />
  </section>;
}

function ContinueButton({ label, disabled, onFilled }: { label: string; disabled: boolean; onFilled: () => Promise<void> }): JSX.Element {
  const [isFilling, setIsFilling] = useState(false);
  const timeoutRef = useRef<number>();
  useEffect(() => () => { if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current); }, []);
  const begin = (): void => {
    if (disabled || isFilling) return;
    setIsFilling(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timeoutRef.current = window.setTimeout(() => { void onFilled(); }, reducedMotion ? 0 : CONTINUE_FILL_MS);
  };
  return <button type="button" className={`learning-continue-button lesson-continue ${isFilling ? "is-filling" : ""}`} disabled={disabled || isFilling} onClick={begin} aria-label={`${label}, continue to the next activity`}><span>{isFilling ? "SAVING…" : label}</span><span className="continue-arrow" aria-hidden="true">→</span></button>;
}

function ProgressCelebration({ result }: { result: AnswerResult }): JSX.Element {
  return <section className={result.correct ? "lesson-feedback is-correct" : "lesson-feedback"} role="status">
    <strong>{result.correct ? "You got it." : "Let's use what we noticed."}</strong>
    <p>{result.explanation}</p>
    {result.evidenceMode === "SUPPORTED_READING" && <small>This try was saved as reading with help.</small>}
  </section>;
}

function LessonControls({ activityId, isPresentationOnly, result, isBusy, isRequestingHint, hint, hintError, canSubmit, onHint, onSubmit, onCompleteAndNext, onNext }: {
  activityId: string;
  isPresentationOnly: boolean;
  result: AnswerResult | null;
  isBusy: boolean;
  isRequestingHint: boolean;
  hint: HintResult | null;
  hintError: string | null;
  canSubmit: boolean;
  onHint: () => void;
  onSubmit: () => void;
  onCompleteAndNext: () => Promise<void>;
  onNext: () => Promise<void>;
}): JSX.Element {
  return <>
    {!isPresentationOnly && !result && <div className="lesson-support-row">
      <button className="secondary" type="button" disabled={isRequestingHint || isBusy} onClick={onHint}>{isRequestingHint ? "GETTING A HINT…" : "GIVE ME A HINT"}</button>
      {hint && <p className="lesson-hint" role="status">{hint.message}</p>}
      {hintError && <p className="lesson-hint is-error" role="alert">{hintError}</p>}
    </div>}
    {!isPresentationOnly && !result && <button type="button" disabled={isBusy || !canSubmit} onClick={onSubmit}>CHECK MY WORK</button>}
    {result && <ProgressCelebration result={result} />}
    {isPresentationOnly && <ContinueButton key={activityId} label="CONTINUE" disabled={isBusy} onFilled={onCompleteAndNext} />}
    {result && <ContinueButton key={`${activityId}-result`} label={result.complete ? "FINISH SESSION" : result.correct ? "CONTINUE" : "TRY A FRESH ONE"} disabled={isBusy} onFilled={onNext} />}
  </>;
}

export function KindergartenLessonActivity({ activity, position, length, result, isBusy, onSubmit, onCompleteAndNext, onNext, onHint, onTakeBreak }: {
  activity: LessonActivityView;
  position: number;
  length: number;
  result: AnswerResult | null;
  isBusy: boolean;
  onSubmit: (answer: unknown) => Promise<void>;
  onCompleteAndNext: () => Promise<void>;
  onNext: () => Promise<void>;
  onHint: (level?: LessonSupportLevel) => Promise<HintResult>;
  onTakeBreak: () => Promise<void>;
}): JSX.Element {
  const [selectedChoice, setSelectedChoice] = useState("");
  const [cardAnswer, setCardAnswer] = useState<string[]>([]);
  const [hint, setHint] = useState<HintResult | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const presentation = activity.presentation;
  const isPresentationOnly = presentation.kind === "TUTOR_MESSAGE";
  const cueIds = "audioCueIds" in presentation ? presentation.audioCueIds ?? [] : [];

  useEffect(() => {
    setSelectedChoice("");
    setCardAnswer([]);
    setHint(null);
    setHintError(null);
    stopSpeaking();
    void speak(activity.narration);
    return () => stopSpeaking();
  }, [activity.instanceId, activity.narration]);

  const requestHint = async (level?: LessonSupportLevel): Promise<void> => {
    setIsRequestingHint(true);
    setHintError(null);
    try {
      const nextHint = await onHint(level);
      setHint(nextHint);
      stopSpeaking();
      void speak(nextHint.narration ?? nextHint.message);
    } catch (reason) {
      setHintError(reason instanceof Error ? reason.message : "A hint is not available right now.");
    } finally {
      setIsRequestingHint(false);
    }
  };

  const submitAnswer = async (): Promise<void> => {
    const answer = presentation.kind === "CARD_WORKSPACE" ? cardAnswer : selectedChoice;
    await onSubmit(answer);
  };

  return <section className="kindergarten-lesson" aria-labelledby="lesson-prompt">
    <div className="lesson-progress-row">
      <p className="eyebrow">{purposeLabel(activity.purpose)} · {position + 1} OF {length}</p>
      <button className="secondary take-break-button" type="button" disabled={isBusy} onClick={() => void onTakeBreak()}>TAKE A BREAK</button>
    </div>
    <div className="lesson-progress-track" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={length} aria-valuenow={position + 1}><span style={{ width: `${((position + 1) / length) * 100}%` }} /></div>
    <TutorPanel activity={activity} result={result} />
    <div className="lesson-prompt-row"><h1 id="lesson-prompt">{activity.prompt}</h1><button className="speaker-button" type="button" onClick={() => { stopSpeaking(); void speak(activity.narration); }} aria-label="Replay directions">🔊</button></div>

    {presentation.kind === "TUTOR_MESSAGE" && <FocusDisplay presentation={presentation} cueIds={cueIds} />}
    {presentation.kind === "CHOICE_BOARD" && <><SoundCueStrip cueIds={cueIds} /><ChoiceBoard choices={presentation.choices} selected={selectedChoice} disabled={Boolean(result) || isBusy} onSelect={setSelectedChoice} /></>}
    {presentation.kind === "CARD_WORKSPACE" && <><SoundCueStrip cueIds={cueIds} /><CardWorkspace cards={presentation.cards} answer={cardAnswer} disabled={Boolean(result) || isBusy} onChange={setCardAnswer} wordAudioText={presentation.wordAudioText} /></>}
    {presentation.kind === "CONTROLLED_TEXT" && <ControlledTextReader presentation={presentation} selectedChoice={selectedChoice} result={result} isBusy={isBusy} isRequestingHint={isRequestingHint} onSelect={setSelectedChoice} onReadHelp={() => void requestHint("L4_MODEL")} />}

    <LessonControls activityId={activity.instanceId} isPresentationOnly={isPresentationOnly} result={result} isBusy={isBusy} isRequestingHint={isRequestingHint} hint={hint} hintError={hintError} canSubmit={presentation.kind === "CARD_WORKSPACE" ? cardAnswer.length === presentation.slots : Boolean(selectedChoice)} onHint={() => void requestHint()} onSubmit={() => void submitAnswer()} onCompleteAndNext={onCompleteAndNext} onNext={onNext} />
    <details className="selection-reason"><summary>Why this activity?</summary><p>{activity.selectionReason}</p></details>
  </section>;
}
