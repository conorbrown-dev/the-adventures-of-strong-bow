# Kindergarten Foundational-Literacy Vertical Slice Results

**Stage:** 3 implementation and automated verification

**Date:** 2026-08-25; provisional-audio update verified 2026-08-31

**Production status:** Code-complete behind a disabled feature flag. Seven licensed provisional recordings support an explicit private-preview mode; production enablement remains blocked until qualified audio review.

## 1. Architecture implemented

The vertical slice extends the existing curriculum facade and `/learning` route. It does not add a parallel quiz or client-owned progression system.

- The server owns the skill graph, prerequisite eligibility, activity purpose, deterministic example selection, answer key, evidence semantics, hints, skill state, and mastery.
- `LearningActivityDefinition` binds a versioned skill to a recipe, purpose, presentation, reviewed content, evidence mode, hints, and misconception metadata.
- The six Stage 2B recipe families are registered and validated: auditory contrast, symbol/sound, phoneme sequence, word mapping, print feature, and controlled sentence.
- The React renderer uses the reusable `TutorPanel`, `ChoiceBoard`, `CardWorkspace`, `FocusDisplay`, `ControlledTextReader`, `LessonControls`, and `ProgressCelebration` components. `LearningApp` remains the route/session orchestrator.
- Existing diagnostic, placement, other-subject practice, lesson-plan, and standard-level progress paths remain intact. The new selector is used only for flagged Kindergarten ELA practice sessions.

## 2. Database and migration changes

Migration `20260825010000_kindergarten_ela_skill_progress` adds:

- activity, skill, evidence-mode, and support metadata to immutable curriculum attempts;
- `CurriculumSkillProgress`, keyed by learner, skill, and skill version;
- `CurriculumSkillEvidenceEvent`, with a uniqueness constraint across learner, session, activity instance, and purpose;
- indexes for learner skill history and scheduled review lookups.

The existing `CurriculumLearningSession.state` JSON checkpoint now carries the exact activity/version, instance ID, selection reason, support history, recent-example exclusion window, recorded result, and idempotency state. Reloading a service reconstructs the same instance rather than selecting a replacement.

Cross-service duplicate responses converge on the first accepted skill-evidence event. Standard attempt reporting is then written from that authoritative response, and the database uniqueness constraints prevent duplicate evidence.

## 3. Vertical-slice skills

The catalog contains 20 executable skills:

1. spoken word awareness;
2. literal listening comprehension;
3. initial-sound isolation;
4. final-sound isolation;
5. three-phoneme blending;
6. three-phoneme segmentation;
7. letter versus symbol;
8. lowercase identity for `m, s, t, p, n, c, a`;
9. uppercase/lowercase matching;
10. consonant-sound associations for the initial set;
11. vowel identity;
12. short `a`;
13. medial short-`a` isolation;
14. short-`a` CVC decoding;
15. short-`a` CVC encoding;
16. left-to-right directionality;
17. word boundaries and spacing;
18. sentence capitalization and terminal punctuation;
19. controlled sentence reading;
20. literal learner-read comprehension.

Every skill has one instruction, one modeled example, two guided activities, three independent activities, three mastery activities, and two review activities. Activity selection proceeds through instruction → model → two successful guided examples → two successful unsupported independent examples → two successful unsupported mastery checks.

Two recent independent/mastery difficulties route to guided remediation. One successful remediation activity returns the learner to a fresh independent item instead of trapping the learner in remediation.

## 4. Standards mappings

Each executable skill maps to an active repository standard and a supporting Common Core outcome. Representative traceability includes:

| Skill group | Oklahoma standards | Common Core support |
| --- | --- | --- |
| Word/phoneme awareness | `K.2.PA.1`, `K.2.PA.3`, `K.2.PA.6`, `K.2.PA.7` | `K.RF.2`, `K.RF.2.b`, `K.RF.2.d` |
| Letter and sound knowledge | `K.2.PC.4`, `K.2.PWS.1`, `K.2.PWS.3` | `K.RF.1.d`, `K.RF.3.a`, `K.RF.3.b` |
| CVC decoding and encoding | `K.2.PWS.4`, `K.2.SE.2` | `K.RF.3.a`, `K.L.2.d` |
| Print concepts | `K.2.PC.3`, `K.2.PC.4`, `K.2.PC.5` | `K.RF.1.a`, `K.RF.1.b`, `K.RF.1.c` |
| Listening and reading meaning | `K.2.R.1`, `K.2.F.1` | `K.SL.2`, `K.RF.4`, `K.RL.1` |

Teaching order comes from prerequisites and instructional priority, not from standard order.

## 5. Example lesson flow

A new short-`a` decoding skill follows this server-selected flow:

1. The tutor explains touching each letter sound and sliding sounds together. Completion records presentation/instruction evidence only.
2. The tutor models `map`; the model cannot count as independent evidence.
3. Two guided picture matches use `map` and `sat`, with specific consonant/order feedback and monotonic hints.
4. Fresh independent items use two of `tap`, `pan`, and `cat`. Directions are narrated, but the target words and answer choices have no answer-revealing audio.
5. Fresh mastery items use two of `nap`, `can`, and `pat` without instructional support.
6. Mastery unlocks dependent curriculum; failed independent work routes through a guided activity before another fresh target item.

Tutor states are deterministic: `SPEAKING` and `POINTING` for instruction/model, `IDLE` for independent presentation, and server-returned `ENCOURAGING`, `GENTLE_CORRECTION`, or `CELEBRATING` after a response.

## 6. Simulated learner sequences

The reproducible harness is:

```text
npm run curriculum:kindergarten:simulate -- 20
```

Each profile assumes successful responses so the output exposes unlocking and example rotation. `I`, `M`, `G`, `P`, and `C` below mean instruction, model, guided, independent practice, and mastery check.

| Profile | Actual first 20 selections inspected |
| --- | --- |
| A — complete beginner | 1–8 word awareness `I M G G P P C C`; 9–16 initial-sound isolation `I M G G P P C C`; 17–20 final-sound instruction/model/guided `I M G G`. All are `SPOKEN_ONLY`; no independent text appears. |
| B — alphabet known, phonemic awareness weak | 1–8 three-phoneme blending; 9–16 segmentation; 17–20 short-`a` instruction/model/guided. It does not jump to connected text. |
| C — can blend the selected pattern | 1–8 short-`a` decoding, using distinct guided (`sat`, `map`), independent (`pan`, `cat`), and mastery (`pat`, `can`) items; 9–16 listening comprehension remains a separate strand; 17–20 encoding begins. |
| D — listening strong, decoding weak | 1–8 short-`a` decoding; 9–16 encoding; 17–20 print direction instruction/model/guided. Existing listening mastery does not grant reading mastery. |
| E — advanced early reader | 1–8 sentence-feature work; 9–16 controlled `Sam sat.` reading; 17–20 literal learner-read comprehension instruction/model/guided. |

The simulation is deterministic for a profile and seed, reports every selection reason/recipe/evidence mode, and uses the same selector and evidence rules as the application service.

## 7. Example content inspected

- Auditory word awareness: “How many words do you hear? Molly can hop.”
- Initial-sound contrast: `map` versus `man`, with a same-domain consonant distractor.
- Short-`a` discrimination: `map/cat` versus an alternate medial vowel.
- CVC decode: `tap`, `pan`, `cat`, then fresh `nap`, `can`, `pat` mastery forms.
- CVC encode: hear `map`, then build `[m, a, p]` from shuffled letter cards.
- Print feature: select the form with a real word space, initial capital, or terminal period.
- Controlled text: `Sam sat.` with narrated/picture response controls.

The validator requires one canonical choice, same-construct distractors, misconception tags, known skill/recipe/cue references, unique versioned IDs, sufficient purpose pools, and an acyclic prerequisite graph.

## 8. Decodability behavior

The initial scope permits graphemes `m, s, t, p, n, c, a`, restricts `c` to initial `/k/`, and permits the curated words:

```text
am at sat mat map tap pat pan man can cat nap Sam
```

`Sam sat.` passes. `Sam sits.`, `Sam ate.`, `train`, `night`, `cake`, and `chair` fail. Scoped CVC answer keys and card-workspace target words are validated. No blend, digraph, silent-e, vowel-team, or r-controlled item is in the slice.

## 9. TTS and isolated audio behavior

Whole-language prompts, directions, choices, hints, and feedback use `speak`/`stopSpeaking`, which call the model-backed `/api/tts` service and retain the centralized browser fallback. Navigation, replacement narration, cue playback, and component cleanup stop prior speech.

Independent decoding directions are spoken, but the assessed word is silent. Requesting controlled-sentence narration records `L4_MODEL` on the server before playback and changes the response to `SUPPORTED_READING`, which cannot satisfy unsupported independent mastery.

The required cues are `/m/`, `/s/`, `/t/`, `/p/`, `/n/`, `/k/`, and short `/a/`. Licensed Wikimedia Commons IPA samples now provide all seven paths with `PROVISIONAL` status, source links, license IDs, and checksums. The centralized client resolver plays only these local assets and never falls back to Piper or browser synthesis for a phoneme.

Private preview requires both `KINDERGARTEN_ELA_VERTICAL_SLICE_ENABLED=true` and `KINDERGARTEN_ELA_ALLOW_PROVISIONAL_AUDIO=true`. Production-ready composition still requires all seven entries to be `REVIEWED`; provisional status never satisfies that check. The assets and attribution are documented in `src/game/assets/audio/phonemes/ATTRIBUTION.md`.

To clear the production gate, a qualified reviewer must inspect or replace all seven recordings, approve their phonics accuracy and accent suitability, mark the approved server entries reviewed, inspect playback/blend timing on the target device, and rerun this document's verification commands.

## 10. Verification executed

The final verification run covers:

- all client Vitest tests;
- all server Jest tests, including educational Tests A–I;
- client TypeScript and Vite production build;
- server Nest build/typecheck;
- Prisma schema validation;
- the 10- and 20-selection simulation harness;
- `git diff --check` and a focused scan for browser speech calls, scattered fetches, random prerequisite bypasses, and hardcoded session/exclusion counts.

Verified commands and outcomes:

| Command | Outcome |
| --- | --- |
| `npm test` | 6 Vitest files, 22 tests passed |
| `npm run build` | client TypeScript and Vite production build passed |
| `npm run test:curriculum` | 15 Jest suites, 131 tests passed |
| `npm --prefix server run typecheck` | passed |
| `npm --prefix server run build` | passed |
| `npm run curriculum:lesson-plans:validate` | 2 plans, 10 instructional days; passed |
| `sha256sum -c src/game/assets/audio/phonemes/SHA256SUMS` | all seven provisional audio files passed |
| `npx prisma validate` from `server/` | schema valid |
| `npm run curriculum:kindergarten:simulate -- 10` | five JSON profile sequences generated and inspected |
| 20-selection harness used by Jest | 100 selections across Profiles A–E passed sequence invariants |

## 11. Limitations

- Qualified phoneme audio review and real-device listening inspection cannot be automated and remain the production blocker.
- The slice remains disabled by default. The two explicit environment flags above permit private preview without misrepresenting the audio as reviewed.
- Pointer/keyboard semantics are implemented with native buttons and fieldsets, but a browser-based assistive-technology/manual primary-flow check is still required with the real audio assets.
- Current hints preserve evidence safety and specific misconception feedback, but do not yet animate every `L1`–`L3` visual transformation described in Stage 2B.
- A game handoff is omitted because no current game can enforce the short-`a` reviewed example scope. The design explicitly permits no game offer in that case.
- Review activities are authored, but broader scheduled-review selection and spacing policy are deferred with the K–2 expansion.
- Live AI dialogue, speech recognition/pronunciation scoring, offline mastery, and broad K–2 content are intentionally out of scope.

## 12. Deferred to Stage 4

Stage 4 should begin only after the audio gate and manual primary-flow review are complete. It should first try to disprove the Stage 3 progression, evidence, accessibility, and content assumptions; correct defects; then generalize the architecture across the remaining Kindergarten, Grade 1, and Grade 2 graph. Existing print-concept content remains available through the legacy reviewed catalog and was not deleted.

## Stage completion answer

For private preview, the provisional assets let a five-year-old begin the narrated sound activities while the adult listens alongside her. The public-readiness answer remains no until a qualified reviewer approves or replaces each cue; the app keeps that distinction explicit rather than treating general IPA samples as reviewed curriculum audio.
