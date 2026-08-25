# Common Core POC acceptance report

Date: 2026-07-27  
Branch / commit: `main` / `2698365`

> Historical acceptance snapshot. Its diagnostic findings describe the 2026-07-27 implementation and were superseded on 2026-08-25 by [DIAGNOSTIC_GAP_ANALYSIS.md](./DIAGNOSTIC_GAP_ANALYSIS.md), [DIAGNOSTIC_DESIGN.md](./DIAGNOSTIC_DESIGN.md), and [DIAGNOSTIC_SIMULATION_RESULTS.md](./DIAGNOSTIC_SIMULATION_RESULTS.md).

## Executive classification

The approved Kindergarten catalog and the isolated curriculum domain pass their validation and mastery-policy tests. The standalone React Learning UI does **not** yet select from that catalog or write curriculum attempt events, so the end-to-end proof of concept is **fail**. This report intentionally does not treat a launched UI or an approved catalog as an end-to-end pass.

| Subsystem | Classification | Evidence / limitation |
| --- | --- | --- |
| Approval records and catalog integrity | pass | 27 K approvals have reviewer, timestamp, note, and matching SHA-256 content hash. |
| Production eligibility | passWithLimitations | 32 catalog templates are `reviewed`; selection is not wired to this catalog. |
| Coverage / variety | passWithLimitations | Each target has 4+ reviewed probes, but variety is measured in the review artifact rather than an activated production bundle. |
| Practice selection and browser flow | fail | React Practice uses local `nextQuestion()` rather than approved catalog templates. |
| Diagnostic selection and persistence | notImplemented | Domain evaluator exists, but no standalone UI/API workflow invokes it. |
| Attempt recording | fail | UI writes browser summaries, not immutable `AttemptEvent` records. |
| Mastery and spaced review domain | pass | In-memory deterministic tests cover policy thresholds and injected-clock review scheduling. |
| Progress interface | fail | UI shows local totals only; no mastery, review date, placement, or production evidence. |
| Accessibility | passWithLimitations | Prompts expose audio text and visual count alternatives in catalog artifacts; full keyboard/focus/feedback workflow is not verified end to end. |
| Existing-game separation | passWithLimitations | No game source was changed; curriculum modules do not import Phaser. Existing game smoke coverage was not run separately. |

## Approved templates and approval integrity

The 27 Kindergarten templates are all `reviewed` by **Conor Brown**, with note **“reviewed and approved”** and individual timestamps recorded on 2026-07-27. `curriculum:content:validate` recalculated every stored content hash and passed. This verifies that no approved K template was modified after approval.

| Standard | Reviewed K templates | Stored/current hash status | Production eligibility |
| --- | ---: | --- | --- |
| K.RF.1.d | 5 | all match | eligible, not activated by UI |
| K.RF.2.a | 5 | all match | eligible, not activated by UI |
| K.RF.2.d | 4 | all match | eligible, not activated by UI |
| K.CC.A.1 | 4 | all match | eligible, not activated by UI |
| K.CC.A.2 | 5 | all match | eligible, not activated by UI |
| K.CC.A.3 | 4 | all match | eligible, not activated by UI |

Catalog counts: total 32; draft 0; validated 0; reviewed 32; retired 0. The five non-K legacy catalog rows are reviewed but were not part of this K approval review. No catalog row is excluded for review status. One unsupported entry remains: `K.RF.4`, because fluency requires adult observation.

## Coverage and diagnostic readiness

| Standard | Meaningful forms | Effective variety evidence | Independent probe capacity | Diagnostic / practice eligibility | Coverage state | Warnings |
| --- | ---: | --- | ---: | --- | --- | --- |
| K.RF.1.d | 3 | 1,000-seed review audit per template | 5 | catalog eligible | assessmentReady | UI not connected |
| K.RF.2.a | 3 | 1,000-seed review audit per template | 5 | catalog eligible | assessmentReady | rhyme pronunciation needs educator monitoring |
| K.RF.2.d | 3 | 1,000-seed review audit per template | 4 | catalog eligible | assessmentReady | UI not connected |
| K.CC.A.1 | 2 | 1,000-seed review audit per template | 4 | catalog eligible | assessmentReady | UI not connected |
| K.CC.A.2 | 2 | 1,000-seed review audit per template | 5 | catalog eligible | assessmentReady | UI not connected |
| K.CC.A.3 | 2 | 1,000-seed review audit per template | 4 | catalog eligible | assessmentReady | visual model is review-only until UI integration |

`assessmentReady` above means catalog readiness only: reviewed, diagnostic eligible, accessible prompt text present, and four or more probes. It is not a claim that the browser Practice or Diagnostic flow is ready.

## Practice and diagnostic evidence

Practice-session verification: **fail**. Five ten-question production sessions cannot be executed because `src/learning/learningService.ts` does not call `selectNextQuestion`, `planSession`, or the approved catalog generator. It uses a local question function and browser storage. Consequently no evidence exists that approved templates are selected, that unapproved templates are excluded, or that production selection reasons/session IDs are recorded.

Diagnostic verification: **notImplemented**. `evaluateDiagnostic()` has deterministic unit coverage for four-probe and tie-break behavior, but there is no diagnostic session assembler that restricts probes to approved catalog entries, persists placement, or connects results to the React route. Diagnostic outcomes do not grant mastery in the tested domain policy.

## Attempts, mastery, progress, and review evidence

The domain `AttemptEvent` has learner, session, instance, template/version, standard, answer, correctness, hint, purpose, timestamp, and context fields. `ProgressService` unit tests pass for duplicate-instance exclusion, hints excluded from mastery evidence, multiple-session/template evidence, mastery threshold, review due dates, successful interval advancement, and failed-review preservation.

The browser UI does not create those events; it stores `{ questionId, standardId, subject, correct, at }` in local storage. It therefore cannot prove immutable server persistence, diagnostic/practice separation, actual mastery calculation, or scheduled review selection. The Progress UI only presents local attempt totals and percentage.

## Accessibility and regression evidence

The approved catalog review packet displays exact spoken prompts, text alternatives, ordered answer choices, canonical answers, and visual count representations. Browser keyboard handling is smoke-tested on the standalone Learning start action, but focus after submission and accessible feedback announcements are not comprehensively verified.

No existing game files were changed by this verification. Curriculum server modules have no Phaser or game-module imports. Existing game routes were not separately smoke tested during this run; that is remaining regression work.

## Commands and test evidence

- `npm run curriculum:content:validate` — passed; 32 templates, 1 passage, 1 unsupported entry.
- `npm run curriculum:content:coverage` — passed; all six K standards report 4–5 reviewed probes.
- `npm run curriculum:questions:validate` — passed, but validates the separate five-template sample bundle (`productionBundle: false`), not the approved K catalog.
- `npm --prefix server run test:curriculum -- --runInBand` — passed: 21 tests.
- `npm test` — passed: 7 tests after post-approval assertion updates.
- `npx playwright test e2e/learning.spec.ts --project=chromium --reporter=line` — timed out in this environment. The authenticated fixture reaches the Vite app, but the runner does not complete the interaction sequence before timeout while `/api/tts` is unavailable. This is not accepted as browser-flow evidence.

## Known limitations and required next work

1. Build a production catalog adapter from approved catalog rows to reviewed `QuestionTemplate` objects.
2. Replace local React `nextQuestion()` selection with deterministic `planSession` / `selectNextQuestion` plus generated instances.
3. Add a standalone API/use case for immutable attempts and connect Practice and Diagnostic submissions.
4. Persist diagnostic placement, mastery, and review state; render those facts in Progress.
5. Add five reproducible ten-question browser sessions and diagnostic browser tests.
6. Add a dedicated existing-game route smoke suite.

The POC is not proven until these items are completed and tested.
