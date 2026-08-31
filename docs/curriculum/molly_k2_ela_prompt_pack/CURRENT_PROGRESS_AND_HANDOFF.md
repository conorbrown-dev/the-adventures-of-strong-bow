# K–2 ELA Curriculum — Current Progress and Handoff

**Checkpoint date:** 2026-08-25

**Branch:** `main`

**Stage status:** Stage 3 code and automated verification complete; licensed private-preview audio installed; production review gate still closed; Stage 4 not started.

This file is the short entry point for resuming the curriculum work on another machine. Read it together with `00_WORK_ORDER.md` and `../KINDERGARTEN_VERTICAL_SLICE_RESULTS.md`.

## 1. Completed work

- Stage 1 audit is complete in `../K2_ELA_CURRICULUM_GAP_ANALYSIS.md`.
- Stage 2 progression, standards coverage, and implementation planning are complete in:
  - `../K2_ELA_INSTRUCTIONAL_PROGRESSION.md`
  - `../K2_ELA_STANDARD_COVERAGE_MATRIX.md`
  - `../K2_ELA_IMPLEMENTATION_PLAN.md`
- Stage 2B tutor and lesson-engine design is complete in `../INTERACTIVE_TUTOR_AND_LESSON_ENGINE_DESIGN.md`.
- Stage 3 implements the Kindergarten foundational-literacy vertical slice through the existing curriculum facade and `/learning` route.
- The Stage 3 catalog contains 20 prerequisite-linked skills, six recipe families, deterministic instruction-to-mastery selection, remediation, durable skill progress/evidence, restart-safe checkpoints, and idempotent submissions.
- The React lesson renderer, centralized narration behavior, Prisma schema/migration, validators, simulation harness, and focused tests are implemented.
- Full design, learner-sequence, decodability, persistence, audio, and verification details are recorded in `../KINDERGARTEN_VERTICAL_SLICE_RESULTS.md`.

The canonical Stage 3 prompt is `03_IMPLEMENT_KINDERGARTEN_VERTICAL_SLICE.md`. The similarly named `(1)` file came from the supplied prompt pack and adds only the explicit Stage 2B input language; it is not a second stage.

## 2. Resume on another machine

From an existing clone:

```powershell
git checkout main
git pull --ff-only origin main
npm ci
npm --prefix server ci
npm --prefix server run prisma:generate
```

Use the target environment's normal secret-management process for server environment variables. `server/.env` is machine-local and must not be copied into Git. Apply the committed database migration only after configuring the intended database:

```powershell
npm --prefix server run prisma:deploy
```

Confirm the checkpoint before further edits:

```powershell
npm test
npm run build
npm --prefix server test
npm --prefix server run typecheck
npm --prefix server run build
npm run curriculum:kindergarten:simulate -- 20
```

From `server/`, Prisma can also be checked without applying a migration:

```powershell
npx prisma validate
```

## 3. Production blocker: seven reviewed phoneme cues

Do not enable the vertical slice in production yet. The feature flag is `KINDERGARTEN_ELA_VERTICAL_SLICE_ENABLED` and defaults to off. Seven licensed IPA samples are present with `PROVISIONAL` status. A private preview additionally requires `KINDERGARTEN_ELA_ALLOW_PROVISIONAL_AUDIO=true`; production-ready status still requires every cue to be qualified and marked `REVIEWED`.

The seven cue IDs are:

| Cue ID | Required sound |
| --- | --- |
| `phoneme.m.continuous` | `/m/` as in *map* |
| `phoneme.s.continuous` | `/s/` as in *sat* |
| `phoneme.t.stop` | `/t/` as in *tap* |
| `phoneme.p.stop` | `/p/` as in *pan* |
| `phoneme.n.continuous` | `/n/` as in *nap* |
| `phoneme.k.stop` | `/k/`, represented by `c` as in *cat* |
| `phoneme.a.short` | short `/a/` (`/æ/`) as in *map* |

The provisional files are general IPA samples, and some contain surrounding vowel context. They are acceptable only for supervised private preview. Final assets must be clean, individually reviewed recordings. Do not substitute Piper, browser TTS, a letter name, an example word, or a consonant pronounced with an added schwa. The continuous sounds may be sustained; `/t/`, `/p/`, and `/k/` must remain clean stop sounds.

To clear the gate:

1. Have a qualified reviewer inspect the seven provisional recordings and preserve the decision evidence.
2. Replace any unsuitable sample while preserving license/provenance and updating its checksum.
3. In `server/src/curriculum/infrastructure/kindergarten-ela-catalog.ts`, change only approved entries from `PROVISIONAL` to `REVIEWED`.
4. Keep ordinary model/browser speech unavailable as a fallback for isolated phonemes.
5. Inspect each cue alone and in CVC blending order on a real device. Confirm consistent volume, no clipping, no overlap, usable replay controls, and accurate stop/continuous timing.
6. Run the complete verification list above and manually check boot, hub navigation, `/learning`, narration replacement/cancellation, pointer and keyboard use, focus visibility, activity completion, and return navigation.
7. Update `../KINDERGARTEN_VERTICAL_SLICE_RESULTS.md` with the asset review evidence and only then consider enabling the feature flag.

## 4. Main implementation entry points

| Area | Entry point |
| --- | --- |
| Skill and activity domain | `server/src/curriculum/domain/ela-skill.ts`, `learning-activity.ts`, `skill-progress.ts` |
| Catalog and audio gate | `server/src/curriculum/infrastructure/kindergarten-ela-catalog.ts` |
| Catalog validation | `server/src/curriculum/infrastructure/kindergarten-ela.validator.ts` |
| Selection and evidence rules | `server/src/curriculum/application/kindergarten-literacy-engine.ts` |
| Existing-facade integration | `server/src/curriculum/application/learning-facade.service.ts` |
| Persistence migration | `server/prisma/migrations/20260825010000_kindergarten_ela_skill_progress/migration.sql` |
| Simulation | `server/src/curriculum/application/kindergarten-ela-simulation.ts` |
| React activity renderer | `src/learning/KindergartenLessonActivity.tsx` |
| `/learning` orchestration | `src/learning/LearningApp.tsx` |
| Narration and reviewed cues | `src/quiz/speech.ts` |

## 5. What to do next

The next safe task is the reviewed-audio and manual-flow gate above. Do not begin `04_REVIEW_AND_EXPAND_K2.md` until that gate is documented as complete.

After the gate, Stage 4 should first challenge the Stage 3 educational sequence, prerequisite selection, evidence safety, restart/idempotency behavior, decodability, and accessibility. Correct discovered defects before generalizing the architecture across the remaining Kindergarten, Grade 1, and Grade 2 curriculum.

Known deferred scope includes richer visual hint transformations, broader scheduled-review policy, a scope-safe game handoff, live AI dialogue, speech-recognition scoring, offline mastery, and the rest of K–2 content.
