# Stage 2B — Design the Interactive Tutor and Reusable Lesson Engine

## Objective

Design the learner-facing instructional system that makes `/learning` feel engaging, responsive, and tutor-like without requiring a library of prerecorded videos for every concept.

This is a **design stage**.

Do not implement the full tutor or lesson engine yet.

Read first:

```text
00_WORK_ORDER.md
docs/curriculum/K2_ELA_CURRICULUM_GAP_ANALYSIS.md
docs/curriculum/K2_ELA_INSTRUCTIONAL_PROGRESSION.md
docs/curriculum/K2_ELA_STANDARD_COVERAGE_MATRIX.md
docs/curriculum/K2_ELA_IMPLEMENTATION_PLAN.md
```

The output of this stage must become a required input to Stage 3.

---

# Product Requirement

The application should feel closer to a patient interactive tutor than to:

- a worksheet generator;
- a static multiple-choice website;
- a sequence of standards-based quiz questions;
- a passive video library.

The learner should experience a rhythm such as:

```text
Meet the skill
↓
Hear/see a short explanation
↓
Watch an interactive demonstration
↓
Do one together
↓
Try one with a hint available
↓
Try independently
↓
Receive specific feedback
↓
Get remediation if needed
↓
Demonstrate mastery
↓
Celebrate progress
↓
Optionally take an educational game break
```

The application does **not** have the resources to create unique prerecorded instructional videos for every concept.

The architecture must therefore achieve scale through reusable instructional components and structured lesson recipes.

---

# Governing Principle

> **Do not generate thousands of one-off lessons when a small number of high-quality reusable teaching patterns can render thousands of skills.**

The curriculum graph defines **what** should be learned.

The lesson/tutor engine defines **how** it is taught interactively.

---

# Separation of Responsibilities

Design clear boundaries among:

```text
Curriculum Graph
    What skills exist?
    What are the prerequisites?
    What should come next?

Lesson Recipe
    What teaching sequence is appropriate for this type of skill?

Lesson Content
    What examples, words, sentences, manipulatives, prompts, and hints are used?

Lesson Renderer
    How is that recipe presented interactively?

Tutor
    How does the application narrate, encourage, hint, remediate, and react?

Learner Evidence
    What did the learner demonstrate?

Games
    How can a learned/practicing skill be reinforced during a break?
```

Do not collapse all of these responsibilities into question templates.

---

# Required Deliverable

Create:

```text
docs/curriculum/INTERACTIVE_TUTOR_AND_LESSON_ENGINE_DESIGN.md
```

It must contain all sections required below.

---

# 1. Tutor Experience Model

Define the basic learner experience for a lesson.

A reusable lesson lifecycle should support concepts similar to:

```text
INTRODUCE
MODEL
GUIDED_PRACTICE
SUPPORTED_PRACTICE
INDEPENDENT_PRACTICE
MASTERY_CHECK
REMEDIATE
CELEBRATE
COMPLETE
```

Use names appropriate to the codebase.

Not every lesson needs every stage.

A simple skill may be:

```text
brief instruction
→ 2 guided examples
→ 3 independent examples
→ mastery check
```

A difficult concept may require more modeling and remediation.

The architecture must support both.

---

# 2. Reusable Lesson Recipes

Design a **lesson recipe** abstraction.

A lesson recipe is a reusable pedagogical sequence capable of teaching many related skills.

Potential examples:

```text
introduce_letter
introduce_letter_sound
auditory_sound_discrimination
introduce_short_vowel
blend_phonemes
segment_word
build_word
decode_word
contrast_two_patterns
highlight_spelling_pattern
read_decodable_sentence
read_decodable_passage
listening_comprehension
reading_comprehension
sort_examples
number_line_demo
manipulative_demo
```

This task focuses on K–2 ELA, but do not make the architecture impossible to reuse later for math.

A recipe should be data-driven where practical.

Conceptually:

```yaml
recipe: introduce_phonics_pattern

stages:
  - activate_prior_knowledge
  - explicit_instruction
  - model_examples
  - auditory_discrimination
  - guided_practice
  - independent_practice
  - mastery_check
```

Do not copy this mechanically.

Design an appropriate model for the repository.

---

# 3. Reusable Interactive Components

Identify the minimum set of reusable learner-facing components needed for the Kindergarten vertical slice and likely K–2 expansion.

Possible components include:

```text
TutorMessage
NarratedPrompt
LetterCard
SoundButton
SoundChoice
LetterSoundDemo
SoundBlender
WordBuilder
WordSegmenter
PatternHighlighter
WordSorter
ReadAlong
DecodableSentence
StoryReader
MultipleChoice
ImageChoice
SequenceActivity
ProgressCelebration
HintPanel
```

For each proposed component identify:

- educational purpose;
- input/configuration;
- output/evidence;
- accessibility behavior;
- TTS/audio requirements;
- whether it is deterministic;
- whether it needs animation;
- likely reuse across skills.

Do not build dozens of components merely because they sound useful.

Find the smallest reusable component set with high instructional coverage.

---

# 4. Tutor Character / Presentation Layer

Design a lightweight tutor-presence system.

The application does not require full character animation.

A tutor/avatar could have a small reusable state set such as:

```text
idle
speaking
thinking
encouraging
celebrating
pointing
gentle-correction
```

Determine whether the existing application already has an appropriate character or presentation style.

The tutor should:

- explain concepts;
- narrate examples;
- give specific hints;
- react to mistakes;
- celebrate meaningful progress;
- invite retry;
- offer a game break where appropriate.

Avoid excessive visual stimulation.

Engagement should come primarily from:

- interaction;
- progress;
- competence;
- responsiveness;
- short activities;
- meaningful encouragement;
- appropriate novelty.

Do not design a slot-machine reward system.

---

# 5. Tutor Dialogue Model

Separate tutor dialogue into categories.

For example:

```text
SCRIPTED_STATIC
PARAMETERIZED
PREGENERATED_VARIANTS
LIVE_AI
```

## Scripted / Parameterized

Use for high-confidence educational language such as:

```text
"This letter is A."
"Listen to the short A sound."
"Let's blend these sounds."
```

Allow variables:

```text
"Listen to the middle sound in {word}."
```

## Pregenerated Variants

AI may generate several reviewed variants at curriculum-build time, such as:

- encouragement;
- alternate explanations;
- hints;
- analogies;
- worked examples.

These can be stored and reused.

## Live AI

Reserve runtime AI for cases where genuine flexibility adds value.

Examples:

- learner asks an unexpected question;
- learner repeatedly misunderstands a concept;
- parent requests an alternate explanation;
- tutor needs to rephrase within strict curriculum context.

Do **not** make live AI the authoritative source of:

- correct answers;
- mastery rules;
- curriculum sequence;
- phonics constraints;
- standards mappings.

Those should remain deterministic.

---

# 6. AI Safety and Instructional Boundaries

The tutor may serve young children.

Design live-AI calls with strict context boundaries.

A live tutor request should receive only information required for the current interaction, such as:

```text
learner grade band
current skill
known prerequisite skills
current question/activity
correct answer
student response
known misconception
allowed vocabulary
instructional objective
```

Avoid giving the model authority to invent curriculum progression.

Specify that tutor responses should:

- remain age appropriate;
- be concise;
- avoid revealing answers immediately;
- prefer hints and guided reasoning;
- not introduce advanced concepts unnecessarily;
- avoid claiming mastery;
- avoid contradicting deterministic curriculum rules.

Document where moderation or output constraints should exist.

---

# 7. TTS / Narration Strategy

Design a scalable voice strategy.

Do not require expensive realtime voice for normal instruction.

Prefer a tiered model:

## Tier 1 — Static/Cached Narration

Generate once and cache common phrases such as:

```text
"Listen carefully."
"Try this one."
"Great work."
"Let's sound it out."
```

## Tier 2 — Parameterized Curriculum Narration

Generate/cache speech for skill-specific content such as:

```text
"The word is map."
"Listen: /m/ /ă/ /p/."
```

Where appropriate, generate these assets during curriculum build/seed operations rather than repeatedly at runtime.

## Tier 3 — Dynamic TTS

Use runtime TTS only when the tutor produces genuinely dynamic text.

## Tier 4 — Future Conversational Voice

Treat full realtime spoken conversation as a later optional capability, not a dependency of the initial curriculum engine.

---

# 8. Phoneme Audio Caveat

Normal TTS systems may not reliably pronounce isolated phonemes or slow blends exactly as needed for phonics instruction.

Explicitly design around this.

Consider:

- curated phoneme audio assets;
- generated audio that is manually validated;
- phoneme-specific audio IDs;
- controlled concatenation only if it sounds educationally valid;
- separate "sound" and "word pronunciation" assets.

Do not assume ordinary TTS reading `/ă/` will produce pedagogically correct phoneme audio.

This issue must be represented in the design.

---

# 9. Narration Cache / Asset Model

Design how narration/audio is identified and cached.

Possible conceptual keys:

```text
voice
locale
contentVersion
text
pronunciationMode
speed
```

Phoneme assets may require their own explicit IDs.

The application should not regenerate identical common narration on every learner session.

Document:

- storage location;
- CDN/static serving strategy if relevant;
- cache invalidation;
- local development behavior;
- testing behavior.

Do not implement infrastructure that the repository cannot currently support.

---

# 10. Interactive Animation Strategy

Avoid unique animations per lesson.

Design reusable animations such as:

- highlight;
- pulse;
- bounce;
- slide together;
- separate;
- reveal;
- point;
- trace;
- drag;
- snap;
- success state.

Example:

```text
C       A       T

/c/    /ă/    /t/

letters slide together

CAT
```

The animation engine should be driven by lesson/component state.

Do not make curriculum data contain arbitrary imperative animation code.

---

# 11. Specific Error Feedback

The tutor should respond to **why** an answer is wrong where the system can know that deterministically.

Bad feedback:

```text
Incorrect.
```

Better:

```text
"You chose I. Listen again to the middle sound in map."
```

For a short-vowel activity, structured metadata might know:

```text
targetSound = short-a
selectedSound = short-i
errorType = vowel-confusion
```

Then remediation can contrast the sounds.

Design an error/misconception model sufficient for the vertical slice.

Do not attempt to model every possible misconception in K–12.

---

# 12. Hint Ladder

Design reusable escalating hints.

Example:

```text
Attempt 1:
"Listen to the middle sound again."

Attempt 2:
Play word slowly and emphasize target sound.

Attempt 3:
Contrast two candidate sounds.

Attempt 4:
Model the answer and immediately give a fresh example.
```

Important:

A fully revealed answer should generally not count as independent mastery evidence.

Specify how hints affect evidence.

---

# 13. Remediation Recipes

Design what happens after repeated difficulty.

The system should be able to move from:

```text
independent practice
```

back to:

```text
guided practice
```

or:

```text
prerequisite review
```

without treating this as failure.

Examples:

```text
short-a errors
→ auditory short-a discrimination

CVC blending errors
→ return to phoneme blending

word reading error
→ segment sounds and rebuild word
```

This should be driven by known curriculum relationships rather than an LLM guessing what prerequisite to teach.

---

# 14. Engagement Without Overstimulation

Design engagement around:

- visible progress;
- competence;
- learner choice where appropriate;
- short lesson chunks;
- interaction/manipulation;
- tutor personality;
- meaningful celebration;
- occasional game breaks.

Avoid:

- constant confetti;
- random prizes for every tap;
- excessive animations;
- punitive failure states;
- shame-based language;
- public comparison;
- unnecessarily long sessions.

The learner should feel:

> "I am learning how to do this."

not merely:

> "I am collecting rewards."

---

# 15. Session Rhythm

Design a child-appropriate session rhythm.

Conceptually:

```text
5–10 minutes curriculum
↓
skill checkpoint
↓
optional short educational game break
↓
resume curriculum
```

Do not hardcode this exact duration if the current product model has better session controls.

The system should support breaks without losing curriculum state.

---

# 16. Game Handoff Contract

Games should receive a compact curriculum reinforcement context.

Conceptually:

```text
skillId
targetPatterns
allowedWords
difficulty
knownPrerequisites
```

Example:

```text
Current skill:
short-a CVC decoding

Game receives eligible content:
cat
map
sat
ham
```

The game should not independently decide the child's curriculum level.

Design the interface, but do not implement game changes during this stage.

---

# 17. Lesson Definition Example

Provide at least one complete conceptual lesson definition for a Kindergarten short-vowel/CVC skill.

The document should show how data could describe:

```text
target skill
prerequisites
recipe
narration
visual component
worked examples
guided examples
independent examples
hints
error types
remediation
mastery check
audio requirements
```

Then show how the same recipe could render a second skill using different content.

The purpose is to prove reuse.

---

# 18. Example Learner Interaction

Write at least one end-to-end interaction showing tutor behavior.

Example conceptually:

```text
Tutor:
"Today we're listening for the short A sound."

[plays short-a]

Tutor:
"Listen to map."

[plays MAP]

Tutor:
"Which sound do you hear in the middle?"

Learner selects short-i.

Tutor:
"That was the I sound. Listen again."

[contrasts /ă/ and /ĭ/]

Tutor:
"Which one do you hear in map?"

Learner selects short-a.

Tutor:
"Yes! Map has the short A sound."
```

Explain what evidence is and is not recorded at each point.

---

# 19. Deterministic vs AI-Generated Content

Create a clear table specifying which responsibilities should be:

```text
deterministic runtime
curated/static
AI-generated at build time
AI-generated at runtime
```

Examples:

**Deterministic**
- correct answer
- prerequisite selection
- mastery thresholds
- allowed phonics patterns

**Build-time AI candidate generation**
- alternate examples
- encouragement variants
- draft hints

**Runtime AI**
- optional unexpected learner questions
- alternate explanation within current skill constraints

This boundary is critical.

---

# 20. Cost-Control Strategy

The architecture must work on a modest budget.

Specify how to reduce ongoing costs through:

- reusable components;
- cached narration;
- generated-once curriculum assets;
- deterministic remediation;
- limited runtime AI;
- optional AI features;
- provider abstraction.

Do not make every learner interaction require a paid AI request.

The core curriculum must continue functioning if live AI is temporarily unavailable.

---

# 21. Offline / Degraded Behavior

Design graceful degradation.

If live AI is unavailable:

- scripted instruction still works;
- cached narration still works where available;
- deterministic hints still work;
- lessons remain completable;
- mastery remains valid.

If TTS is unavailable:

- text remains visible;
- prerecorded/cached phoneme assets remain available where possible;
- adult/parent assistance can still operate the lesson.

Document reasonable fallback behavior.

---

# 22. Testing Strategy

Design tests for:

## Lesson Recipe

Given:

```text
skill + recipe + content
```

Expected:

```text
valid ordered lesson stages
```

## Hint Evidence

Given a learner who receives a full-answer hint:

Expected:

```text
attempt is not treated as independent mastery evidence
```

## Remediation

Given repeated short-a confusion:

Expected:

```text
system routes to the configured remediation/prerequisite activity
```

## Audio

Given repeated playback:

Expected:

```text
no duplicate mastery evidence
```

## Decodability

Given a CVC-only lesson:

Expected:

```text
renderer/content selection cannot introduce prohibited spelling patterns
```

## AI Failure

Given live tutor service unavailable:

Expected:

```text
core lesson remains functional
```

## Tutor Boundaries

Given a runtime tutor request:

Expected:

```text
model cannot change answer key, mastery state, or curriculum prerequisites
```

---

# 23. Stage 3 Integration Plan

End the design document with explicit instructions for Stage 3.

Specify:

1. which lesson recipes Stage 3 must implement;
2. which reusable UI components Stage 3 must implement;
3. which tutor states Stage 3 must support;
4. minimum TTS/audio behavior;
5. minimum hint/remediation behavior;
6. evidence rules;
7. which features are intentionally deferred.

Keep the vertical slice small enough to implement and test thoroughly.

---

# Required Design Questions

The final design must answer:

1. How does a skill become an interactive lesson?
2. How many reusable lesson recipes are needed for the first vertical slice?
3. Which UI components are reusable across many skills?
4. What tutor behavior is deterministic?
5. What content can AI safely generate?
6. What should live AI be allowed to do?
7. What happens when live AI is unavailable?
8. How are isolated phoneme sounds handled accurately?
9. How do hints affect mastery evidence?
10. How does remediation target prerequisite skills?
11. How do games receive reinforcement content?
12. How do we scale to hundreds/thousands of skills without hundreds/thousands of videos?

---

# Guardrails

Do not:

- implement the full lesson engine;
- build a realtime voice assistant;
- couple the curriculum to one AI provider;
- make an LLM determine correctness;
- make an LLM determine mastery;
- make an LLM choose arbitrary curriculum progression;
- generate huge amounts of production content;
- add unnecessary gamification;
- require a unique animation for every skill;
- assume normal TTS can pronounce isolated phonemes correctly.

Small technical prototypes are acceptable only if they resolve a concrete design uncertainty.

---

# Definition of Done

This stage is complete only when:

- [ ] `INTERACTIVE_TUTOR_AND_LESSON_ENGINE_DESIGN.md` exists;
- [ ] lesson recipes are defined;
- [ ] reusable interactive components are identified;
- [ ] tutor lifecycle/states are defined;
- [ ] tutor dialogue categories are defined;
- [ ] deterministic vs AI responsibility is explicit;
- [ ] TTS/narration strategy is defined;
- [ ] isolated phoneme audio has a valid strategy;
- [ ] caching/cost control is addressed;
- [ ] hint ladders are designed;
- [ ] remediation behavior is designed;
- [ ] hint/evidence relationships are defined;
- [ ] game handoff is designed;
- [ ] offline/degraded behavior is defined;
- [ ] testing strategy exists;
- [ ] Stage 3 has a concrete tutor/lesson implementation subset.

Stop after the design artifact is complete.

Do not begin Stage 3 implementation automatically.
