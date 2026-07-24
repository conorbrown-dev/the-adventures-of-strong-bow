# Codex Prompt: Implement the Common Core K–5 Curriculum System

You are working in Molly's Learning Game, an existing browser-based TypeScript game
that uses Phaser. Inspect the repository before changing code. Detect its package
manager, folder conventions, testing framework, persistence strategy, and existing
domain boundaries. Follow the repository's established style unless this prompt
explicitly requires a stronger boundary.

## Goal

Implement a curriculum and assessment subsystem that lets the game:

- import the complete official Common Core K–5 Mathematics and English Language
  Arts standards;
- associate every quiz question with one or more official standard identifiers;
- generate deterministic, validated question instances from reviewed templates;
- run strand-aware diagnostics;
- track mastery and spaced review per standard;
- expose game-mode-neutral questions to Phaser scenes;
- report curriculum coverage and content gaps;
- support future AI-assisted authoring without trusting AI at runtime.

The curriculum subsystem must not depend on Phaser. Phaser scenes may consume it
through an application-facing API or adapter.

## Source files

The source download scripts place official materials in `resources/raw/`.

Expected files:

- `data/curriculum/generated/common-core-k5-standards.json`: vendored normalized K-5 standards
- `Math_Standards1.pdf`: official mathematics reference
- `ELA_Standards1.pdf`: official ELA/literacy reference
- `common-core-public-license.html`
- `common-core-developers-and-publishers.html`

The vendored JSON file is the supported import source. It was built from a pinned recovery snapshot because both official machine-readable download links were unavailable. The PDFs are human-review references. Builds must not require network access or PDF parsing. Read `docs/curriculum/DATA_SOURCE_RECOVERY.md` before changing the source pipeline.

Read:

- `docs/curriculum/RESOURCE_MANIFEST.md`
- `docs/curriculum/ATTRIBUTIONS.md`
- `docs/curriculum/CONTENT_AUTHORING_RULES.md`
- every schema under `data/curriculum/schemas/`

## Required architecture

Create a curriculum domain/application boundary that fits the existing repository.
Names may be adapted to local conventions, but responsibilities must remain separate.

Suggested responsibilities:

- `curriculum/domain`
  - `Standard`
  - `QuestionTemplate`
  - `QuestionInstance`
  - `Attempt`
  - `MasteryRecord`
  - mastery and diagnostic policies
- `curriculum/application`
  - import curriculum
  - select next question
  - submit answer
  - run diagnostic
  - produce coverage report
- `curriculum/infrastructure`
  - vendored JSON import adapter
  - JSON or database repositories
  - clock/random implementations
- `curriculum/game-adapters`
  - map neutral question instances into Fossil Digging, Dragon Adventure,
    Space Shooter, and later game modes

Do not place mastery logic, correct-answer logic, or standard selection inside Phaser
scenes. Do not create a hierarchy of one class per standard or question.

## Official-standard import

Build an idempotent CLI or package script that:

1. reads `data/curriculum/generated/common-core-k5-standards.json`;
2. verifies the file against `common-core-k5-manifest.json` or reruns the vendored build script;
3. imports all included Mathematics and ELA records for grades K, 1, 2, 3, 4, and 5;
4. preserves:
   - official identifier;
   - exact official statement;
   - subject;
   - grade;
   - strand/domain;
   - cluster/category hierarchy;
   - parent identifier when present;
   - GUID, official URI, notation, and other official identifier fields when present;
   - source URI or source-file reference;
   - copyright and license metadata;
5. writes normalized output to the repository's selected persistence mechanism;
6. produces a deterministic generated artifact or seed;
7. fails loudly on duplicate identifiers, malformed hierarchy, or missing required
   metadata;
8. can be rerun without creating duplicate records.

Never overwrite the exact official statement with a child-friendly paraphrase.
Store paraphrases separately.

Preserve the supplied hierarchy, leaf status, instructional status, provenance, and canonical identifiers. Do not silently rewrite vendored statements during import.

Add the required Common Core copyright notice from
`docs/curriculum/ATTRIBUTIONS.md` wherever the standards are publicly displayed.

## Question model

A reviewed `QuestionTemplate` is an authoring artifact. A `QuestionInstance` is a
playable, deterministic realization of a template.

Each template must include:

- stable template ID;
- one primary standard ID and optional supporting standard IDs;
- grade and subject;
- response type;
- prompt modality requirements;
- generator kind and constrained parameters;
- answer derivation or answer specification;
- distractor strategy;
- difficulty band;
- compatible game modes;
- provenance;
- review status;
- schema version.

Each generated instance must include:

- stable instance ID derived from template ID plus seed;
- generation seed;
- rendered prompt;
- answer choices or interaction payload;
- canonical correct answer;
- explanation;
- standard IDs;
- accessibility payload;
- provenance.

Generation must be deterministic for the same template version and seed.

## Initial response types

Support a small extensible set rather than arbitrary scene-specific payloads:

- `singleChoice`
- `multipleChoice`
- `numericInput`
- `textInput`
- `sequence`
- `classification`
- `matching`
- `pointSelection`
- `constructedResponse` as non-auto-scored unless a deterministic rubric exists

K–1 questions must be able to provide an audio prompt so that unrelated reading
ability does not prevent Molly from demonstrating the target skill.

## Validation

Validate templates at build/import time and instances at generation time.

Reject content when:

- a referenced standard does not exist;
- a choice question has zero or multiple canonical answers when only one is allowed;
- distractors repeat the answer or each other after normalization;
- the prompt is empty;
- the answer cannot be derived deterministically;
- generated numbers violate configured bounds;
- a division template can divide by zero;
- a requested visual count exceeds the allowed range;
- required audio/visual accessibility metadata is absent;
- a template is unreviewed in a production content bundle;
- source or license provenance is missing.

Add property-based or high-volume randomized tests for generators when the repository
already has a suitable library. Otherwise run each generator over at least 1,000
seeds in a deterministic validation test.

## Mastery model

Use these states:

- `notStarted`
- `learning`
- `practicing`
- `mastered`
- `reviewDue`

Use a transparent, testable policy rather than an opaque AI score.

Default mastery rule:

- at least 8 scored attempts for the standard;
- at least 80% correct over the most recent 10 scored attempts, or all attempts if
  fewer than 10;
- evidence from at least 3 distinct sessions;
- evidence from at least 2 question templates or response formats;
- the three most recent independent attempts must be correct without an answer hint.

A repeated identical question instance must not add fresh mastery evidence.

After mastery, schedule review at approximately 1, 3, 7, 14, and 30 days. Make the
interval policy configurable and inject a clock for tests. A failed review returns
the skill to `practicing`; it does not erase historical attempts.

Response speed must not be required for mastery. Timed play can affect game bonuses,
but not whether Molly knows the skill.

## Diagnostic policy

Diagnostics are per strand/domain, not one global "grade level."

For each strand:

1. begin at Kindergarten unless prior evidence exists;
2. ask short independent probes from reviewed diagnostic-eligible templates;
3. advance one grade when at least 3 of 4 probes are correct;
4. stop advancing when 1 or fewer of 4 are correct;
5. when exactly 2 are correct, ask 2 additional probes:
   - advance when both are correct;
   - otherwise place the learner at the current grade and mark prerequisite gaps;
6. never ask beyond Grade 5;
7. do not count diagnostic probes as full mastery evidence unless explicitly
   configured.

Return a profile such as "Grade 1 phonics; Kindergarten reading comprehension;
Grade 2 counting/place value" rather than a single grade label.

## Question selection

Select the next learning question using this priority:

1. overdue reviews;
2. prerequisite gaps blocking an active skill;
3. current learning targets;
4. mixed retrieval practice from mastered skills;
5. optional challenge content one step above the demonstrated level.

Avoid repeating the same template or answer pattern too frequently. Selection must
be deterministic under an injected random seed for tests.

## AI-assisted authoring boundary

AI may assist an adult authoring workflow, but it must not be the runtime authority.

Required rules:

- no AI API key in browser code;
- do not send Molly's name, profile, attempts, voice, or other child data to an AI
  provider;
- AI-generated questions enter as `draft`;
- every draft must pass schema validation, deterministic answer validation, content
  validation, and human review before production;
- preserve model/provider, prompt version, timestamp, and reviewer provenance;
- passage questions must use original or clearly licensed passages;
- never copy a copyrighted story merely because a curriculum lesson references it.

## Accessibility and child-safety requirements

- large touch targets and keyboard support;
- replayable audio prompts;
- visible text for all spoken instructions;
- no requirement to read instructions when the skill being tested is pre-reading;
- reduced-motion support;
- no shame language, public failure ranking, or loss of earned mastery;
- immediate corrective feedback after an answer is committed;
- show the correct reasoning, not only "wrong";
- wrong answers may affect a temporary game state, but repeated failure must lower
  difficulty or offer instruction rather than create a fail loop.

## Game adapters

Expose neutral question data to each game mode.

Examples:

- Fossil Digging: classification, letter/phoneme identification, counting, shapes
- Dragon Adventure: word building, vocabulary, arithmetic, sentence construction
- Space Shooter: fast recognition and fluency items with accessibility-safe timing
- Boss/story encounters: passage comprehension and multi-step problems

The scene reports an answer through the application API. The scene must not know the
canonical answer before submission unless necessary to render choices.

## Persistence and privacy

Use the repository's existing persistence approach. Store only what is needed:

- pseudonymous/local learner ID;
- attempt events;
- mastery records;
- diagnostic state;
- settings.

Do not introduce analytics or cloud child profiles as part of this ticket.

## Tests

At minimum, add tests for:

- vendored K–5 import count, uniqueness, and schema validation;
- import idempotency;
- duplicate and missing standard references;
- generator determinism;
- generator validity over many seeds;
- answer normalization;
- mastery transitions;
- spaced-review scheduling;
- diagnostic advancement and stopping;
- next-question priority;
- production bundles rejecting unreviewed content;
- a Phaser adapter submitting an answer without owning curriculum logic.

## Developer tooling

Add commands that match the repository's package manager, equivalent to:

- `curriculum:download`
- `curriculum:import`
- `curriculum:validate`
- `curriculum:coverage`
- `test:curriculum`

The coverage report must show, by grade, subject, domain, and standard:

- number of active templates;
- number of diagnostic-eligible templates;
- supported response types;
- compatible game modes;
- reviewed/unreviewed counts;
- standards with no question coverage.

## Delivery sequence

Implement the numbered tickets in `prompts/` in order. Keep commits or change groups
small enough to review.

Do not claim K–5 assessment coverage merely because the official standards have
been imported. Coverage means reviewed, validated question templates exist and are
reported.

## Completion response

When finished, report:

1. files and modules added or changed;
2. commands to download/import/validate;
3. number of K–5 standards imported by subject and grade;
4. number of reviewed templates by standard and game mode;
5. remaining uncovered standards;
6. tests executed and results;
7. any source/licensing issue that blocked an import.

## Unavailable official machine-readable sources

Do not request or depend on `ccssi.zip` or `E0607_ccss_identifiers.csv`. Both were
unavailable when the dataset was prepared. The supported source is the vendored JSON
plus its pinned recovery snapshot and reproducible build script. Treat replacement
with a restored official machine-readable source as a later migration, not a blocker.
