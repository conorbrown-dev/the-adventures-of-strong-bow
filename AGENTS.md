# Molly's Learning Academy contributor guide

## First principles

- Keep the experience accessible, child-friendly, and predictable. Favor clear labels, large targets, keyboard support, and concise instructions.
- Use TypeScript strictly. Prefer small, well-named types and functions over `any`, broad utility modules, or deeply nested conditionals.
- Make the smallest focused change that solves the request. Preserve existing user changes and do not refactor unrelated code opportunistically.
- Run `npm run build` after client changes and the relevant server test/build command after backend changes.

## Voice and audio

- All newly authored spoken UI, lesson, quiz, and hover narration must use the model-backed TTS service through `src/quiz/speech.ts` (`speak` / `stopSpeaking`). The service calls `POST /api/tts`, which is synthesized by the Piper model configured on the server.
- Do not call `window.speechSynthesis`, `SpeechSynthesisUtterance`, or browser voice selection directly from feature code. Browser synthesis is only the centralized fallback inside `src/quiz/speech.ts` when model TTS is unavailable.
- Cancel or stop a prior utterance before changing screens, starting another activity, or playing a replacement prompt. Avoid overlapping narration.
- Keep hover narration short: normally the control's visible label only. Use the existing hover sound in addition to, not instead of, spoken feedback.
- Reuse existing prerecorded assets for gameplay callouts when they fit. Add model TTS only for dynamic or new UI/lesson language.

## Frontend structure

```text
src/
  main.tsx                 # application bootstrap and Phaser/React boundary
  quiz/                    # React learning library, lesson, quiz, and speech UI
  game/
    assets/                # source art, sound, maps, and sprites
    config/                # Phaser game registration/configuration
    data/                  # immutable catalogs and curriculum content
    entities/              # reusable visible game actors
    modes/<mode-name>/     # mode-specific content, config, state, and themes
    scenes/                # scene composition and navigation
    systems/               # reusable gameplay coordination/rules
    ui/                    # reusable Phaser UI components
    utils/                 # narrow shared helpers, constants, and keys
```

### React

- Keep `QuizApp` as orchestration; extract a component or hook when a screen gains independent state, repeated markup, or non-trivial behavior.
- Use semantic HTML controls and labels. Provide `aria-label` text for icon-only controls and retain visible focus styling.
- Keep API calls and session storage in dedicated helpers such as `studentSession.ts`; do not scatter `fetch` calls across components.
- Keep side effects in `useEffect`, clean up event listeners/audio, and avoid storing values in state when they can be derived.
- Use the shared `speak` helper for all narration and `stopSpeaking` during navigation.

### Phaser

- Scenes own screen composition, camera setup, lifecycle wiring, and scene transitions. They should not accumulate reusable domain rules.
- Put a reusable actor with rendering/input/physics behavior in `entities/`; put coordination across actors and rules in `systems/`; keep mode-only behavior in `modes/<mode-name>/`.
- Register scenes only in `game/config/gameConfig.ts` and define stable keys in `game/utils/sceneKeys.ts`. Use `assetKeys.ts` for asset identifiers rather than string literals.
- Always clean up keyboard listeners, timers, sounds, and transient input zones on scene shutdown. Attach teardown to Phaser scene lifecycle events.
- Support pointer and keyboard interaction for menu controls. Keep selection state explicit and synchronize its visual state after either input method.
- Prefer data/config catalogs for learning prompts, stages, and options rather than scene-specific switch statements.

## Backend: domain-driven design

The Nest backend is organized by feature. Keep each feature self-contained and move toward this shape as it evolves:

```text
server/src/<feature>/
  domain/                  # entities, value objects, domain rules, repository ports
  application/             # use cases/services and command/query DTOs
  infrastructure/          # Prisma/external-service repository adapters
  interfaces/              # Nest controllers and transport DTOs
  <feature>.module.ts      # composition root for the feature
```

- The domain layer must not import Nest, Prisma, Express, or HTTP DTOs. Model business concepts and invariants there.
- Application services orchestrate use cases and depend on repository ports/interfaces, not Prisma clients or controllers.
- Infrastructure implements repository ports and external integrations (Prisma, Piper, storage, HTTP). Keep persistence mapping at this boundary.
- Controllers are thin: validate transport input, call one use case, and map the result to HTTP. Do not place domain decisions or database access in controllers.
- Define DTOs separately from domain entities. Validate incoming DTOs with `class-validator` and rely on the global `ValidationPipe` whitelist.
- Use dependency injection through feature modules. Keep module exports narrow; do not create a global service locator.
- Do not expose secrets, raw database errors, or stack traces to clients. Use purposeful exceptions and structured logs.
- Cache only deterministic, safe results. The TTS cache is keyed by input text; preserve bounded cache behavior when changing it.

## Coding style and quality

- Use `const` by default; use `let` only for genuine reassignment.
- Prefer guard clauses and focused helpers. Keep public methods short enough to understand without scrolling through unrelated work.
- Name booleans as predicates (`isLoading`, `hasSession`, `canStart`) and functions as actions (`startQuiz`, `loadStudent`).
- Avoid magic numbers and duplicated strings. Promote meaningful shared values to mode config, data, constants, asset keys, or scene keys.
- Keep comments for rationale, constraints, or non-obvious behavior—not to restate the code.
- Add or update focused tests for changed domain rules, quiz selection/scoring, and backend use cases. Avoid tests that only assert implementation details.

## Verification

- Client: `npm run build`; run `npm test` when quiz or game logic changes.
- Backend: from `server/`, run the relevant Jest tests and build/typecheck script before handoff.
- Check the primary flow after navigation changes: boot, main hub, section menus, narration, selected activity, and return navigation.
