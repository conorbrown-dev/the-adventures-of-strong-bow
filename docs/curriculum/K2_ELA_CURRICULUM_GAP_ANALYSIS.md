# K–2 ELA Curriculum Gap Analysis

Stage 1 audit only. Repository state inspected: `16c700af4203efab4dd909b6d76d6eda4fc9dbb8` (2026-08-25). No production curriculum, database, or learner data was changed for this audit.

## 1. Executive summary

The central question is answered **yes**: the live `/learning` practice path currently behaves primarily as:

```text
standard
→ question template
→ seeded question instance
→ practice response
```

It is a standards-aligned question system, not yet a coherent K–2 ELA instructional program. The repository contains useful pieces of a future curriculum system—a lesson-plan schema, explicit lesson phases, durable attempts and sessions, mastery/review infrastructure, diagnostics, audio, and accessible question rendering—but the only reviewed production lesson plan is Kindergarten math. There is no reviewed ELA lesson sequence. In ELA practice, a question plus an optional generic hint substitutes for explicit instruction, modeling, and guided practice.

The immediate Kindergarten issue is verified. A new ELA practice session is limited to the first four unmastered foundational-reading standard IDs after a hard-coded domain/code sort: `K.RF.1.a`, `K.RF.1.b`, `K.RF.1.c`, and `K.RF.1.d`. One eligible first item is the book-title question whose choices are variations of “on the cover,” “under the bed,” and “inside a shoe.” The session then chooses pseudo-randomly among templates in that four-standard window. This is predictable in software terms but is not an authored learn-to-read progression.

The catalog has more foundational-literacy content than the motivating example suggests, including generated letter recognition, case classification, rhyme, and phoneme-position items. However, coverage is uneven and mostly assessment-like:

- The raw JSON catalog contributes 14 independently scored Kindergarten ELA templates across only three standards (`K.RF.1.d`, `K.RF.2.a`, and `K.RF.2.d`).
- TypeScript adds 42 independently scored Common Core Kindergarten ELA templates, generally one per remaining independently assessable standard, plus 19 adult-scored Common Core activities.
- Oklahoma's 60 Kindergarten ELA objectives are present, but each maps to a generic adult-observed constructed-response activity generated from the standard statement. They do not form the autonomous practice course.
- Thus the live Kindergarten ELA practice pool has 56 templates across 45 Common Core standards, while the remaining Common Core and Oklahoma coverage is routed to separate adult-scored work.
- The catalog contains one passage, for Grade 2, and no Kindergarten decodable passage bank.

The answer to the product self-review question is **no**: a five-year-old who cannot read could not reliably learn to read through `/learning` without first needing to read. Prompt audio is available only when the learner activates the replay control, ordinary answer choices are not narrated, several tasks require reading sentences or words to answer, and the system does not track which grapheme-phoneme patterns have been taught before presenting text. Comprehension items labeled “Read:” become listening-comprehension items when replayed through TTS, yet the attempt is stored under the same reading standard with no modality distinction.

A second high-risk behavior compounds the sequence problem. Ordinary practice evidence never promotes a mastery record to `mastered`: `recalculateMastery` returns `practicing` even when its evidence threshold is met. The live selector excludes only `mastered` standards. Consequently, ordinary practice alone cannot move a learner beyond the initial standard window; verified mastery currently comes through proctored checks or sufficient adult observations. The existing tests explicitly expect the threshold result to remain `practicing`.

Stage 2 should preserve the sound technical infrastructure while introducing an instructional layer below standards, an explicit prerequisite-driven literacy progression, and modality-aware evidence. This report intentionally stops short of defining that design.

## 2. Current architecture

### Standards and mappings

- `data/curriculum/generated/common-core-k5-standards.json` is an immutable, manifest-validated set of 695 Common Core K–5 standards. Kindergarten ELA has 72 active records, 64 of which are assessable leaves. All inspected Kindergarten ELA `prerequisiteIds` arrays are empty.
- `server/src/curriculum/data/oklahoma-ela-standards.ts` separately defines 183 Oklahoma K–2 ELA objectives: 60 Kindergarten, 62 Grade 1, and 61 Grade 2.
- `server/src/curriculum/infrastructure/learning-standards.ts` concatenates Common Core and Oklahoma data. It does not map equivalent standards to each other or unify them into instructional progressions.
- Prisma has a `CurriculumStandard` persistence model, but the live content loader reads the vendored/static sources.

### Content catalog and question model

- `data/curriculum/content/k2-catalog.json` is the persisted base catalog.
- `server/src/curriculum/infrastructure/k2-content-catalog.ts` loads that JSON and appends TypeScript-defined template arrays at runtime. Catalog rows have one `standardId`, one `generatorKind`, a response type, modality flags, review status, and provenance.
- `catalogTemplateToQuestionTemplate` in `k2-review-packet.ts` converts every row into a `QuestionTemplate` with one `primaryStandardId`, no supporting standards, difficulty band 1, `standaloneLearning` as the game mode, and `requiresReading: false`.
- `server/src/curriculum/application/question-generator.ts` is a large generator switch. Generic generator kinds produce letter/rhyme/sound variation; the `kindergartenEla` branch stores a fixed base item per standard and selects between that and usually one additional variant.
- Generated `QuestionInstance` objects expose prompt, interaction, explanation, accessibility text, and provenance. The canonical answer is removed before API delivery.

### Instruction and lesson plans

- `server/src/curriculum/domain/lesson-plan.ts` models multi-day lessons with warm-up, explicit model, guided practice, independent practice, extension, reteach, and mastery evidence.
- `lesson-plan-catalog.ts` validates standards, reviewed practice-template references, accessibility, provenance, content hashes, and review status.
- `data/curriculum/content/lesson-plans/` contains exactly one reviewed production plan: `k.math.counting-and-quantities`, a five-day Kindergarten math sequence for three counting standards.
- The lesson-plan API and React lesson renderer are reusable, but no K–2 ELA plan is currently returned because no reviewed ELA plan exists.

### Live learning orchestration

- `LearningController` exposes authenticated start, answer, next, restore, adult-score, progress, and lesson-plan endpoints under `/api/curriculum/learning`.
- `LearningFacadeService` validates the catalog, filters by subject/grade/review status and adult/non-adult mode, selects a template pool, generates instances, evaluates answers, records attempts, checkpoints sessions, and returns the next item.
- A separate `question-selection.ts` supports active learning targets and reviewed prerequisite gaps, and `session-planner.ts` avoids recent templates. These are exercised by domain/CLI tests but are not called by the live facade.
- The live practice facade instead calls `selectNextLearningTemplates` from `curriculum-sequence.ts`.

### UI and audio

- `src/learning/LearningApp.tsx` renders the dashboard, lesson plan, question types, feedback, progress, and assessment resume UI.
- A question screen presents a visible prompt, replay button, optional generic hint, answer controls, answer check, explanation, and continuation.
- `src/quiz/speech.ts` correctly centralizes model-backed TTS through `POST /api/tts`, with browser speech as a fallback.
- The prompt is not automatically spoken. The learner must activate “Replay question.” Ordinary word/sentence answer buttons have no TTS behavior. Only options recognized as short phoneme labels receive focus/hover narration.

### Persistence

- `CurriculumAttemptEvent` stores immutable, idempotent-per-learner/session/question/purpose attempts.
- `CurriculumLearningSession` stores the seed, position, current instance, template IDs, submitted IDs, diagnostic state/fingerprints, and status. The facade can restore after process restart.
- `CurriculumMasteryRecord` stores one state per learner and standard plus review scheduling.
- `CurriculumLearningTarget`, `CurriculumPrerequisiteLink`, and `CurriculumDiagnosticPlacement` exist.
- Diagnostic completion saves active learning targets, but live practice does not read those targets or prerequisite links.

## 3. Current learner-flow diagram

```text
Student profile
  grade/curriculum level + selected subject
            │
            ▼
POST /curriculum/learning/sessions
            │
            ▼
validate catalog → combine JSON + TS template arrays
            │
            ▼
filter reviewed templates by grade, subject, and mode
            │
            ├── diagnostic/placement → diagnostic blueprint and probe selector
            ├── adult scored → first sortable unmastered standard
            └── practice → first four sortable unmastered standards
                                  │
                                  ▼
                       seeded pseudo-random template
                                  │
                                  ▼
                    generate QuestionInstance
                                  │
                                  ▼
API removes canonical answer → React question UI
                                  │
                       learner selects/submits answer
                                  │
                                  ▼
POST /sessions/:id/answers → evaluateAnswer
                                  │
                  ┌───────────────┴────────────────┐
                  ▼                                ▼
      persist attempt + recalculate       checkpoint diagnostic/session
      standard-level mastery                      │
                  │                                │
                  └───────────────┬────────────────┘
                                  ▼
                feedback explanation + Continue/retry
                                  │
                                  ▼
POST /sessions/:id/next
                                  │
                  retry same template if incorrect;
                  otherwise seeded selection from the
                  session pool excluding only the last template
```

This trace is implemented across `learning-facade.service.ts`, `curriculum-sequence.ts`, `question-generator.ts`, `learning.controller.ts`, `LearningApp.tsx`, `learningApplication.ts`, and `prisma-progress.repository.ts`.

## 4. Current content-generation model

There are two materially different Kindergarten self-scored generation strategies:

1. **Small reusable generators.** The raw catalog's 14 ELA templates use `letterIdentification`, `matchUpperLowerLetters`, `rhymeChoice`, `rhymeOddOne`, `cvcMedialVowel`, and `cvcSound`. These vary over 26 letters, five hard-coded word families, or five hard-coded CVC words. The saved review packet reports 179–993 effective generated instances per template across 1,000 seeds, largely because of target/choice ordering combinations.
2. **One standard, one fixed item pair.** The 42 `kindergartenEla` templates each map one standard to one base multiple-choice object in `question-generator.ts` and usually one additional object in a variants file. Seeds mostly choose between those two items and shuffle choices. This creates superficial repeatability without an instructional item bank, controlled difficulty, or a taught-pattern scope.

Adult-scored Common Core templates contain one fixed activity per standard. All Oklahoma ELA standards use a still more generic generator: it embeds the standard statement in “With an adult…” directions and suggests broad materials. This is a standards-coverage mechanism, not authored curriculum.

Every converted catalog template is assigned difficulty band 1 and `seedVariation: true`. No ELA generator receives a learner's taught letter set, sound set, decodability scope, error pattern, or instructional phase. The five CVC words in the standalone generator are `cat`, `bed`, `pig`, `hop`, and `sun`; a much richer CVC/audio asset catalog exists under `src/game/data/cvcWords.ts`, but it is used by the fossil-dig game and is not reused by `/learning`.

The review/validation system checks structure, provenance, review metadata, accessibility fields, deterministic generation, instance uniqueness, and answer-position distribution. It does not programmatically verify that distractors are plausible, that text is decodable from prior instruction, that a prompt isolates the mapped construct, or that generated variety is pedagogically meaningful.

## 5. Current sequencing model

`curriculum-sequence.ts` defines a hard-coded ELA domain order:

```text
RF → 2 → 1 → 3 → L → 4 → RI → RL → 5 → W → SL → 6 → 7 → 8
```

It then sorts by `primaryStandardId` and template ID, takes the first four distinct unmastered standards, and returns every template mapped to those standards. This intermixes Common Core domain codes (`RF`, `L`, `RI`, `RL`, `W`, `SL`) and numeric Oklahoma domain codes. It is a code-order heuristic, not a reviewed educational priority.

For a new Kindergarten ELA learner, the first live practice window is:

```text
K.RF.1.a → K.RF.1.b → K.RF.1.c → K.RF.1.d
```

The pool contains one template each for the first three standards and five templates for `K.RF.1.d`, so the first activity is a seeded choice from eight templates. That is why a print-concepts/book-title question can appear before rhyme, phoneme awareness, or letter-sound instruction.

Within a ten-question practice session, `next()` chooses pseudo-randomly from the same pool, excluding only the immediately previous template. It does not maintain a planned no-repeat sequence, teach before practice, respond to error type, or ensure balanced exposure. An incorrect answer schedules an immediate new instance from the same template.

The standards data offers no usable Kindergarten prerequisite graph: all 72 active Common Core K ELA records have empty `prerequisiteIds`. The Prisma prerequisite table has a read adapter, but no repository seeding or authoring path was found. The live facade does not query it. Diagnostic learning targets are persisted but likewise not consumed by live practice.

Ordinary practice cannot currently complete this progression. `recalculateMastery` moves attempts from `notStarted` to `learning` and then `practicing`; even when all configured evidence thresholds are met, it returns `practicing`. Only `verifyProctoredMastery`, successful review of already mastered work, or the adult-observation route produces `mastered`. Since the sequence removes only `mastered` standards, normal practice remains in its initial four-standard window indefinitely.

### Instructional-purpose separation

| Purpose | Distinct in the model/live flow? | Current behavior |
| --- | --- | --- |
| Explicit instruction | Model only, absent for ELA | Lesson plans support it, but no reviewed ELA lesson is available. |
| Worked examples | No in ELA practice | No learner-facing worked-example phase; explanations appear only after answering. |
| Guided practice | Model only, absent for ELA | Lesson plans support it, but question sessions do not. |
| Independent practice | Yes | Default ELA activity is a scored question session. |
| Mastery check | Partly | Proctored mode is distinct; ordinary practice records evidence but cannot award mastery. |
| Diagnostic probes | Yes | Adaptive diagnostic/placement state is distinct and excluded from ordinary mastery evidence. |
| Review | Yes | Due-review state/purpose and spaced intervals exist, but depend on prior verified mastery. |
| Game reinforcement | Separate product route | Phaser quiz/CVC game content is separate and does not drive `/learning`. |

## 6. Foundational-literacy coverage table

These ratings describe the **current Kindergarten `/learning` curriculum**, not whether a standards row exists. “Partially represented” means usable practice/assessment exists but lacks breadth, instruction, or progression. “Represented only indirectly” means the skill appears only inside a broader/fixed/generic adult task or as a side effect of another activity.

| Foundational-literacy area | Classification | Repository evidence and limitation |
| --- | --- | --- |
| Oral-language activities | partially represented | Common Core `K.SL.*` and Oklahoma `K.1.*` adult-scored tasks exist, but they are single observations, not sequenced oral-language instruction. |
| Rhyme | partially represented | Five reviewed generated templates use five word families. They provide repeated selection practice, but no explicit model, oral production progression, or image semantics. |
| Syllables | represented only indirectly | Oklahoma `K.2.PA.4` names count/segment/blend syllables, but is delivered as a generic adult-observed standard prompt; no self-scored syllable activity exists. |
| Onset/rime | represented only indirectly | `K.RF.2.c` is labeled blending/segmenting, but its two fixed items ask learners to blend individual phoneme strings; Oklahoma `K.2.PA.5` is generic adult-observed. |
| Phoneme isolation | partially represented | Generated initial, medial-vowel, and final CVC sound items exist, but use only five CVC words and no taught sound sequence. |
| Phoneme blending | partially represented | Two fixed `K.RF.2.c` items and two `K.RF.3.c` items ask for blends/decoded words; no explicit oral blending progression. |
| Phoneme segmentation | represented only indirectly | The mapped `K.RF.2.c` items do not require the learner to segment a word; Oklahoma `K.2.PA.7` is a generic adult observation. |
| Phoneme manipulation | partially represented | `K.RF.2.e` has two fixed first-sound substitution questions; there is no systematic add/delete/substitute progression. |
| Uppercase recognition | partially represented | `letterIdentification` samples all 26 uppercase letters and classification shows uppercase forms, but the system assesses without teaching them. |
| Lowercase recognition | partially represented | Equivalent generated lowercase coverage exists, again without instruction or sequence. |
| Uppercase/lowercase matching | partially represented | Templates are named upper-to-lower/lower-to-upper, but their configured `classification` interaction sorts letters by case rather than matching each pair. The generator supports actual matching, but no current template uses that response type. |
| Letter names | partially represented | Upper/lower letter-identification templates vary across the alphabet; no ordered introduction, confusion-set plan, or mastery below `K.RF.1.d`. |
| Consonant sounds | partially represented | `K.RF.3.a` and `K.RF.3.b` each have only a base and one variant (for example `s` and `m`); no comprehensive consonant-sound bank or sequence. |
| Vowel recognition | represented only indirectly | Vowel letters occur as answer labels in the five-word medial-vowel generator, but there is no explicit vowel-recognition skill. |
| Short vowel sounds | partially represented | `cvcMedialVowel` covers `a/e/i/o/u` through five fixed CVC exemplars, but does not explicitly teach or contrast the sounds. |
| Medial vowel discrimination | partially represented | A generated three-choice middle-vowel activity exists, limited to the same five CVC words and no auditory minimal-pair progression. |
| CVC blending | partially represented | Fixed `K.RF.2.c` and `K.RF.3.c` choices include CVC blending, but there is no cumulative word bank or scaffold from continuous blending to independent decoding. |
| CVC segmentation | represented only indirectly | Generic adult Oklahoma activity can observe it; no autonomous task records a segmented response. |
| CVC decoding | partially represented | Two fixed `K.RF.3.c` multiple-choice items ask learners to identify `pig` or `sun`; answer choices themselves must be read and patterns are not pre-taught. |
| CVC encoding/spelling | partially represented | `K.L.2.c` has two fixed multiple-choice spellings (`cat`/`map`); Oklahoma `K.2.SE.*` is generic adult-observed. No constructed encoding sequence exists. |
| Word families | represented only indirectly | Five orthographic families power rhyme generation, but the activity targets oral rhyme and never teaches the shared spelling pattern. |
| Digraphs | missing | No Kindergarten self-scored or specifically authored adult item teaches digraphs; they first appear in Grade 1 content. |
| Consonant blends | missing | No Kindergarten content progression was found; they appear in later-grade standards/tasks. |
| Long vs short vowel behavior | represented only indirectly | Oklahoma `K.2.PWS.3` mentions both in one generic adult observation. No Kindergarten contrast activity exists. |
| Final/silent-e | missing | A `silentEDecode` generator exists only on a Grade 1 template and is not in Kindergarten practice. |
| Open syllables | missing | No Kindergarten activity or generator found. |
| Closed syllables | missing | CVC items instantiate closed syllables but do not name, contrast, or systematically teach the pattern. |
| Vowel teams | missing | No Kindergarten activity or progression found. |
| R-controlled vowels | missing | No Kindergarten activity or progression found. |
| High-frequency words | partially represented | `K.RF.3.d` has two fixed recognition-about-recognition questions (for example choosing `is` over `xylophone`), not a taught/read word bank. |
| Decodable sentences | represented only indirectly | Adult `K.RF.4` asks for one fixed sentence (“The cat sat on the soft mat”), but no decodability metadata connects it to taught patterns. |
| Decodable connected text | missing | The catalog's only passage is a 32-word Grade 2 passage. No Kindergarten controlled connected-text bank was found. |
| Fluency | represented only indirectly | One adult-observed fixed sentence and generic Oklahoma fluency objectives exist; no accuracy/rate/expression evidence model or cumulative text set. |
| Vocabulary | partially represented | Many `K.L.4–6` fixed multiple-choice items and generic Oklahoma oral tasks exist, but they are isolated checks rather than repeated instruction in meaningful text/oral contexts. |
| Listening comprehension | represented only indirectly | Adult `K.RI.10`, `K.RL.10`, `K.SL.*`, and Oklahoma read-aloud objectives involve listening, but the question/evidence model has no listening-comprehension construct. |
| Independent reading comprehension | cannot determine | `K.RI.*`/`K.RL.*` multiple-choice items are labeled reading, but the same visible text can be narrated by TTS and delivery modality is not recorded; the stored result cannot establish independent reading. |

No area is classified “well represented” because Stage 1 found no Kindergarten literacy area with a complete combination of explicit instruction, controlled guided practice, adequate independent variation, prerequisite ordering, and valid mastery evidence. Several areas have useful assessment components worth reusing.

## 7. Hidden-reading-dependency findings

The catalog conversion sets `requiresReading: false` on every template, but the live UI and content do not support that blanket claim.

| Representative item | Hidden prerequisite | Does current TTS resolve it? | Construct problem |
| --- | --- | --- | --- |
| “Where is the title of a book usually found?” with “on the cover / under the bed / inside a shoe” | Must read three multiword choices or use speech recognition to say an answer | No. Replay narrates only the prompt; ordinary choices have no audio control. | Can be answered by implausible-choice elimination; does not demonstrate print handling or title location. |
| “Which is a complete sentence?” with three written strings | Must decode and compare full strings, capitalization, order, and meaning | No. TTS narrating all choices would also erase some visual print evidence; the current UI does not narrate them anyway. | Tests decoding/syntax/print simultaneously and may exceed the mapped print-concept target. |
| “Which sentence starts with a capital letter?” | Must visually discriminate case and read enough of each sentence to operate the control | Prompt audio helps only with directions; choices remain visual text | Visual capitalization is relevant, but independent reading and UI-label comprehension remain untracked prerequisites. |
| “Which word rhymes with cat?” | Must read answer words even though rhyme is an oral-language skill | No. The UI's narrated-choice mode triggers on `sound` or `phoneme`, not `rhyme`. | Confounds phonological awareness with decoding. Printed word-family similarity may give away the answer. |
| “Blend /p/ /i/ /g/. Which word…?” | Must read `pig`, `peg`, and `pin` to select the decoded word | No. Three-character word choices do not qualify for phoneme-choice audio. | Circularly requires decoding to demonstrate decoding. |
| “Read: Birds build nests. What do birds build?” | Must either decode the passage/choices or activate replay | Replay narrates the passage and prompt, but not choices | With replay, it measures listening comprehension; without replay, it may measure reading. Both produce identical evidence. |
| Letter identification/classification | Must understand control labels such as “uppercase” and “lowercase” | Prompt replay helps; category controls are not narrated by feature code | The visual letter target is legitimate, but UI language may still require adult/screen-reader support. |
| Initial/medial/final short sound answers | Must understand the prompt and choose printed phoneme labels | Partly. Short sound choices get focus/hover TTS, and speech response is available. | This is the strongest pre-reader accommodation, but it is applied by a text heuristic rather than declared content modality. |

The microphone fallback lets a learner say an ordinary answer, but it does not teach them what the visible choices say. It also relies on browser speech recognition rather than representing an instructional mode in the content/evidence model.

The system does not store what letter-sound patterns have been introduced, so it cannot prove that any written word or sentence is decodable for a given learner. TTS can make some tasks accessible, but it cannot turn an untaught or incorrectly scoped assessment into instruction.

## 8. Listening-vs-reading-comprehension findings

The current model does **not** distinguish listening comprehension from independent reading comprehension.

- `QuestionTemplate.modalities` has only broad booleans (`requiresReading`, `audioSupported`, `visualSupported`), and the converter labels all catalog content as not requiring reading.
- `QuestionInstance.accessibility.spokenPrompt` is an alternate delivery of the same prompt, not a distinct assessment form.
- `AttemptEvent.deliveryContext` is always `standaloneLearning`; it does not record whether TTS was played, whether an adult read the passage, or whether the learner decoded independently.
- The UI does not report replay/TTS use to the server.
- Comprehension prompts begin with “Read:” but their `audioText` is the same text. A narrated attempt and an independently read attempt update the same standard-level record.
- `independent` means “not human reviewed” in the facade, not “read without narration or help.” TTS/hint modality is not considered.

Consequences:

1. A strong oral-language comprehender who cannot decode may appear successful on a reading standard after using TTS.
2. A learner with adequate decoding but weaker oral vocabulary cannot be diagnosed cleanly because the evidence does not isolate the source of difficulty.
3. Mastery/progress reports cannot explain whether the child understood a read-aloud, read a controlled text independently, or selected an answer after adult support.
4. Accessibility support and construct validity are conflated: using audio should remain available, but the system must know what evidence that mode can support.

## 9. Question-quality findings

### Distractors are frequently non-diagnostic

Representative Kindergarten choices include:

- title location: `on the cover / under the bed / inside a shoe`;
- noun: `dog / run / happy`;
- informational detail: `nests / cars / sandcastles`;
- book part: `the cover / the table / the shoe`;
- common high-frequency word: `is / xylophone / triceratops`.

These are distinct and child-safe, but many are so implausible or category-mismatched that a learner can succeed through elimination without possessing the target knowledge. That weakens both practice feedback and diagnostic/mastery evidence.

### Standard alignment is sometimes inaccurate or overly broad

- `K.RF.1.a` officially concerns tracking print left-to-right, top-to-bottom, and page-by-page, but the generated item asks where a title is found. That is related to books, not the mapped standard's stated behavior.
- `K.RF.1.c` officially concerns spaces separating printed words, while the generated item asks which word group is a complete sentence.
- `K.RF.2.c` concerns onset/rime blending and segmentation, but the fixed items blend three separate phonemes.
- `K.RF.3.d` concerns reading a bank of common high-frequency words; asking which word is “common” assesses metalinguistic category recognition rather than word reading.
- Several items claim a visual is present (“A picture shows…”) but the interaction has no actual picture asset; the learner answers from the written description of the hypothetical picture.

### Variation is often cosmetic

The generic letter/rhyme/sound generators produce many seeded combinations. Most `kindergartenEla` standards, however, have only two authored item objects; repeated seeds shuffle the same answer set. The review packet's effective uniqueness metric can count answer-order changes as unique instances, so a high uniqueness count is not evidence of meaningful instructional variety.

### Validation misses educational defects

Current tests are strong on deterministic generation, schema validity, answer evaluation, review metadata, prompt variation, idempotency, and API security. They do not assert:

- decodability against prior taught patterns;
- one construct per item;
- truthful listening/reading modality;
- plausible misconception-based distractors;
- coverage of an authored subskill progression;
- a teach/model/guide/practice sequence;
- learner-facing first-session order;
- advancement beyond the initial practice window.

The repository's `CONTENT_AUTHORING_RULES.md` already states many of these expectations, including avoiding unrelated reading demands and distinguishing phonemic awareness from phonics. The implementation does not yet enforce them.

## 10. Standards-vs-curriculum findings

1. **Are standards treated as instructional units?** Yes, in the live ELA practice path. With three multi-template exceptions in the base Kindergarten catalog, each independently assessed standard maps to one template whose generator produces a question. Standard mastery controls sequence eligibility.
2. **Is there a concept below `Standard` representing teachable skills?** No durable pedagogical concept exists. `QuestionTemplate` is below a standard technically, and template IDs contain skill-like names, but it is an assessment item definition, not a skill with prerequisites, instruction, scope, examples, or mastery criteria.
3. **Can one broad standard map to many skills?** Multiple templates can share one standard ID, as the 14 base templates demonstrate. They cannot declare distinct child skills or separate progress; all evidence collapses into the same standard-level mastery record.
4. **Can multiple standards map to one instructional progression?** The lesson-plan schema can group several standards across days, and `QuestionTemplate` permits supporting standards. In production ELA, no lesson plan does so and catalog conversion always sets supporting standards to empty. The capability is present but unused for ELA.
5. **Are standards being taught in standards-file order?** Not literal file order, but effectively a hard-coded domain rank followed by lexicographic standard-ID/template-ID order. That is still standards-code ordering rather than authored educational sequencing.
6. **Are questions generated one-per-standard or in a small fixed number?** Yes. Forty-two self-scored Kindergarten ELA standards have one `kindergartenEla` template each with a base item and usually one variant. Nineteen Common Core performance standards have one adult activity each. Sixty Oklahoma Kindergarten objectives each have one generic adult activity. Only three early Common Core standards have deeper generated template sets in the raw catalog.

The broad “every standard has an activity” coverage test is valuable as an alignment check but currently allows a standard row plus a generic prompt to be mistaken for curriculum completeness. Standards describe outcomes; they do not specify the prerequisite sequence or teaching moves needed to reach them.

## 11. Reusable architecture

The rebuild should preserve and extend these working assets unless Stage 2 finds a specific incompatibility:

- versioned, source-attributed Common Core and Oklahoma standards data;
- manifest/hash validation and review-status/content-hash production gates;
- authenticated Learning API and learner ownership checks;
- durable, resumable learning sessions with deterministic seeds and idempotent attempts;
- separate diagnostic state and diagnostic evidence that does not automatically count as mastery;
- active learning-target, prerequisite-link, and placement persistence models;
- answer evaluator and support for choice, classification, sequence, matching, and constructed responses;
- model-backed TTS abstraction and existing spoken phoneme-choice UI;
- keyboard-operable semantic controls, visible prompts, accessibility alternatives, and reduced-motion metadata;
- immediate same-template retry after an error;
- standard-level attempt history, hint tracking, adult evidence notes, and spaced-review scheduling;
- the reviewed lesson-plan schema and renderer with explicit model/guided/independent/reteach phases;
- content validation, review packets, unit tests, API tests, client tests, and Playwright learning-flow tests;
- richer CVC words and prerecorded game audio as a candidate source asset, subject to curriculum review and architectural decoupling from Phaser.

## 12. Harmful or inadequate abstractions

| Current abstraction/behavior | Why it is inadequate for a learn-to-read curriculum |
| --- | --- |
| `CatalogTemplate.standardId` as the only curricular target | Cannot represent multiple teachable skills under a broad standard or trace a cumulative subskill sequence. |
| One mastery record per standard | Hides which component skill is secure and prevents precise prerequisites/remediation. |
| Question template as the practical unit below a standard | Encodes assessment generation, not instruction, taught scope, examples, or progression. |
| `requiresReading: false` on every converted template | Declares accessibility without analyzing prompts, answer choices, or the construct being assessed. |
| Difficulty band 1 for every catalog conversion | Cannot represent scaffold removal, pattern complexity, response complexity, or controlled text difficulty. |
| Domain rank + standard-ID sort as course order | Makes identifier syntax an educational decision and mixes two standards frameworks without an authored mapping. |
| First four unmastered standards as the practice pool | Does not ensure prerequisites, a teach-before-test sequence, or balanced strand progression. |
| `mastered` only through verified/adult paths | Ordinary practice cannot advance the course even after meeting its own evidence thresholds. |
| Diagnostic target persistence without live consumption | The system records recommended focus areas but the learner's next practice ignores them. |
| Generic standard-to-adult-prompt generation | Achieves alignment inventory coverage without supplying materials, modeling, rubric-quality evidence, or a teachable activity. |
| Prompt TTS as proof that reading is not required | Ignores unreadable answer choices and collapses listening and reading constructs. |
| Seeded choice shuffle as item variety | Inflates uniqueness without necessarily adding contexts, difficulty, or misconception coverage. |
| “Question = learning activity” in the live ELA flow | Replaces instruction and guided practice with a scored guess followed by an explanation. |
| Grade as the principal entry level | Subject placement exists, but no fine-grained literacy position controls what patterns are taught next. |

`question-selection.ts` is not itself harmful; it is an unused partial solution. It can prioritize reviewed prerequisites and targets, but it still selects question templates and assumes the prerequisites have been authored elsewhere.

## 13. Highest-risk educational failures

1. **A pre-reader must read to learn to read.** Prompt replay is optional and most answer choices are silent. Decoding questions require decoding their choices.
2. **Practice can stall forever in the first four standards.** Ordinary evidence cannot create `mastered`, and the live sequence excludes only mastered standards.
3. **Listening success is recorded as reading success.** The system cannot tell whether a “Read:” passage was decoded or narrated.
4. **Standards coverage can be mistaken for instructional coverage.** One fixed question or generic adult prompt satisfies current catalog coverage assertions.
5. **The live course ignores diagnostic targets and prerequisites.** Placement can identify needs without changing what practice serves.
6. **Question validity is weak.** Trivial distractors, mismapped standards, and absent “pictures” can reward elimination or test the wrong construct.
7. **There is no production ELA lesson sequence.** The instructional-phase architecture exists but learners receive practice questions instead.
8. **Foundational scope is not cumulative.** Content does not record introduced graphemes, phonemes, patterns, or decodable vocabulary, so later text cannot be guaranteed readable.
9. **Oklahoma alignment is operationally separate from autonomous learning.** Oklahoma objectives are generic adult observations while self-scored practice is Common Core-coded; no explicit equivalence/progression mapping joins them.
10. **Progress labels overstate independence.** `independent` means no human review, not no TTS, hint, decoding assistance, or adult reading.

## 14. Recommended architectural direction

Stage 2 should design the smallest instructional layer that separates standards destinations from teachable literacy steps. At a direction level—not a Stage 2 implementation specification—the architecture needs to support:

- explicit teachable skills below standards, with many-to-many standards mapping;
- reviewed prerequisites and deterministic instructional priority independent of standard-code order;
- lesson/activity phases that distinguish instruction, modeled example, guided response, independent practice, mastery check, diagnostic probe, review, and game reinforcement;
- cumulative phoneme/grapheme and decodability scope so every word/sentence can be checked against what the learner has been taught;
- explicit delivery/evidence modalities, especially spoken-only phonological awareness, narrated listening comprehension, supported/shared reading, and independent reading;
- progress at the skill/evidence level while retaining standards rollups for reporting;
- meaningful item banks and difficulty dimensions rather than answer-order variation;
- live consumption of diagnostic targets and reviewed prerequisite data;
- a clear policy for when practice evidence awards skill mastery and unlocks the next instruction;
- reuse of the current session, attempt, API, TTS, rendering, review-gate, diagnostic, and lesson-plan infrastructure.

The architecture should not begin by deleting standards, replacing durable progress, or moving curriculum rules into React. It should place a curriculum progression between standards and generated questions, then let the existing delivery and persistence layers consume that progression.

## 15. Questions and unknowns for Stage 2

1. Which standards framework is authoritative for course sequencing and reporting: Oklahoma, Common Core, or an explicitly reviewed crosswalk of both?
2. What is the intended adult role in the primary `/learning` experience for a non-reader? Must a child be able to complete core instruction independently, or is shared adult instruction an explicit product assumption?
3. Which foundational-literacy scope and sequence will receive qualified educational review, and what source/licensing constraints govern it?
4. What should be the smallest durable unit of progress: skill, skill step, pattern set, lesson objective, or another reviewed concept?
5. How should existing standard-level attempts/mastery be migrated or rolled up without falsely granting new skill mastery?
6. Should ordinary independent practice be allowed to award mastery, and if so, what evidence and mastery-check separation are required?
7. Which uses of TTS preserve the target construct, and which must be recorded as listening/shared-reading rather than independent reading evidence?
8. How will the system record support such as replay, hint, adult read-aloud, speech response, and guided prompting without penalizing accessibility needs?
9. What minimum authored item-bank size and misconception coverage is required before a skill can support practice, mastery checks, or diagnostics?
10. Which existing game CVC/audio assets are accurate, licensed, developmentally appropriate, and reusable outside Phaser?
11. What phoneme notation and TTS/prerecorded-audio strategy is reliable enough for phonemic-awareness and phonics instruction, given that ordinary word TTS is not a phoneme synthesizer?
12. How will decodable words, sentences, and connected texts declare and validate their allowed sound-spelling patterns and irregular words?
13. How should diagnostic placement map to the new skill progression without making diagnostic probes the teaching sequence?
14. What is the intended relationship between lesson-plan completion and scored practice/mastery evidence?
15. What accessibility accommodations are required for dyslexia, speech/language, hearing, vision, motor, attention, and multilingual learners while preserving valid evidence?

## Stage 1 gate assessment

The audit identifies why current order is educationally weak, what Kindergarten foundational-literacy content exists and is missing, the full data-to-next-item flow, the abstractions causing the problem, reusable infrastructure, and the decisions Stage 2 must resolve. The production curriculum remains unchanged. **Stop here; Stage 2 has not begun.**

Verification performed against the inspected repository:

- `npm --prefix server test -- curriculum-sequence question-generator k2-content-catalog progress learning-facade lesson-plan-catalog` — 7 suites and 87 tests passed.
- `npm --prefix server run curriculum:content:validate` — server build passed; validator reported 1,210 templates, one passage, one unsupported item, and one reviewed five-day lesson plan.
- Required-section and 36-item foundational-literacy checklist scans passed; the final document was read back in full.
- `git diff --check` passed. The only Stage 1 file created is this audit artifact; pre-existing worktree changes were left untouched.
