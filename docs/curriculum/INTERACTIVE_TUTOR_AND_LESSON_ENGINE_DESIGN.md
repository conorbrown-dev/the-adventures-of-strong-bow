# Interactive Tutor and Lesson Engine Design

**Stage:** 2B — design only

**Status:** proposed for review at the Stage 2B gate

**Scope:** K–2 ELA architecture, with an exact Stage 3 subset for the initial kindergarten short-`a` vertical slice

This design is constrained by the Stage 1 audit, the approved K–2 ELA instructional progression, the implementation plan, and the current repository. It does not change production curriculum, add a lesson engine, add live AI, or modify runtime behavior.

The central decision is to preserve the Stage 2 curriculum model as the source of truth. A skill graph decides **what** the learner is ready to work on. A `LearningActivityDefinition` decides **why** the activity is being shown and what evidence it may produce. A reusable lesson recipe decides **how** that one activity is taught or assessed. Reviewed content supplies examples, narration, error mappings, and supports. The client renders a server-created instance and never decides mastery.

## 1. Tutor Experience Model

### 1.1 Learner-facing lifecycle

The tutor experience uses the following presentation lifecycle. These are runtime stages, not replacements for the Stage 2 `ActivityPurpose` values.

| Tutor stage | Learner experience | Stage 2 purpose/evidence relationship |
|---|---|---|
| `WELCOME` | A short orientation and statement of the learning goal | Presentation only; no evidence |
| `INTRODUCE` | The tutor names or demonstrates the target concept | `INSTRUCTION`; completion only |
| `MODEL` | The tutor completes an example and explains the relevant feature | `MODELED_EXAMPLE`; completion only |
| `GUIDED` | The learner responds with immediate, specific coaching | `GUIDED_PRACTICE`; supported evidence only |
| `SUPPORTED` | The task is simplified or made more explicit after difficulty or a requested hint | Still the owning activity purpose; the support event prevents the response from becoming independent mastery evidence |
| `INDEPENDENT` | The learner answers a fresh item without instructional help | `INDEPENDENT_PRACTICE`; eligible readiness evidence, not mastery by itself |
| `MASTERY` | The learner answers fresh, scope-valid items under the skill's mastery rule | `MASTERY_CHECK`; eligible mastery evidence |
| `REMEDIATE` | The tutor briefly reteaches a diagnosed prerequisite or misconception | A new `INSTRUCTION` or `GUIDED_PRACTICE` activity instance; never a hidden mastery check |
| `CELEBRATE` | A calm acknowledgement of meaningful progress | Presentation only; no evidence |
| `COMPLETE` | The checkpoint is saved and the next safe choice is offered | Presentation and persistence only |

`SUPPORTED`, `REMEDIATE`, `CELEBRATE`, and `COMPLETE` are engine states. They do not add new curriculum purposes or skill states. A complete learner session is a series of short activity instances selected by the server; it is not one large client-owned lesson document.

### 1.2 Separation of concerns

1. The prerequisite graph and learner skill states choose the next skill and permitted purpose.
2. `LearningActivityDefinition` binds the skill, purpose, delivery/evidence modes, content scope, recipe, and reviewed content.
3. A recipe variant expands that single purpose into a small ordered sequence of tutor stages and interactive components.
4. The server creates a deterministic activity instance, selects examples, retains canonical answers, and persists the checkpoint.
5. The React renderer displays discriminated step views and sends learner actions back to the server.
6. Evidence and mastery remain server-side. Animation, tutor expression, and client timing cannot create or upgrade evidence.

### 1.3 Activity-instance contract

The Stage 2 `LearningActivityDefinition` should gain references rather than inline presentation logic:

```ts
interface InteractiveActivityBinding {
  recipeId: LessonRecipeId;
  recipeVersion: number;
  contentId: LessonContentId;
  contentVersion: number;
  hintLadderId: HintLadderId;
  remediationMapId: RemediationMapId;
}
```

A server-created instance records the selected recipe variant, example IDs, and stage sequence. The client receives only the fields needed to render the current step. Canonical answers, mastery thresholds, unselected examples, and future steps remain server-only.

## 2. Reusable Lesson Recipes

### 2.1 Definition

A lesson recipe is a reviewed, versioned pedagogical sequence that is independent of a particular letter, word list, story, or standard. It declares which component capability is used at each step, which content slots must be supplied, which supports are legal, and what completion event advances the instance.

```ts
type LessonStageKind =
  | "WELCOME"
  | "INTRODUCE"
  | "MODEL"
  | "GUIDED"
  | "SUPPORTED"
  | "INDEPENDENT"
  | "MASTERY"
  | "CELEBRATE"
  | "COMPLETE";

interface RecipeStepDefinition {
  id: string;
  stage: LessonStageKind;
  componentKind: InteractiveComponentKind;
  requiredContentSlots: readonly string[];
  completionRule: CompletionRule;
  permittedHintLevels: readonly HintLevel[];
  animationCues?: readonly AnimationCue[];
  tutorMessageKey?: string;
}

interface RecipeVariantDefinition {
  purpose: ActivityPurpose;
  steps: readonly RecipeStepDefinition[];
}

interface LessonRecipeDefinition {
  id: LessonRecipeId;
  version: number;
  title: string;
  supportedActivityKinds: readonly ActivityKind[];
  variants: readonly RecipeVariantDefinition[];
  requiredCapabilities: readonly InteractiveComponentKind[];
}
```

Each recipe has purpose-specific variants. For example, the instruction variant of word mapping contains an introduction and model; its guided-practice variant contains guided word work and optional support; its mastery variant contains only independent, fresh trials plus completion. This preserves the Stage 2 rule that each selectable activity has exactly one `ActivityPurpose`.

### 2.2 Initial recipe catalog

Stage 3 should implement exactly six recipe families:

| Recipe ID | Reusable instructional job | Stage 3 uses |
|---|---|---|
| `ela.auditory-contrast.v1` | Hear, compare, identify, and isolate spoken units without requiring print | word awareness, initial-phoneme isolation, short-`a` recognition, medial short-`a` isolation |
| `ela.symbol-sound.v1` | Introduce and practice a symbol, its identity, case relationship, and sound | letter-versus-symbol, lowercase identity, case matching, consonant sounds, vowel identity |
| `ela.phoneme-sequence.v1` | Blend or segment an ordered sequence of phonemes using tokens and audio cues | two-/three-phoneme blending and three-phoneme segmentation |
| `ela.word-mapping.v1` | Map phonemes to graphemes and use the mapping to read or build a word | short-`a` CVC decoding and encoding |
| `ela.print-feature.v1` | Notice and apply a visible print convention | left-to-right direction, spacing, capitalization, terminal punctuation |
| `ela.controlled-sentence.v1` | Read a controlled sentence and answer a literal question without contaminating reading evidence | `ela.text.sentence.short-a` and `ela.read.literal.short-a` |

Six recipes are enough for the initial vertical slice. Adding one recipe per skill would duplicate instructional behavior and make review difficult. A recipe is added only when an existing family cannot express a materially different learner interaction or evidence policy.

The recipe schema is domain-neutral at the engine boundary: stages, components, hints, checkpoints, and evidence policies do not assume ELA. ELA-specific recipe definitions and content adapters live under the curriculum ELA feature. Later mathematics recipes can reuse the engine without pretending that phoneme work and number work are the same pedagogy.

### 2.3 Content binding

Content supplies reviewed values to recipe slots:

```ts
interface LessonContentDefinition {
  id: LessonContentId;
  version: number;
  skillId: SkillId;
  contentScopeId: ContentScopeId;
  recipeId: LessonRecipeId;
  narration: Readonly<Record<string, NarrationDefinition>>;
  examples: Readonly<Record<string, readonly ReviewedExample[]>>;
  misconceptions: readonly MisconceptionMapping[];
  hintLadderId: HintLadderId;
  remediationMapId: RemediationMapId;
  review: ContentReviewMetadata;
}
```

Recipes never contain canonical word lists, standards, or grade-level scope. Content never contains arbitrary executable UI code.

## 3. Reusable Interactive Components

The minimum coherent component system is seven components. Components receive serializable view models and emit typed actions. They do not fetch curriculum, select future questions, inspect mastery state, or call browser speech APIs directly.

| Component | Purpose | Configuration contract | Evidence emitted | Accessibility | TTS/audio behavior | Deterministic behavior | Animation and reuse |
|---|---|---|---|---|---|---|---|
| `TutorPanel` | Maintain a consistent guide presence, state the goal, give concise feedback, and expose replay | tutor state, reviewed message token, optional portrait asset, narration cue, progress label | `MESSAGE_PRESENTED`, `NARRATION_REPLAYED`; no correctness | Live region is polite by default; visible text mirrors speech; portrait is decorative; replay is a labeled button | Whole-language narration delegates to centralized `speak`; navigation and replacement prompts call `stopSpeaking` | Message token and tutor state come from the engine; the component does not invent feedback | CSS state changes only; optional static portrait; reusable across every recipe |
| `ChoiceBoard` | Present text, symbol, image, or sound choices with one or more valid selections | prompt view, choice views, selection mode, layout, audio-cue permissions, disabled/submitted state | typed `CHOICE_SELECTED` and `CHOICE_SUBMITTED`; server scores | Semantic buttons or checkbox/radio grouping; roving focus only when needed; 44px+ targets; no color-only state | Each audible choice has an explicit reviewed cue or whole-word narration policy; no spelling-to-phoneme guesses | Stable choice IDs and server-supplied order/seed; replay cannot submit | Optional success glow or single pulse; replaces separate multiple/image/sound choice renderers |
| `CardWorkspace` | Select, order, move, blend, segment, or map letter/sound/word cards | card models, slots, permitted operations, initial placements, keyboard move commands, audio cues | typed move/order/submit events; server interprets and scores | Click/tap alternative to drag; keyboard pick-up/move/drop; announced slot position; visible focus | Card audio is explicit; phoneme cards require reviewed phoneme assets | Snapping and valid move rules are declarative; no client randomization after instance creation | `SLIDE_TOGETHER`, `SEPARATE`, and `SNAP` have reduced-motion equivalents; supports phoneme, spelling, and later generic ordering tasks |
| `FocusDisplay` | Demonstrate or highlight a feature without asking for evidence | display tokens, focus regions, labels, pointer cue, animation cue sequence | presentation completion only | Text remains real text where possible; highlights include shape/underline; narrated description available | Uses reviewed narration; may play reviewed phoneme cues during a model | Cue sequence is an allowlisted timeline supplied by the recipe instance | Model blending, print direction, capitalization, and punctuation without custom scene code |
| `ControlledTextReader` | Display a controlled sentence/passage and keep direction audio separate from the text being assessed | tokenized controlled text, direction narration, allowed help modes, question view, evidence mode | read-attempt/help/comprehension actions; server applies evidence downgrade | Semantic text, adjustable line spacing, focusable help controls, no forced animation | Directions may be narrated; assessed sentence is silent in independent mode; requesting sentence narration changes the attempt to supported reading | Scope/version and help policy are fixed in the instance | Optional word focus follows learner action, not an auto-moving timer; reusable for sentences and later passages |
| `LessonControls` | Provide repeat, hint, continue, take-a-break, and progress controls | allowed actions, progress fraction, save state, continue mode | support/control events, never correctness | Native buttons, visible labels or `aria-label`, focus retention, status text for saving | Repeat delegates to the active narration/audio cue; stopping or leaving cancels audio | Continue is enabled only by the engine state; countdowns are never evidence | Existing fill-style Continue may be used only for explicit, user-controlled transitions; reduced motion shows immediate fill/state |
| `ProgressCelebration` | Mark a meaningful instructional milestone without becoming the task | milestone kind, short message, optional confetti, next action | `MILESTONE_PRESENTED`; no evidence | Status text and icon provide the same meaning; reduced motion removes movement; no flashing | Optional short reviewed phrase; it never overlaps other narration | Milestone eligibility is server/recipe-defined | Confetti is reserved for meaningful milestones, not every correct tap; reusable outside ELA |

The current `LearningApp` already contains early versions of choice rendering, sequence interaction, adult scoring, progress, hints, confetti, and a filling Continue control. Stage 3 should extract and type these behaviors behind the component contracts instead of rewriting the entire `/learning` route.

## 4. Tutor Character / Presentation

The current game includes an explorer/player sprite sheet that is visually compatible with the product's adventurous identity. It is not directly suitable as the tutor runtime asset: it is Phaser-oriented, includes gameplay poses and a shovel, and has no reviewed mapping to instructional states. React curriculum code must not import a Phaser scene or game sprite sheet.

Stage 3 should use a lightweight `TutorPanel` with a calm, warm presentation consistent with the existing `/learning` styles. After asset provenance and visual review, one neutral, front-facing idle frame may be extracted into a curriculum-owned asset location such as `src/learning/assets/tutor/` and referenced through a typed asset catalog. If that review is not complete, the panel renders correctly without a portrait. The lesson engine must not depend on character art.

No new animation library is justified. `IDLE`, `SPEAKING`, `POINTING`, `ENCOURAGING`, `GENTLE_CORRECTION`, and `CELEBRATING` are presentation states rendered with CSS classes, a limited icon/pose set, and text. Stage 3 defers lip synchronization, skeletal animation, free-roaming characters, and emotion inference.

## 5. Tutor Dialogue Model

Tutor language has four categories:

| Category | Authoring/runtime rule | Stage 3 |
|---|---|---|
| Scripted static | Exact, reviewed line identified by a versioned message key | Required |
| Parameterized reviewed | Reviewed template with a closed set of typed substitutions, such as a display letter or count | Required |
| Pregenerated reviewed | AI may draft variants outside runtime; a human approves and versions them before shipping | Optional authoring workflow, not runtime |
| Live constrained | A server service may answer an unexpected learner question within a narrow current-skill contract | Deferred |

```ts
interface TutorMessageDefinition {
  id: TutorMessageId;
  version: number;
  category: "SCRIPTED_STATIC" | "PARAMETERIZED_REVIEWED" | "PREGENERATED_REVIEWED";
  textTemplate: string;
  allowedVariables: readonly TutorVariableDefinition[];
  narrationPolicy: NarrationPolicy;
  review: ContentReviewMetadata;
}
```

Dialogue follows these rules:

- one instruction or feedback idea per utterance;
- normally one or two short sentences for kindergarten;
- name the relevant feature, not the child's ability;
- never use shame, sarcasm, urgency, streak loss, or failure labels;
- distinguish “try this part again” from “you do not know this”;
- do not narrate assessed independent text unless the evidence mode explicitly allows it;
- every spoken line has equivalent visible text.

## 6. AI Safety/Boundaries

Live AI is not required for a complete lesson and is explicitly outside Stage 3. A future live tutor may only provide a bounded rephrasing, short explanation, or response to an unexpected question about the current reviewed skill and example.

The server must send a minimal request containing grade band, current skill ID/version, reviewed concept summary, permitted vocabulary, the learner's current question, and an output schema. It must not send the learner's name, free-form profile, longitudinal history, school, location, contact information, or raw diagnostic record.

The future service must enforce all of the following before a response reaches the client:

1. input moderation and length limits;
2. current-skill and permitted-vocabulary grounding;
3. a structured response with at most three child-sized sentences;
4. output moderation and rejection of personal-data requests, unsafe topics, instructions to leave the app, or claims about the learner;
5. prohibition on changing canonical answers, evidence modes, progression, mastery, accommodations, or game eligibility;
6. prohibition on generating phoneme pronunciations or asset identifiers;
7. deterministic fallback to a reviewed scripted message on timeout, invalid schema, unsafe output, quota exhaustion, or provider failure;
8. auditable event metadata without retaining unnecessary child text.

The renderer accepts only the validated response schema. It never renders provider markup or executes provider-supplied actions. The deterministic engine remains responsible for scoring, hints, remediation routing, and progression.

## 7. TTS/Narration

All whole-language tutor speech continues through `src/quiz/speech.ts` using `speak` and `stopSpeaking`. Feature components do not construct `SpeechSynthesisUtterance`, choose browser voices, or call `/api/tts` directly. Stage 3 may extend the centralized speech module with a reviewed-audio-cue resolver, but stopping speech must cancel both model TTS and prerecorded cue playback.

Narration is divided by evidence risk:

| Content | Default audio source | Evidence rule |
|---|---|---|
| UI labels and directions | Model-backed whole-text TTS through `speak`, with the existing centralized browser fallback | May be replayed without downgrading evidence when it does not reveal the answer |
| Tutor explanations and feedback | Reviewed text through `speak`; common lines may be prewarmed | Instructional/support event is recorded when content goes beyond neutral directions |
| Whole words in auditory activities | Reviewed word asset when pronunciation is evidence-critical; otherwise model TTS under a declared policy | Allowed only where hearing the word is part of the task |
| Controlled text being independently read | Silent by default | Playing the assessed text changes the evidence to `SUPPORTED_READING` and cannot satisfy independent mastery |
| Individual phonemes and deliberately stretched blends | Reviewed prerecorded asset only | Never synthesized from ordinary text spelling |

Navigation, activity replacement, pause, game handoff, and new narration call `stopSpeaking` first. Replay is explicit and never auto-submits. Auto-narration is permitted only when the content definition requests it and the learner preference allows it; the visible interface remains fully usable when audio is unavailable.

## 8. Phoneme Caveat

Phonemes are not ordinary text-to-speech strings. Feeding `/m/`, `m`, or an IPA-like spelling to a general TTS engine may produce a letter name, add a schwa, alter voicing, or vary by provider. That is pedagogically unsafe for beginning decoding.

Each phoneme cue therefore has a reviewed asset and metadata:

```ts
interface PhonemeAudioCue {
  id: AudioCueId;
  phoneme: string;
  pronunciationMode: "CONTINUOUS" | "STOP" | "SHORT_VOWEL";
  locale: "en-US";
  assetId: CurriculumAssetId;
  reviewVersion: number;
  reviewedBy: string;
}
```

The first slice requires reviewed cues for `/m/`, `/s/`, `/t/`, `/p/`, `/n/`, `/k/`, and short `/a/`. The letter `c` is restricted to `/k/` in this scope. A slow blend is produced by sequencing reviewed phoneme cues with explicit timing, not by asking TTS to pronounce a fabricated string. If a required phoneme asset is missing, the engine must not silently fall back to model or browser TTS. It blocks autonomous mastery evidence and offers retry or an explicitly adult-supported path.

## 9. Narration Cache/Asset Strategy

### 9.1 Resolution order

The centralized audio resolver uses this order:

1. reviewed, versioned curriculum audio asset when the cue is pronunciation-critical;
2. cached model TTS for whole-language text;
3. live model synthesis for whole-language text;
4. the existing centralized browser fallback for non-phoneme whole language only;
5. visible text plus an adult-help option when audio is still unavailable.

Phoneme cues and deliberately stretched blends stop after step 1. They never descend to ordinary TTS.

### 9.2 Repository storage and delivery

The repository has no current curriculum asset pipeline or `public/` audio catalog. Stage 3 should place newly reviewed curriculum audio under a neutral source location such as `src/learning/assets/curriculum-audio/`, with metadata in the curriculum content catalog. Vite imports produce content-hashed build assets. The existing production server already serves built frontend assets with immutable caching, so the first slice does not require a CDN, object storage, or a second delivery service.

Existing inline CVC audio in `src/game/data/cvcWords.ts` is a candidate source, not an approved dependency. Each candidate recording must be audited for pronunciation, scope, ownership, and encoding, then extracted into the curriculum-owned catalog. React learning code must not import the Phaser game catalog.

### 9.3 Cache identity and invalidation

The browser's existing speech cache and the server's TTS cache are currently bounded in-memory caches keyed primarily by text. That is adequate to preserve for Stage 3 whole-language narration, but it is not the final durable identity. A future persistent cache key must include:

```text
provider + model + voice + locale + pronunciationMode + rate + contentVersion + textHash
```

Static reviewed assets invalidate naturally through content-hashed filenames and catalog versioning. A changed recording receives a new asset ID or version; old clients may finish an in-progress activity with the old version, while new instances use the new content version. Cache clearing must never mutate an already-started activity's evidence semantics.

### 9.4 Local development and tests

Local Vite development resolves the same typed asset imports as production. Content validation fails the build when a referenced required asset is absent, duplicated, or lacks review metadata. Unit tests use a fake audio resolver keyed by cue ID; browser and end-to-end tests verify cancellation, replay, failure fallback, and the “no TTS for phoneme cues” invariant without requiring a real Piper process.

## 10. Animation Strategy

Curriculum content may request only allowlisted semantic cues:

```ts
type AnimationCue =
  | "HIGHLIGHT"
  | "PULSE_ONCE"
  | "SLIDE_TOGETHER"
  | "SEPARATE"
  | "REVEAL"
  | "POINT"
  | "SNAP"
  | "SUCCESS_GLOW";
```

Each cue has an engine-owned maximum duration and CSS implementation. Content may choose the target and cue but cannot supply JavaScript, CSS selectors, arbitrary timing loops, or URLs. Animations illustrate a relationship already represented in text, position, shape, or narration; they do not carry the only instructional meaning.

`prefers-reduced-motion` replaces movement with an immediate state change, underline, outline, or static highlight. Narration and completion are not coupled to animation duration. The learner can replay a model in the same deterministic order, and leaving a step cancels outstanding animation and audio. No animation is allowed to move a focus target while the learner is interacting with it.

## 11. Specific Error Feedback

Specific feedback is generated from reviewed misconception metadata, not from a generic “wrong” branch and not from live AI. Distractors and workspace actions carry stable diagnostic tags; the server maps the submitted action to one or more tags.

```ts
type MisconceptionTag =
  | "SOUND_POSITION_CONFUSION"
  | "VOWEL_CONTRAST_CONFUSION"
  | "CONSONANT_CONTRAST_CONFUSION"
  | "ORDER_REVERSAL"
  | "OMITTED_PHONEME"
  | "ADDED_PHONEME"
  | "GRAPHEME_SOUND_CONFUSION"
  | "GUESS_WITHOUT_BLEND"
  | "PRINT_DIRECTION_CONFUSION"
  | "LITERAL_DETAIL_CONFUSION"
  | "UNCLASSIFIED";

interface FeedbackDefinition {
  misconception: MisconceptionTag;
  messageId: TutorMessageId;
  attentionTarget?: FocusTarget;
  nextHintLevel?: HintLevel;
  remediationRoute?: RemediationRouteId;
}
```

Feedback follows a three-part shape: acknowledge effort neutrally, name the relevant observable feature, and offer one next action. For example: “Those sounds are in a different order. Touch each sound from left to right, then slide them together.” It must not label a learner as careless, confused, behind, or bad at reading.

An unclassified response receives a reviewed general retry message and no invented diagnosis. Repeated errors are counted by skill, content scope, and misconception tag within the current session. Counts may trigger a configured remediation route, but they are never displayed as penalties.

## 12. Hint Ladder

The shared hint ladder is monotonic: later levels give more help and can never increase the evidentiary value of the current response.

| Level | Support | Example | Evidence effect |
|---|---|---|---|
| `L0_REPLAY` | Repeat neutral directions or an audio cue already intrinsic to the task | Replay “Choose the word with the sound in the middle” | No downgrade when the activity's declared evidence mode permits that audio and it does not reveal the response |
| `L1_FOCUS` | Direct attention to a position or feature | Underline the middle position or point to the first card | Records a support event; the current response is no longer independent mastery evidence |
| `L2_CONTRAST` | Reduce the field, replay an enhanced contrast, or slow a blend | Compare two choices or space phoneme cues | Supported/guided evidence only |
| `L3_PARTIAL` | Complete one part and ask the learner to finish | Place the first phoneme card | Guided evidence only |
| `L4_MODEL` | Demonstrate the complete item, then move to a fresh equivalent item | Blend `m-a-p` aloud and show the slide | Completion of instruction only; the modeled item can never be scored as learner correctness |

Directions and accessibility delivery are not automatically hints. The content definition explicitly identifies which audio/visual support is intrinsic to the task. In an auditory discrimination activity, replaying the normal target word may be intrinsic; in independent decoding, playing the word reveals the answer and is `L4_MODEL`. Enlarged text, keyboard operation, focus indication, and screen-reader labels never downgrade evidence.

The server records the highest hint level used before submission. A later correct response on the same item retains that support level. After `L4_MODEL`, the engine selects a fresh, scope-equivalent item before collecting any new evidence.

## 13. Remediation Recipes

Remediation is deterministic, short, and tied to a prerequisite or misconception. It creates a separate `INSTRUCTION` or `GUIDED_PRACTICE` activity instance, preserves the learner's original checkpoint, and returns to a fresh item only after the remediation checkpoint is saved.

| Trigger pattern | Remediation route | Return condition |
|---|---|---|
| Repeated vowel contrast errors | `ela.auditory-contrast.v1` with target short-`a` and two reviewed contrasts | One guided contrast completed; return to a fresh word |
| Guessing or reversed order during blending | `ela.phoneme-sequence.v1` in guided blend mode with visible tokens | One correct supported blend with ordered touch/slide events |
| Omitted or added phoneme during segmentation | `ela.phoneme-sequence.v1` in guided segment mode with one slot per phoneme | Learner maps one token to each heard phoneme |
| Grapheme/sound confusion | `ela.symbol-sound.v1` for the confused letter-sound pair | Reviewed model plus one guided response |
| Print direction confusion | `ela.print-feature.v1` with a left-to-right pointer model | Learner identifies or traces direction once |
| Literal-detail error after supported reading | `ela.controlled-sentence.v1` in guided reread mode | Learner locates the relevant word/detail; no independent reading claim |

The engine limits recursive remediation. The first configured trigger may open one short detour; a second failure after return offers a break, a later review, or an adult-support message rather than looping the same item. Remediation success does not erase earlier attempts or directly mark the target skill mastered.

## 14. Engagement

Engagement comes from visible understanding, learner control, and meaningful variety rather than constant reward effects.

- Use a short goal statement and stage-based progress so the learner knows what remains.
- Celebrate the first independent success after support, completion of a mastery checkpoint, and a saved session milestone—not every correct selection.
- Use the existing confetti style only for those meaningful milestones. Instructional and guided taps receive calm feedback without confetti.
- Vary reviewed examples and component arrangements using a server seed while preserving content scope and avoiding repeats within an instance.
- Keep “Take a break,” replay, and hint controls predictable and available.
- Never remove earned progress, threaten a streak, or rush a response with a timer.
- Offer an optional aligned game break after an instructional checkpoint; declining it has no consequence.

The filling Continue control may remain as a clear transition affordance, with a right-arrow icon and visible focus. It must not force an automatic page transition while the tutor is explaining, while a screen reader is reading status, or without a learner-controlled Continue action. If a brief fill animation follows an explicit click, reduced-motion mode completes it immediately.

## 15. Session Rhythm

A normal kindergarten learning visit targets roughly five to ten minutes, or six to ten short activity instances, whichever produces the earlier natural checkpoint. The selector alternates cognitively demanding tasks with short model/review moments and does not place a game between every item.

The default rhythm is:

1. welcome and goal;
2. one short instruction/model instance when the skill is new or remediation is due;
3. two or three guided instances;
4. a checkpoint and optional aligned game break;
5. two or three independent instances when eligible;
6. a mastery check only when the Stage 2 rules say the learner is ready;
7. celebration, save confirmation, and next-session preview.

### 15.1 Pause and resume

“Take a break” is available at stable step boundaries and becomes available immediately after any short active audio/model cue finishes or is cancelled. The client stops speech, requests a checkpoint, waits for success or shows a clear retry state, and then returns to the learning home screen.

The existing server already persists serialized learning-session state at question boundaries, while local storage retains a resumable session reference. Stage 3 extends that checkpoint rather than creating a second client-only save system:

```ts
interface LessonCheckpoint {
  lessonActivityInstanceId: string;
  recipeId: LessonRecipeId;
  recipeVersion: number;
  contentId: LessonContentId;
  contentVersion: number;
  currentStepId: string;
  currentStepIndex: number;
  selectedExampleIds: readonly string[];
  completedStepIds: readonly string[];
  highestHintByTrialId: Readonly<Record<string, HintLevel>>;
  misconceptionCounts: Readonly<Partial<Record<MisconceptionTag, number>>>;
  completedEvidenceEventIds: readonly string[];
  updatedAt: string;
}
```

The server persists the checkpoint after every submitted response, hint escalation, completed model, remediation transition, game handoff, and explicit pause. On resume it returns the same recipe/content versions, example IDs, current step, and support state. It does not reshuffle, replay already-counted evidence, or restart at the first question. Local storage contains only the session ID and minimal display metadata; it is not authoritative progress.

The current resume filter is diagnostic/placement-specific. Stage 3 must generalize the server/session contract so an unfinished instructional activity can also be resumed, while keeping diagnostic resume behavior intact.

## 16. Game Handoff

Games are optional reinforcement consumers. They do not choose curriculum scope, introduce an unready skill, score mastery, or read the learner's full profile.

The server issues a short-lived handoff:

```ts
interface CurriculumGameHandoff {
  version: 1;
  handoffId: string;
  gameId: GameId;
  skillId: SkillId;
  skillVersion: number;
  contentScopeId: ContentScopeId;
  permittedExampleIds: readonly string[];
  targetPatternIds: readonly string[];
  knownPrerequisiteSkillIds: readonly SkillId[];
  difficultyBand: "INTRODUCED" | "PRACTICING" | "REVIEW";
  durationSeconds: number;
  returnPath: "/learning";
  expiresAt: string;
}
```

The game receives this validated context through an opaque handoff ID or server-resolved route state. It does not receive canonical answers for unrelated items, mastery thresholds, diagnostic scores, learner names, or standards not required to play. The game must reject examples outside the supplied scope and decline launch when it cannot honor the requested skill/content contract.

On return, the game submits reinforcement events—attempted example IDs, response outcomes, support used, and duration—against the handoff. These may inform future review selection but cannot independently mark mastery. The lesson checkpoint is saved before launch; returning resumes the exact next step. A game is offered only for a skill already `INTRODUCED`, `PRACTICING`, or `REVIEW_DUE`, never for a not-yet-introduced target.

## 17. Complete Conceptual Lesson Definition

The following is a conceptual, reviewed-content definition for the initial CVC decoding skill. It demonstrates the contract; it is not production curriculum data.

### 17.1 Target lesson content

```yaml
id: ela.lesson.cvc-decode.short-a.set1
version: 1
skillId: ela.phonics.cvc.decode.short-a
prerequisiteSkillIds:
  - ela.alphabet.lowercase.set-1
  - ela.phonics.consonant-sounds.set-1
  - ela.phonics.vowel.short-a
  - ela.pa.phoneme-blend.three
contentScopeId: ela.scope.k.short-a.initial-set
recipeId: ela.word-mapping.v1

visualComponents:
  model: [TutorPanel, FocusDisplay, CardWorkspace]
  response: [TutorPanel, CardWorkspace, ChoiceBoard, LessonControls]
masteryRuleRef: ela.phonics.cvc.decode.short-a@1

narration:
  goal:
    messageId: tutor.cvc.goal
    text: "We will touch each sound, slide the sounds together, and read the word."
  modelDirection:
    messageId: tutor.cvc.model-direction
    text: "Watch me read this word."
  guidedDirection:
    messageId: tutor.cvc.guided-direction
    text: "Touch each sound. Then slide them together and choose the word."
  independentDirection:
    messageId: tutor.cvc.independent-direction
    text: "Read the word. Choose the matching picture."
  success:
    messageId: tutor.cvc.success
    text: "You kept the sounds in order and read the word."

examples:
  model:
    - id: cvc-short-a-map-model
      graphemes: [m, a, p]
      phonemeCueIds: [phoneme.m.continuous, phoneme.a.short, phoneme.p.stop]
      word: map
      pictureAssetId: picture.map.v1
      misconceptionTagsByDistractor:
        picture.mat.v1: CONSONANT_CONTRAST_CONFUSION
  guided:
    - id: cvc-short-a-sat-guided
      graphemes: [s, a, t]
      phonemeCueIds: [phoneme.s.continuous, phoneme.a.short, phoneme.t.stop]
      word: sat
      pictureAssetId: picture.sat.v1
    - id: cvc-short-a-mat-guided
      graphemes: [m, a, t]
      phonemeCueIds: [phoneme.m.continuous, phoneme.a.short, phoneme.t.stop]
      word: mat
      pictureAssetId: picture.mat.v1
  independent:
    - id: cvc-short-a-tap-independent
      graphemes: [t, a, p]
      word: tap
      pictureAssetId: picture.tap.v1
    - id: cvc-short-a-pan-independent
      graphemes: [p, a, n]
      word: pan
      pictureAssetId: picture.pan.v1
    - id: cvc-short-a-cat-independent
      graphemes: [c, a, t]
      word: cat
      pictureAssetId: picture.cat.v1
  mastery:
    - id: cvc-short-a-nap-mastery
      graphemes: [n, a, p]
      word: nap
      pictureAssetId: picture.nap.v1
    - id: cvc-short-a-can-mastery
      graphemes: [c, a, n]
      word: can
      pictureAssetId: picture.can.v1
    - id: cvc-short-a-pat-mastery
      graphemes: [p, a, t]
      word: pat
      pictureAssetId: picture.pat.v1

hintLadderId: ela.hints.cvc-decode.v1
remediationMapId: ela.remediation.cvc-short-a.v1
audioRequirements:
  wholeLanguage: MODEL_TTS_WITH_CENTRALIZED_FALLBACK
  targetWordDuringIndependent: FORBIDDEN
  phonemeCueIds:
    - phoneme.m.continuous
    - phoneme.s.continuous
    - phoneme.t.stop
    - phoneme.p.stop
    - phoneme.n.continuous
    - phoneme.k.stop
    - phoneme.a.short
review:
  decodabilityPolicy: STRICT_INITIAL_SET
  allowedGraphemes: [m, s, t, p, n, c, a]
  pronunciationRestrictions:
    c: /k/
  status: PROPOSED_FOR_HUMAN_REVIEW
```

The server selects from purpose-appropriate pools without replacement inside an activity instance and does not send the full pool to the client. A mastery instance uses examples the learner has not just seen in the model or guided instance. The actual Stage 3 mastery count and threshold remain those approved in the Stage 2 skill definition; they are not encoded in this lesson file.

### 17.2 Recipe behavior across activity purposes

| Activity purpose | Recipe steps | Narration and demonstration | Learner interaction | Evidence |
|---|---|---|---|---|
| `INSTRUCTION` | `WELCOME` → `INTRODUCE` → `MODEL` → `COMPLETE` | State the goal; display `map`; play reviewed `/m/`, short `/a/`, `/p/`; slide cards together; then say the whole word | Replay or continue | completion only |
| `GUIDED_PRACTICE` | `GUIDED` → optional `SUPPORTED` → `COMPLETE` | Give one concise direction; feedback names order, missing sounds, or a letter-sound issue | Touch sound cards, slide them, then choose a matching picture | supported/guided events only |
| `INDEPENDENT_PRACTICE` | `INDEPENDENT` trials → `CELEBRATE` → `COMPLETE` | Directions may be narrated; phonemes and whole target word are silent unless help is requested | Read the printed CVC word and choose the matching picture | readiness evidence when no instructional hint was used |
| `MASTERY_CHECK` | `MASTERY` trials → `CELEBRATE` → `COMPLETE` | Neutral directions only; no correctness feedback until the configured checkpoint | Read fresh CVC words and choose matching pictures | server-scored mastery evidence under the Stage 2 rule |

### 17.3 Error, hint, and remediation behavior

- Choosing a picture with the same vowel but a different final consonant maps to `CONSONANT_CONTRAST_CONFUSION`; the tutor says, “Check the last sound,” and `L1_FOCUS` highlights the last card if requested.
- Reversing card order maps to `ORDER_REVERSAL`; the tutor restores the original positions and prompts a left-to-right touch.
- Skipping the vowel maps to `OMITTED_PHONEME`; `L2_CONTRAST` creates three sound slots and replays only the reviewed phoneme cues.
- Guessing without any touch/slide action during guided work maps to `GUESS_WITHOUT_BLEND`; the next guided trial requires ordered touch events before picture choices appear.
- Repeated short-`a` confusion routes to `ela.auditory-contrast.v1`; repeated grapheme confusion routes to `ela.symbol-sound.v1` for the affected letter.
- `L4_MODEL` demonstrates the current word and retires it from learner evidence. The learner returns on a fresh word.

### 17.4 Same recipe, different skill

A future `ela.phonics.cvc.decode.short-i` content definition can use the same `ela.word-mapping.v1` recipe and renderer. It supplies a different skill ID, content scope, reviewed `/i/` cue, allowed graphemes, word/example pools, picture assets, misconception mappings, and review metadata. The recipe stages, component capabilities, pause/resume behavior, evidence transitions, and tutor state machine do not change. This is the intended unit of reuse; short-`i` itself is not part of the initial Stage 3 slice.

## 18. End-to-End Learner Interaction With Evidence

This trace shows a guided short-`a` CVC decoding instance followed later by a fresh independent instance.

| Step | Visible/audible experience | Learner action | Engine response and recorded evidence |
|---|---|---|---|
| 1. Goal | TutorPanel shows and narrates the reviewed goal; progress says “1 of 3” | Learner presses Continue | `MESSAGE_PRESENTED`; no skill evidence |
| 2. Guided item | `sat` appears as three cards. Direction narration is allowed. Phoneme cue buttons are visible because this is guided practice. | Learner touches `/s/`, short `/a/`, `/t/`, slides, then chooses the picture for `mat` | Server scores incorrect and maps the distractor to `CONSONANT_CONTRAST_CONFUSION`; one guided attempt is stored |
| 3. Specific feedback | Tutor says, “The middle sound matches. Check the first sound.” No confetti or failure label appears. | Learner requests a hint | `L1_FOCUS` support is stored; first card receives a static focus outline; this item cannot become independent evidence |
| 4. Supported retry | Same item remains, preserving the recorded support state | Learner touches the first cue again and chooses `sat` | Correct guided/supported attempt is stored with highest hint `L1_FOCUS`; no mastery transition |
| 5. Checkpoint | Tutor acknowledges the observable strategy and offers Continue or Take a break | Learner takes a break | Speech stops; exact recipe/content version, item ID, completed steps, hint, misconception count, and evidence IDs are persisted |
| 6. Resume | The same instance resumes at its completion choice, not at the first item | Learner continues later | No duplicate presentation or attempt event is created |
| 7. Fresh independent item | A later selector decision starts `INDEPENDENT_PRACTICE` with `cat`; only neutral directions are narrated | Learner reads and chooses the cat picture without help | Correct independent-practice evidence is stored. It supports readiness but does not alone mark mastery. |
| 8. Future mastery | When Stage 2 readiness rules permit, a mastery instance uses unseen `nap`, `can`, or `pat` items | Learner responds without instructional help | The server applies the approved skill mastery rule and updates the skill state; the client only displays the returned result |

The distinction is deliberate: audio intrinsic to guided phoneme work is part of that activity's delivery mode, while playing the whole target word during independent decoding would reveal the response and downgrade the item to supported reading/practice.

## 19. Deterministic vs AI Responsibility Table

| Responsibility | Primary ownership class | Permitted AI role | Hard boundary |
|---|---|---|---|
| Skill eligibility and prerequisite traversal | Deterministic runtime | None | AI never makes progression decisions |
| Activity purpose and evidence mode | Curated/static definition plus deterministic runtime | None | AI never decides whether work is independent or mastery evidence |
| Recipe and component sequence | Curated/static recipe plus deterministic runtime | None | Generated text never supplies executable UI/actions |
| Example selection and repeat prevention | Deterministic runtime using scope, history, exclusions, and seed | Build-time AI may propose candidate examples for human review | AI candidates cannot enter a pool without decodability, answer, and human review checks |
| Scoring and mastery | Deterministic runtime domain rules | None | AI never changes correctness, thresholds, or skill state |
| Hints and remediation | Curated/static ladder and mappings plus deterministic runtime | Build-time AI may draft wording for human review | Runtime AI never selects support level or remediation eligibility |
| Core tutor language | Curated/static scripted and parameterized messages | Build-time AI may draft alternate lines for human review | No unreviewed core instruction ships |
| Unexpected learner question | Curated/static fallback | Future runtime AI may return a constrained, moderated rephrasing | No personal advice, diagnosis, profiling, off-scope conversation, or answer-key mutation |
| Whole-language narration | Deterministic runtime of curated text | Model TTS may synthesize the exact reviewed text | TTS cannot alter instructional meaning |
| Phoneme pronunciation | Curated/static reviewed recording | None | AI never generates or improvises runtime phoneme audio |
| Animation | Curated/static cue plus deterministic runtime allowlist | None | No arbitrary code, timing, or focus manipulation |
| Game handoff | Deterministic runtime from curated scope | None | A game cannot expand scope or grant mastery |
| Session checkpoint/resume | Deterministic runtime persistence and idempotency | None | AI never decides what progress to discard |

## 20. Cost Control

The ordinary Stage 3 lesson path makes zero generative-language-model calls. Tutor language is reviewed and versioned. Whole-language speech uses the existing Piper-backed `/api/tts` service, with bounded browser and server caches; reviewed phoneme assets avoid repeated synthesis and pronunciation risk.

Cost and load controls are:

- prewarm only high-frequency short directions and tutor lines;
- deduplicate pending requests in the existing centralized speech helper;
- cap text length, request rate, and cache size;
- cancel stale playback and ignore stale responses after navigation;
- reuse content-hashed reviewed audio across learners;
- batch no child data into TTS requests—only the exact reviewed text;
- keep future live AI behind an explicit server feature flag, per-session call limit, timeout, token cap, structured output, and deterministic fallback;
- measure cache hits, synthesis latency, failures, and calls per activity without logging unnecessary learner content.

A CDN is not required for the first slice. It becomes worth evaluating only when real asset volume, geographic latency, or Railway egress measurements justify it.

## 21. Offline/Degraded Behavior

The current application is not a full offline-first PWA, so this design does not promise unsynchronized mastery or a complete cold-start lesson without the server.

| Failure | Safe degraded behavior |
|---|---|
| Live AI unavailable | No learner-facing loss in Stage 3; future questions receive a reviewed fallback |
| Model TTS unavailable | Centralized browser fallback may read non-phoneme whole language; visible text always remains |
| Required phoneme asset unavailable | Do not synthesize a substitute; block autonomous evidence for that item, offer retry or adult-supported continuation, and log the missing cue |
| Network lost after a step is displayed | Keep the current response visible and preserve its idempotency key; do not claim it is saved or advance evidence until the server confirms persistence |
| Network lost before pause completes | Show “Not saved yet” and Retry; retain the local session reference and in-memory step until navigation is confirmed or the learner deliberately exits |
| Browser reload with server reachable | Restore the authoritative server checkpoint and exact recipe/content versions |
| Browser reload with server unreachable | Show the saved session reference and a retry screen; do not reconstruct mastery state from local storage |
| Animation unsupported or reduced motion requested | Render the final highlighted/static state immediately |
| Game unavailable | Skip the optional handoff and continue the lesson; no progress is lost |

Static recipe code and already-loaded reviewed assets can continue to render while the page remains open, but scoring and authoritative progression require the server. A future offline queue would need encrypted local storage, idempotent event reconciliation, expiration rules, and a separate privacy review; it is deferred.

## 22. Tests

### 22.1 Domain and content validation

- reject duplicate recipe IDs/versions, duplicate step IDs, unsupported component kinds, empty purpose variants, invalid stage/purpose combinations, and missing content slots;
- verify every activity binding references an existing recipe/content/hint/remediation version;
- verify each K short-`a` example stays within the approved grapheme/phoneme scope and `c` maps only to `/k/`;
- verify mastery pools exclude model/guided examples selected in the same learning sequence and contain enough distinct items;
- verify every pronunciation-critical cue exists and has review metadata;
- verify every distractor misconception tag and remediation route is valid;
- verify content definitions contain no executable code or external URLs.

### 22.2 Engine and evidence

- execute each purpose variant through every legal completion path;
- prove `L0_REPLAY` only preserves evidence when the declared replay does not reveal the construct;
- prove `L1`–`L4` cannot produce independent mastery evidence on the current item;
- prove a modeled item is retired and a fresh item is selected;
- prove remediation creates a separate non-mastery activity and returns to a fresh target item;
- prove mastery changes only through the Stage 2 domain rule;
- prove attempt/event IDs are idempotent across retries and resume;
- prove server selection avoids repeats within the configured exclusion window and fails clearly when a pool is insufficient.

### 22.3 Checkpoint and integration

- pause/resume after each step, response, hint, model, remediation entry/exit, and game handoff;
- restore the same recipe/content versions, selected examples, support state, and current step;
- prevent duplicate scoring when the client retries a timed-out submission;
- verify old in-progress instances remain readable after a compatible catalog deployment and incompatible versions receive a purposeful migration/expiry response;
- verify game handoffs cannot expand scope and game results cannot mark mastery.

### 22.4 React, accessibility, speech, and animation

- exhaustively render every discriminated `LessonStepView` kind and reject unknown kinds;
- operate ChoiceBoard and CardWorkspace by pointer and keyboard, including non-drag alternatives;
- verify focus placement after submit, feedback, hint, continue, resume, and errors;
- verify visible tutor text matches the requested narration text;
- verify navigation and replacement prompts stop prior audio;
- verify feature code never invokes browser speech APIs directly;
- verify phoneme cue IDs never fall through to model/browser TTS;
- verify controlled-text help changes the evidence mode before playback;
- verify reduced-motion mode removes movement without losing instructional state;
- verify celebration is milestone-gated and conveys the same status without confetti.

### 22.5 AI and degraded-mode contract tests

- with future live AI disabled, prove every lesson, hint, remediation, and completion path remains functional;
- reject overlong, off-scope, unsafe, malformed, or action-bearing AI responses and use the reviewed fallback;
- verify no personal profile or diagnostic history is placed in an AI request;
- simulate TTS, asset, network, and game failure at each stable boundary and verify no evidence is silently lost or upgraded;
- assert the standard Stage 3 path makes no generative tutor calls and stays within configured TTS limits.

Repository verification after Stage 3 code changes must include `npm test`, `npm run build`, the relevant server Jest tests, and the server build/typecheck command, plus a manual primary-flow check covering `/learning`, narration, pause/resume, one remediation, a mastery-safe item, optional game handoff, and return navigation.

## 23. Stage 3 Integration Plan

Stage 3 must treat this document as a required input alongside the Stage 1 audit and all Stage 2 artifacts. It implements one working vertical slice, not the complete future platform.

### 23.1 Exact implementation subset

1. **Catalog and validation**
   - Add the six recipe families from Section 2 under the Stage 2 curriculum catalog structure.
   - Add versioned content bindings for the approved kindergarten initial letter set, short-`a` word list, print features, controlled sentence `Sam sat.`, and literal comprehension item.
   - Validate recipe references, content slots, decodability, misconception tags, reviewed cue references, unique IDs, and pool sufficiency at startup/test time.

2. **Server lesson application flow**
   - Extend the existing learning application/facade rather than add a parallel API.
   - Select the activity purpose with the Stage 2 lifecycle policy, instantiate its recipe variant deterministically, and keep canonical responses server-side.
   - Add typed submit, hint, checkpoint, resume, remediation, and completion operations with idempotent event IDs.
   - Extend the existing JSON session checkpoint with recipe/content versions, step, selected examples, support state, misconceptions, and evidence IDs.
   - Preserve existing diagnostic and placement behavior while allowing unfinished instructional sessions to resume.

3. **React renderer**
   - Keep `LearningApp` as orchestration and extract the seven components from Section 3 plus a focused lesson-session hook/controller.
   - Render a discriminated server view model; do not expose canonical answers or embed skill decisions in components.
   - Reuse the existing child-friendly visual language, semantic controls, focus treatment, confetti foundation, and Continue-fill behavior under the new milestone/transition rules.

4. **Tutor states**
   - Implement `IDLE`, `SPEAKING`, `POINTING`, `ENCOURAGING`, `GENTLE_CORRECTION`, and `CELEBRATING` as deterministic presentation states.
   - Use reviewed scripted/parameterized messages only.
   - Support an optional static neutral explorer portrait only after provenance/visual review; the panel must work without it.

5. **TTS and audio**
   - Route whole-language narration through `speak`/`stopSpeaking`.
   - Add a centralized, cancellable reviewed-cue resolver for the seven required phonemes; do not call audio/browser speech APIs from feature components.
   - Audit and extract any reusable existing CVC recordings into the neutral curriculum asset catalog; do not import Phaser data into React.
   - Enforce silence or evidence downgrade for assessed controlled text and independent decoding.

6. **Hints, errors, and remediation**
   - Implement `L0_REPLAY`, `L1_FOCUS`, `L2_CONTRAST`, `L3_PARTIAL`, and `L4_MODEL` evidence semantics.
   - Implement the misconception tags and deterministic routes needed by the initial short-`a` slice.
   - Ensure a modeled item is replaced by a fresh item and remediation cannot recursively loop.

7. **Evidence and learner state**
   - Record presentation/completion, support, response, and remediation events distinctly.
   - Apply Stage 2 skill-state and mastery rules only on the server.
   - Add the reviewed game-handoff contract only for a currently available game that can be constrained to the initial content; otherwise render no game offer in the slice.

8. **Required verification**
   - Add the tests in Section 22 that cover the implemented subset.
   - Run client tests/build and relevant server tests/build.
   - Manually verify exact resume, repeated-error remediation, no repeated example within an instance, phoneme audio behavior, controlled-text evidence protection, keyboard operation, reduced motion, and game return when enabled.

### 23.2 Explicitly deferred

- live generative tutor dialogue and open-ended child conversation;
- speech recognition, pronunciation scoring, realtime voice, and lip synchronization;
- AI-selected progression, AI scoring, AI-created canonical content, and runtime AI hints;
- a full animated tutor character or new animation dependency;
- CDN/object-storage migration and durable cross-deployment TTS caching;
- true offline mastery, service-worker lesson queues, and multi-device conflict resolution;
- broad K–2 content migration beyond the approved initial kindergarten vertical slice;
- short-`i` and other future vowel lessons shown only as reuse examples;
- mathematics recipe content, even though the engine boundary remains reusable;
- refactoring unrelated Phaser scenes or replacing all existing game content selection at once.

### 23.3 Required design questions answered

| Question | Decision |
|---|---|
| 1. How does a skill become an interactive lesson? | The graph selects an eligible skill and purpose; its `LearningActivityDefinition` references a versioned recipe/content binding; the server instantiates the matching purpose variant with scope-valid examples; the client renders typed step views; the server records evidence. |
| 2. How many reusable lesson recipes are needed for the first vertical slice? | Six: auditory contrast, symbol-sound, phoneme sequence, word mapping, print feature, and controlled sentence. |
| 3. Which UI components are reusable across many skills? | TutorPanel, ChoiceBoard, CardWorkspace, FocusDisplay, ControlledTextReader, LessonControls, and ProgressCelebration. |
| 4. What tutor behavior is deterministic? | Goal/prompt selection, feedback mapping, hint level, remediation route, tutor presentation state, celebration eligibility, evidence effect, and progression are all driven by reviewed definitions and server rules. |
| 5. What content can AI safely generate? | AI may draft candidate examples, alternate reviewed explanations, encouragement, and hint wording during curriculum authoring; nothing enters runtime catalogs without validation and human review. |
| 6. What should live AI be allowed to do? | In a future optional service, provide a short moderated rephrasing or answer to an unexpected current-skill question within a strict schema; it cannot score, reveal protected answers, choose progression, or alter curriculum. |
| 7. What happens when live AI is unavailable? | The reviewed scripted fallback is used; every core lesson, hint, remediation, checkpoint, and mastery path remains functional. |
| 8. How are isolated phoneme sounds handled accurately? | With manually reviewed, versioned phoneme recordings and explicit pronunciation metadata; ordinary model/browser TTS is never the fallback. |
| 9. How do hints affect mastery evidence? | Neutral non-revealing replay may preserve evidence when declared; every instructional hint records support and prevents the current item from serving as independent mastery evidence; a full model forces a fresh item. |
| 10. How does remediation target prerequisite skills? | Deterministic misconception mappings route to reviewed instruction/guided variants for the affected prerequisite edge, then return to a fresh target item; an LLM does not guess the prerequisite. |
| 11. How do games receive reinforcement content? | Through a short-lived server-issued handoff containing only skill/version, content scope, permitted examples/patterns, difficulty, duration, and return data. Games cannot broaden scope or grant mastery. |
| 12. How do we scale without one video per skill? | A small versioned recipe catalog, seven capability-based components, content-slot bindings, allowlisted animations, reviewed message templates, cached narration, and deterministic instantiation reuse the same teaching patterns across many skills. |

### Stage 2B gate

This artifact is ready for human review against the Stage 1 audit and Stage 2 progression/implementation plan. No Stage 3 implementation should begin until the recipe/component boundary, evidence rules, phoneme-audio policy, resume contract, and exact Stage 3 subset are approved.
