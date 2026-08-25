# K–2 ELA Implementation Plan

Stage 2 design only. This plan describes future work; it does not authorize or perform a database migration, selector replacement, bulk content generation, diagnostic rewrite, or production rollout.

The plan implements the architecture in `K2_ELA_INSTRUCTIONAL_PROGRESSION.md` while preserving the repository boundaries documented in `K2_ELA_CURRICULUM_GAP_ANALYSIS.md`.

## 1. Domain-model changes

Create an ELA curriculum feature slice under the existing curriculum feature:

```text
server/src/curriculum/
  domain/
    ela-skill.ts
    learning-activity.ts
    decodable-scope.ts
    skill-progress.ts
    skill-progress.repository.ts
  application/
    select-next-learning-activity.ts
    record-skill-evidence.ts
    derive-standard-progress.ts
  infrastructure/
    ela-skill-catalog.ts
    ela-activity-catalog.ts
    decodable-content.validator.ts
    prisma-skill-progress.repository.ts
```

Add these versioned domain concepts:

- `ElaSkillDefinition`: stable skill identity, optional coverage-family parent, competency/domain, prerequisites, rank, importance, grade band, standard mappings, policy reference, content-scope reference, purposes, modality, and review metadata.
- `LearningActivityDefinition`: a reviewed mapping from one purpose and interaction to one primary skill and optional supporting skills.
- `DecodableScope`: target/allowed/forbidden patterns, regular words, explicitly mapped irregular words, and text complexity constraints.
- `SkillMasteryPolicy`: evidence requirements by activity purpose and evidence mode.
- `SkillProgress`: `NOT_INTRODUCED`, `INTRODUCED`, `PRACTICING`, `MASTERED`, or `REVIEW_DUE`.
- `SkillEvidenceEvent`: immutable activity evidence with skill/activity/version, purpose, evidence mode, support events, result, and timestamp.

Keep `Standard`, `QuestionTemplate`, `QuestionInstance`, `AttemptEvent`, and lesson-plan types. Extend them rather than moving curriculum rules into controllers or React.

## 2. Persistence/database changes

Use an additive Prisma migration after Stage 2B is approved and the Stage 3 code is ready and tested:

```text
CurriculumSkillProgress
  learnerId + skillId + skillVersion (primary key)
  state
  highestCompletedPhase
  independentAttemptCount
  masteryAchievedAt
  reviewStage
  nextReviewAt
  updatedAt

CurriculumSkillEvidenceEvent
  id (primary key)
  learnerId, sessionId
  activityInstanceId (unique with learner/session/purpose)
  activityId, activityVersion
  primarySkillId, supportingSkillIds
  purpose, evidenceMode, supportEvents
  successful, response, attemptedAt

CurriculumSkillTarget
  learnerId + skillId (primary key)
  sourceStandardIds
  active
  createdAt, updatedAt
```

Add nullable compatibility columns to `CurriculumAttemptEvent`:

```text
activityId, activityVersion
primarySkillId, supportingSkillIds
evidenceMode, supportEvents
```

Definitions, graph edges, standards mappings, mastery policies, activities, and decodable scopes remain reviewed static curriculum assets, like the current catalog and lesson plans. They do not need mutable production database tables. Persist only executable leaf-skill learner state and immutable evidence; derive coverage-family rollups from the reviewed child set.

Keep `CurriculumMasteryRecord`, `CurriculumLearningTarget`, and `CurriculumPrerequisiteLink` during transition. They remain legacy standard-level/reporting records until all consumers migrate.

## 3. Migration requirements

1. Create new tables and nullable attempt columns without rewriting existing rows.
2. Do not infer fine-grained mastery from a standard-level record. A historical standard can map to several new skills, and old evidence does not identify which were demonstrated.
3. For existing learners, initialize no `CurriculumSkillProgress` rows eagerly. Lazily create a row when a skill is selected or when high-confidence compatible evidence is explicitly imported.
4. Translate completed diagnostic target standard IDs to active `CurriculumSkillTarget` candidates using reviewed primary mappings. Mark their source as diagnostic; do not mark those skills introduced or mastered.
5. Preserve old standard attempts and mastery unchanged for audit/history. New standard rollups can display “legacy evidence available” separately.
6. Only import old attempts into a skill when one reviewed template maps unambiguously to one skill and its original delivery mode is sufficient. Default to no mastery credit because old TTS/support use is unknown.
7. Make migration repeatable and transaction-safe. Add tests against empty, partially populated, and legacy-heavy databases.
8. Provide a down migration for schema additions; content release rollback is handled by versioned catalogs, not destructive data deletion.

## 4. API changes

Preserve current authenticated session URLs where practical. Evolve the response into a discriminated activity view:

```ts
type LearningActivityView = {
  sessionId: string;
  position: number;
  length: number;
  activity: {
    instanceId: string;
    activityId: string;
    activityVersion: number;
    primarySkill: { id: string; name: string; domain: string };
    purpose: ActivityPurpose;
    evidenceMode: EvidenceMode;
    presentation: InstructionView | QuestionView | WordBuilderView | ReadingView;
  };
  selectionReason: string;
};
```

Planned endpoints/changes:

- `POST /curriculum/learning/sessions`: retain existing modes; add an explicit curriculum flow while temporarily treating `practice` as a compatibility alias.
- `GET /sessions/:id`: restore the exact current activity and selection context.
- `POST /sessions/:id/answers`: continue for scored interactions; accept activity instance ID and structured client-observed support events.
- `POST /sessions/:id/activities/:instanceId/complete`: record instruction/modeled activity completion without fabricating a correct answer.
- `POST /sessions/:id/next`: select the next lifecycle-appropriate activity server-side.
- `GET /progress`: add skill profiles, standards rollups, current focus, and due reviews while retaining current fields during transition.
- `GET /curriculum/learning/roadmap`: return learner-specific domain/skill position without exposing canonical answers or internal scoring rules.

Use DTO classes with validation for new payloads. Controllers remain thin and learner identity remains token-derived.

## 5. Curriculum catalog and seed changes

Add reviewed, versioned data under a narrow ELA directory:

```text
data/curriculum/content/ela/
  skills.json
  activities.json
  mastery-policies.json
  decodable-scopes.json
  word-bank.json
  audio-cues.json
  passages/
```

Catalog validation must enforce:

- unique stable IDs and versions;
- valid actual standard IDs from `loadLearningStandards()`;
- at least one primary standard mapping where appropriate, without requiring one-to-one mapping;
- acyclic prerequisites and reachable foundational entry skills;
- prerequisite grade/sequence coherence;
- valid importance, purpose, evidence-mode, and policy references;
- reviewed instruction before reviewed independent/mastery activities for a new skill;
- exact activity-to-skill mappings;
- decodable text compliance with its referenced scope;
- irregular-word mapping and prohibited-pattern checks;
- required audio cues for pre-reader activities;
- human review metadata/content hashes at the production boundary.

Do not bulk-convert all 1,210 current templates in Stage 3. After Stage 2B supplies the approved lesson-recipe and renderer contracts, seed only the vertical slice plus compatibility mappings needed to prevent unsafe fallback.

## 6. Learning-selection changes

Replace the live call to `selectNextLearningTemplates` only after the new selector is tested in shadow simulation.

The new application service should:

1. load reviewed skill, activity, scope, and policy catalogs;
2. load learner skill progress, diagnostic skill targets, due reviews, and recent session history;
3. compute ready skills from prerequisite thresholds;
4. prefer bounded due foundational reviews, unresolved diagnostic targets, and current in-progress focus;
5. rank ready skills by importance, grade appropriateness, reviewed sequence rank, and stable ID;
6. derive the correct lifecycle purpose from skill state/evidence;
7. filter activities by purpose, delivery/evidence mode, content scope, accessibility, and recency;
8. use deterministic seeded selection only among educationally equivalent candidates;
9. return a structured selection reason for logs/tests;
10. refuse with a purposeful “reviewed instruction unavailable” state instead of falling back to a random standard question.

Retain immediate same-skill support after an error, but choose an easier guided activity or modeled example when policy calls for it rather than merely reshuffling the same question.

## 7. Lesson and activity changes

- Treat `INTERACTIVE_TUTOR_AND_LESSON_ENGINE_DESIGN.md`, produced and approved in Stage 2B, as a required implementation input. The bullets below are curriculum constraints for that design, not a substitute for its recipe, component, tutor, hint, remediation, animation, cache, cost, and degraded-mode decisions.
- Adapt the existing lesson-plan phase concepts to reference skill IDs as well as standards and template IDs.
- Permit a micro-lesson to span a few activities rather than requiring every skill to have a five-day plan.
- Add structured instruction presentations: narrated explanation, model-with-highlight, listen-and-move, picture/sound sort, letter/sound card, continuous blend, word builder, and controlled reading.
- Require a visible learner action during guided practice, with corrective feedback tied to the misconception.
- Keep adult setup/materials for handwriting, shared reading, oral performance, and composition.
- Store lesson/activity completion separately from correct-answer evidence.
- Make all early directions concise, narrated, repeatable, and keyboard/pointer accessible.

## 8. Question-template changes

Extend `QuestionTemplate` compatibly with:

```ts
primarySkillId?: string;
supportingSkillIds?: string[];
purpose?: ActivityPurpose;
contentScopeId?: string;
evidenceModes?: EvidenceMode[];
audioCueIds?: string[];
```

Do not infer activity purpose from response type. A single-choice interaction can be guided practice, mastery, diagnostic, or review, but it must be separately authored/reviewed for that purpose.

Replace blanket `requiresReading: false` with explicit delivery metadata. Validate prompt and answer-option audio separately. Add distractor metadata describing the misconception represented; reject trivial category-mismatched distractors in mastery/diagnostic content.

Reclassify current Kindergarten templates before mapping them:

- generated letters, rhyme, and CVC-sound templates may become guided/independent activities after modality and alignment review;
- fixed comprehension and language items remain practice candidates only after decodability/modality review;
- generic adult activities remain standards-coverage placeholders until authored directions/rubrics exist;
- mismapped `K.RF.1.a`, `K.RF.1.c`, `K.RF.2.c`, and the shifted `K.RF.3.b/.c/.d` content must not provide mastery evidence in the new model.

## 9. TTS/audio implications

- Keep `src/quiz/speech.ts` as the only feature-code speech entry point and `/api/tts` as the model-backed whole-text service.
- Add a curriculum audio-cue resolver that can return prerecorded reviewed phonemes or model TTS for directions/whole words/sentences.
- Do not use ordinary TTS to synthesize isolated phonemes or slow blends without review.
- Add replay, slow-blend, normal-word, stop, and per-choice audio controls where declared by the activity.
- Record support events and resulting evidence mode; never penalize accessibility use, but never call narrated passage evidence independent reading.
- Provide an in-memory/fake cue resolver in server tests and mocked model audio in client/E2E tests.
- Audit the existing CVC encoded audio before reuse; keep the learning catalog independent of Phaser asset loading.

## 10. UI changes

Keep `LearningApp` as orchestration. Stage 2B must minimize and finalize the reusable component set; the likely capabilities that its design must cover are:

```text
InstructionActivity
ModeledExampleActivity
SoundChoiceActivity
SoundSortActivity
LetterSoundActivity
WordBuilderActivity
ControlledReadingActivity
MasteryCheckActivity
```

UI requirements:

- automatically narrate pre-reader directions and stop narration on activity change;
- show large semantic controls and persistent visible focus;
- narrate linguistic answer choices without forcing hover;
- distinguish “Learn,” “Try together,” “Try by yourself,” “Check what you know,” and “Review” in child-friendly language;
- display progress by friendly skill name/domain, not raw standard code alone;
- make support available without shame and record the resulting evidence mode;
- avoid confetti/timed continuation during explicit instruction if it distracts from modeling; retain celebration for appropriate successful independent work;
- preserve pause/resume and exact server-checkpoint restoration for curriculum sessions, not only diagnostics.

## 11. Diagnostic compatibility

Do not rewrite the diagnostic in Stage 3.

Compatibility bridge:

1. Keep the current standards-based diagnostic blueprint, unique fingerprints, evidence thresholds, persisted state, and placement report.
2. After diagnostic completion, map each returned standard target to reviewed primary skill mappings.
3. Activate the earliest unresolved prerequisite skill, not every descendant skill at once.
4. Preserve diagnostic attempts as diagnostic evidence; do not count them as lesson completion or skill mastery unless a later reviewed policy explicitly permits an equivalent independent probe.
5. Expose unresolved mappings in logs/reports; never silently select by standard code.
6. Later, after the skill catalog is complete, author skill-based diagnostic blueprints as a separate reviewed increment.

## 12. Game integration

- Add optional `skillIds` and content-scope metadata to game content mappings outside individual scenes.
- Games request only skills already introduced unless explicitly configured as a demonstration tutorial.
- Game results record `GAME_REINFORCEMENT`; they do not award mastery by default.
- Reuse reviewed word/audio assets through a neutral curriculum asset catalog, not imports from Phaser scenes.
- Keep game navigation, rewards, and scene lifecycle independent of the curriculum selector.

## 13. Existing content that can remain

- Common Core and Oklahoma standards datasets and provenance.
- Catalog review status/content hashes and validation framework.
- Authenticated Learning routes and learner ownership enforcement.
- Deterministic/restorable session records and attempt idempotency.
- Diagnostic state, fingerprinting, persistence, and reporting.
- `speak`/`stopSpeaking` and model TTS service.
- Existing semantic choice/classification/sequence rendering where modality is valid.
- Immediate retry concept, spaced-review fields, progress history, adult evidence notes.
- Lesson-plan validation/renderer and its instruction/guided/reteach phases.
- Valid math content and all unrelated subject content.
- Existing game CVC/audio assets pending content/audio review.

“Can remain” does not mean existing ELA mappings are automatically valid mastery evidence.

## 14. Content requiring reclassification

| Current content | Proposed classification work |
| --- | --- |
| 14 generated K ELA templates | Map to exact skills and purpose; add complete choice audio; separate true matching from case classification; review word/picture claims. |
| 42 `kindergartenEla` self-scored templates | Treat as assessment/practice drafts; review standard alignment, distractors, reading requirements, and content scope individually. |
| 19 Common Core K adult templates | Map to performance skills and replace generic demonstrated/not-demonstrated evidence with appropriate rubrics. |
| 60 Oklahoma K adult templates | Retain as coverage placeholders, not instruction; author real activities before production skill mapping. |
| Grade 1/2 self-scored ELA | Reclassify by phonics scope, modality, purpose, and skill; do not bulk-approve from existing reviewed status. |
| Comprehension prompts beginning “Read:” | Split into listening, supported-reading, and independent-reading forms with distinct evidence. |
| “Picture shows…” prompts without assets | Add a real reviewed visual or rewrite/retire the item. |
| Current high-frequency-word questions | Replace category recognition with actual regular/irregular word reading and mapping. |

## 15. Content to deprecate

Deprecation means excluded from new skill mastery/diagnostic evidence while retained for historical attempt rendering:

- `K.RF.1.a` book-title item mapped to print directionality;
- `K.RF.1.c` complete-sentence item mapped to word spacing;
- `K.RF.2.c` phoneme-blending items mapped to onset/rime;
- shifted `K.RF.3.b`, `K.RF.3.c`, and `K.RF.3.d` questions that assess different outcomes from the official standard;
- trivial distractor items that can be solved without target knowledge;
- comprehension items whose delivery mode cannot be determined;
- text/illustration integration items with no actual illustration;
- generic adult standard-paraphrase activities once a reviewed replacement exists.

Do not delete template versions referenced by historical attempts or active sessions. Mark them retired for new selection after replacement and session compatibility checks.

## 16. Existing learner-data migration

- Preserve every attempt, session, placement, and standard mastery row.
- Never distribute one mastered standard automatically across all newly mapped skills.
- Show legacy standard mastery as historical reporting context.
- Allow conservative credit only from an explicit reviewed migration map containing old template ID/version, new skill ID/version, accepted evidence mode, and maximum imported state.
- Because old attempts do not record prompt replay/choice audio, imported reading evidence cannot exceed `INTRODUCED` unless independently verified later.
- Existing diagnostic targets become skill-target candidates, not mastery.
- Active legacy sessions finish on their saved catalog versions or receive a clear restart path; do not mutate their stored instances.
- Produce dry-run counts before any migration and make the migrator idempotent.

## 17. Automated test strategy

### Domain/catalog tests

- stable unique skill/activity/scope IDs and version rules;
- actual standards mapping validity for both frameworks;
- graph acyclicity, reachable entry nodes, and no impossible prerequisite grade edges;
- importance/rank deterministic ordering;
- every production skill has instruction, guided practice, independent practice, and valid mastery content as required by policy;
- decodable validator acceptance/rejection, including irregular parts and hidden patterns;
- modality tests proving narrated reading does not become independent-reading evidence;
- mastery lifecycle and review transition tests with an injected clock.

### Application/repository tests

- selector chooses highest-priority ready skill and explains why;
- unsatisfied prerequisites block independent/mastery activities;
- an unintroduced skill receives instruction first;
- diagnostic targets resolve to earliest missing skills;
- retries reduce support appropriately and do not repeat identical instances;
- skill evidence and progress updates are idempotent;
- legacy attempts remain readable and cannot inflate new mastery;
- exact session restoration after server restart.

### Client/E2E tests

- pre-reader path can be completed using audio plus pointer or keyboard without reading controls;
- all linguistic choices expose audio;
- narration stops between activities;
- support use changes evidence mode correctly;
- word builder, controlled sentence, feedback, pause/resume, and progress screens;
- the first 20 beginner selections contain instruction before independent/mastery checks and no unintroduced print pattern;
- no Phaser canvas is launched by `/learning`.

Run server focused tests/build and client tests/build for each implementation increment per `AGENTS.md`.

## 18. Simulation strategy

Add a deterministic CLI/report that accepts a profile and seed, runs the real selector without database writes, and prints 10–20 selections with:

```text
index, skillId, skill state, prerequisites, selection reason,
purpose, activityId, contentScopeId, evidenceMode, review/target flags
```

Required profiles:

| Profile | Initial evidence | Expected selector behavior |
| --- | --- | --- |
| A: complete beginner | No skills introduced | Starts spoken word/sound instruction and narrated controls; no independent print task. |
| B: alphabet known, weak phonemic awareness | Letter identity/name/sounds mastered; blending/segmentation emerging | Selects oral blending/segmentation before CVC decoding. |
| C: blends one CVC vowel pattern | Short-a oral blending and letter set mastered; decoding practicing | Continues unfamiliar short-a decode/encode, then controlled sentence only after mastery. |
| D: fluent CVC, no long-vowel patterns | Mixed short-vowel CVC and K text mastered | Introduces complex consonants/final-e contrast, not random comprehension questions. |
| E: strong listening, weak decoding | Listening comprehension strong; phonics early | Preserves rich narrated comprehension while selecting foundational decoding as the reading focus. |
| F: advanced early reader entering K | Independent K/G1 skill evidence strong | Uses reviewed mastery checks to skip known foundations, then opens the earliest unresolved higher skill; does not force book-cover practice. |

Simulation assertions:

- same profile/seed/catalog produces the same plan;
- no selected activity violates prerequisites or content scope;
- instruction precedes practice for unknown skills;
- review is bounded and target priorities are visible;
- profiles diverge for educational reasons, not random standard ordering;
- unsupported catalog areas stop explicitly instead of falling back.

Commit simulation snapshots only after curriculum review because changing the reviewed graph should intentionally change the expected plan.

## 19. Rollout phases

1. **Stage 2 design/review gate:** approve the progression, standards matrix, vertical slice, letter/audio policy, and mastery evidence policy. No runtime change.
2. **Stage 2B tutor/lesson-engine gate:** produce and approve `INTERACTIVE_TUTOR_AND_LESSON_ENGINE_DESIGN.md`, including the lesson recipe model, minimal components, tutor states/dialogue boundaries, phoneme audio, hints/remediation, resumable checkpoints, degraded behavior, tests, and exact Stage 3 subset. No production runtime change.
3. **Additive foundation:** add domain types, static catalogs/validators, repository ports, and additive schema behind an off-by-default server configuration. Run shadow simulations only.
4. **Stage 3 vertical slice:** author and expose only the reviewed short-a Kindergarten slice to internal/test learners using the approved Stage 2B recipe/component contracts. Keep legacy Learning available for other content, but do not mix selectors within one session.
5. **Evidence validation:** inspect actual generated activities and A–F simulation traces; run accessibility and educator review; correct the model before expansion.
6. **Kindergarten expansion:** add all short vowels, controlled text, listening/reading separation, and required Kindergarten parallel strands incrementally.
7. **Grade 1 expansion:** add reviewed complex consonant/vowel/morphology scopes and corresponding text.
8. **Grade 2 expansion:** add reviewed syllable/structural-analysis/multisyllable scopes and text.
9. **Diagnostic evolution:** only after skill coverage is stable, design skill-based diagnostics and retire the standards-only compatibility bridge.
10. **Legacy retirement:** stop new selection of superseded ELA templates after active-session and historical-report verification. Keep immutable history.

Each phase requires catalog validation, deterministic simulation review, automated tests, build/typecheck, actual learner-output inspection, and an explicit production approval.

## Stage 3 Kindergarten vertical slice specification (after Stage 2B)

Stage 3 should implement only this coherent proof, rendered through the approved Stage 2B lesson recipes and tutor/component contracts:

### Scope

Instructional letter/sound set: `m, s, t, p, n, c` plus short `a`; uppercase forms are included for identity/case matching. Controlled words may include:

```text
am, at, sat, mat, map, tap, pat, pan, man, can, cat, nap
```

Every word must pass the Stage 3 scope validator. No blend, digraph, silent-e, vowel-team, r-controlled, or unexplained irregular pattern is allowed.

### Skill sequence

```text
ela.pa.word-awareness
  → ela.pa.isolate.initial.set-1
  → ela.pa.phoneme-blend.three
  → ela.pa.phoneme-segment.three

ela.alphabet.letter-vs-symbol
  → ela.alphabet.lowercase.set-1
  → ela.alphabet.case-match.set-1
  → ela.phonics.consonant-sounds.set-1
ela.phonics.vowel.identity
  → ela.phonics.vowel.short-a
  → ela.pa.isolate.medial.short-a

phoneme blending + consonant sounds + short-a
  → ela.phonics.cvc.decode.short-a
phoneme segmentation + consonant sounds + short-a
  → ela.encoding.cvc.short-a

ela.print.direction.left-to-right
  → ela.print.word-boundaries-spacing
  → ela.print.sentence-features

CVC decoding + sentence-print features
  → ela.text.sentence.short-a
  → ela.read.literal.short-a
```

`ela.text.sentence.short-a` uses a fully controlled sentence such as `Sam sat.` after uppercase `S`, spacing, and period have been introduced. The independent reading activity narrates directions but not the sentence. Activating sentence help changes the evidence to `SUPPORTED_READING`; it does not create independent-reading mastery. Literal comprehension can use narrated/picture answer options so the answer controls add no untaught decoding.

### Minimum activity set

For each new foundational skill, provide:

- one narrated instruction;
- one modeled example;
- at least two guided variants with corrective feedback;
- sufficient independent variants to test generalization;
- a distinct mastery-check form where the policy permits auto-scoring;
- one review activity for mastered skills.

Open oral production or encoding may use adult observation or a constrained sound/letter builder; do not pretend that multiple-choice recognition proves production.

### Vertical-slice acceptance

1. Profile A's first 20 selections contain no independent reading before the controlled sentence prerequisites are mastered.
2. Profile B is routed to oral blending/segmentation despite mastered alphabet knowledge.
3. Profile C sees unfamiliar short-a words, not only a memorized word family.
4. The selector progresses through instruction → guided → independent → mastery and can actually unlock the next skill.
5. `Sam sat.` passes decodable validation; injected `Sam sits.` or `Sam ate.` fails until the relevant patterns are allowed.
6. Narrated comprehension and independent sentence reading create different evidence modes.
7. Sessions resume exactly, attempts remain idempotent, and historical standard reporting remains intact.
8. A qualified reviewer inspects actual generated audio, prompts, choices, feedback, and 10–20-step simulations before production approval.

## Stage 2 gate

This plan stops before implementation. Stage 2B must run next and produce `INTERACTIVE_TUTOR_AND_LESSON_ENGINE_DESIGN.md`. Stage 3 may begin only after all three Stage 2 documents are internally consistent, the Stage 2B gate is approved, and the vertical-slice mappings/content assumptions receive review.
