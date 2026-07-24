# Molly's Learning Game — Codex Curriculum Execution Guide

This document is the primary implementation index for the standalone Common Core Learning system.

The Common Core Learning system must remain completely separate from all existing games and Phaser code unless a future ticket explicitly changes that rule.

## 1. Non-negotiable architecture boundary

The repository contains two separate areas.

### Existing games

- Fossil Digging
- Dragon Adventure
- Space Shooter
- Phaser scenes
- Existing game state, scoring, rewards, assets, and save data

### Standalone Learning system

- Common Core standards catalog
- Question templates
- Deterministic question generation
- Practice
- Diagnostic
- Progress
- Attempts
- Mastery
- Review scheduling
- Adult content review
- Coverage reports

The Learning system must not:

- import Phaser;
- import existing game scenes;
- reuse game scoring, rewards, health, lives, loot, or game currency;
- modify game save data;
- require existing game assets;
- award curriculum mastery through game activity.

Add dependency tests that prove curriculum and Learning modules do not import game or Phaser modules.

## 2. Source-of-truth documents

Codex must read these documents before implementation.

### Governing implementation prompt

`prompts/00_IMPLEMENT_CURRICULUM_SYSTEM.md`

Defines the overall architecture, standards import, question model, validation, mastery, diagnostics, accessibility, privacy, and delivery expectations.

### Curriculum import ticket

`prompts/01_CURRICULUM_IMPORT_AND_DOMAIN.md`

Use for standards-domain and import work only.

### Question engine ticket

`prompts/02_QUESTION_ENGINE_AND_VALIDATION.md`

Use for deterministic templates, generated instances, generators, evaluation, and validation.

### Mastery and diagnostic ticket

`prompts/03_DIAGNOSTIC_MASTERY_AND_SELECTION.md`

Use for attempts, mastery, spaced review, diagnostics, prerequisites, selection, and session planning.

### K–2 content ticket

`prompts/04_K2_VERTICAL_SLICE_CONTENT.md`

Use for content authoring and generator expansion. Ignore any old game-integration language if present. The current architectural rule is standalone Learning only.

### Phaser adapter ticket

`prompts/05_PHASER_ADAPTERS_AND_COVERAGE_UI.md`

Do not use this ticket at this time. It is intentionally deferred.

## 3. Curriculum data and source documents

### Vendored K–5 standards

`data/curriculum/generated/common-core-k5-standards.json`

This is the supported standards import source.

Expected totals:

- 695 K–5 records
- 504 ELA records
- 191 mathematics records

Do not download or scrape another standards dataset during builds.

### Tabular standards copy

`data/curriculum/generated/common-core-k5-standards.csv`

Use for manual review and reporting, not as a second source of truth.

### Dataset integrity manifest

`data/curriculum/generated/common-core-k5-manifest.json`

Use to verify counts, hashes, and generation details.

### Pinned raw recovery snapshot

`resources/raw/ccss-recovery-source-philngo-rev-02895145.csv`

Use only to reproduce the normalized dataset.

### Offline rebuild scripts

- `scripts/build-vendored-common-core.py`
- `scripts/build-vendored-common-core.ps1`
- `scripts/build-vendored-common-core.cmd`

On Windows, prefer:

```powershell
./scripts/build-vendored-common-core.ps1
```

or:

```powershell
py -3 scripts/build-vendored-common-core.py
```

### Source recovery explanation

`docs/curriculum/DATA_SOURCE_RECOVERY.md`

Read before changing the standards pipeline.

### Resource and licensing inventory

`docs/curriculum/RESOURCE_MANIFEST.md`

Use to determine which sources may be copied, adapted, referenced, or avoided.

### Attribution requirements

`docs/curriculum/ATTRIBUTIONS.md`

Preserve the required Common Core notice and item-level attribution.

### Content authoring rules

`docs/curriculum/CONTENT_AUTHORING_RULES.md`

This is authoritative for educational validity, accessibility, distractors, explanations, passages, phonics, mathematics correctness, review, and child-safe feedback.

### Implementation sequence

`docs/curriculum/IMPLEMENTATION_SEQUENCE.md`

Use for phase order and release expectations.

## 4. Schemas

Codex must inspect all schemas under `data/curriculum/schemas/`.

Expected schemas:

- `standard.schema.json`
- `question-template.schema.json`
- `question-instance.schema.json`
- `attempt-event.schema.json`
- `mastery-record.schema.json`

Do not silently weaken schema requirements to make invalid content pass.

When adding new data types, add versioned schemas and migration behavior.

## 5. Current implementation phases

### Phase 1 — Standards import and domain

Definition of done:

- all 695 standards imported;
- unique official IDs;
- canonical IDs retained;
- inactive and not-applicable rows excluded from playable selection;
- exact statements retained;
- curriculum code independent of Phaser;
- idempotent import;
- tests passing.

### Phase 2 — Deterministic question engine

Definition of done:

- `QuestionTemplate` model;
- `QuestionInstance` model;
- seeded deterministic generation;
- stable instance IDs;
- answer evaluation and normalization;
- distractor validation;
- provenance;
- review states;
- production exclusion of unreviewed templates;
- generator validation over large seed samples.

### Phase 3 — Attempts, mastery, diagnostic, and selection

Definition of done:

- immutable attempt events;
- duplicate-instance protection;
- per-standard mastery;
- spaced review;
- per-domain or per-strand diagnostic placement;
- deterministic next-question selection;
- selection-reason reporting;
- session planning;
- persistence;
- no speed requirement for mastery.

### Phase 4 — Standalone Learning UI

The Learning area must be outside the Games area.

Suggested routes:

- `/learning`
- `/learning/practice`
- `/learning/diagnostic`
- `/learning/progress`

Suggested navigation:

- Learning
  - Practice
  - Diagnostic
  - Progress

The Learning area must not instantiate Phaser.

### Phase 5 — Content authoring and expansion

Do not claim assessment readiness based only on imported standards or generator code.

## 6. Current content limitation

The current production catalog may contain only a small number of reviewed templates.

A seed fix does not create more educational content.

For meaningful practice and diagnostics, each supported standard should aim for:

- at least four independent diagnostic probes;
- at least two meaningfully different question forms where feasible;
- at least twenty valid generated instances per template where the skill permits;
- multiple reviewed templates contributing mastery evidence;
- no repeated instance within a ten-question practice session;
- varied target words, numbers, passages, and answer positions.

A template with many seeds but only four distinct rendered questions has an effective variety of four.

Coverage reporting must use effective variety, not theoretical seed count.

## 7. Content review workflow

Codex must not mark newly generated content as human reviewed.

New templates should begin as:

```json
{
  "review": {
    "status": "validated"
  }
}
```

Required review tooling should include commands equivalent to:

- `curriculum:content:review-packet`
- `curriculum:content:approve --template <template-id> --reviewer "<name>"`
- `curriculum:content:reject --template <template-id> --reviewer "<name>" --notes "<reason>"`
- `curriculum:content:retire --template <template-id> --reviewer "<name>"`

Approval must record:

- reviewer;
- timestamp;
- template version;
- content hash;
- review notes.

Changing approved content must increment the version, invalidate prior approval, and return the template to a non-production state.

Do not add an unrestricted bulk-approve command.

## 8. Initial Kindergarten content targets

Before expanding higher grades, establish sufficient depth for:

### ELA

- `K.RF.1.d`
- `K.RF.2.a`
- `K.RF.2.d`

### Mathematics

- `K.CC.A.1`
- `K.CC.A.2`
- `K.CC.A.3`

Recommended minimum after approval:

- 24 reviewed templates total across the six standards;
- four independent diagnostic probes per standard;
- at least one hundred effective practice instances per standard where practical;
- multiple item forms for each standard;
- no repeated instance in a ten-question practice session.

## 9. Required reusable content pools

Avoid duplicating arrays inside multiple templates.

Create centralized reviewed pools for:

### ELA

- alphabet and case pairs;
- letter-sound mappings;
- vowels and consonants;
- rhyme families;
- CVC words;
- phoneme metadata;
- digraphs and blends;
- irregular words;
- prefixes, suffixes, and roots;
- passages and passage metadata.

### Mathematics

- number words;
- counting ranges;
- visual object arrangements;
- operation bounds;
- place-value configurations;
- time values;
- U.S. coin values;
- measurement units;
- graph datasets;
- shape definitions;
- fraction representations;
- coordinate-plane data.

Each pool entry must include provenance and review state when applicable.

## 10. K–2 expansion order

After Kindergarten variety is sufficient, expand in this order:

1. Kindergarten ELA
2. Kindergarten mathematics
3. Grade 1 ELA
4. Grade 1 mathematics
5. Grade 2 ELA
6. Grade 2 mathematics

Do not begin Grades 3–5 until K–2 coverage and review workflows are stable.

## 11. Original passage requirements

Store passages separately from question templates.

Each passage should include:

- stable ID;
- title;
- grade band;
- genre;
- word count;
- readability metadata;
- topics;
- provenance;
- review status;
- supported standard IDs.

Use project-original passages only unless licensing is explicit and recorded.

Every comprehension answer must be grounded in the stored passage.

## 12. Unsupported standards

Do not invent weak browser proxies for standards the interface cannot validly assess.

Maintain a machine-readable unsupported report with:

- standard ID;
- reason;
- required capability;
- whether adult observation is appropriate;
- possible future implementation;
- current substitute, if any.

Likely unsupported or partially supported examples:

- oral prosody;
- collaborative speaking;
- handwriting;
- extended writing quality without adult review;
- physical measurement;
- subjective drawing;
- sustained presentation.

Coverage states:

- `uncovered`
- `draft`
- `partiallyCovered`
- `assessmentReady`
- `unsupportedByCurrentInterface`

## 13. Practice-session requirements

A practice session should:

- use reviewed production templates only;
- avoid repeated instances;
- avoid immediate template repetition when alternatives exist;
- vary answer positions;
- use current targets, prerequisites, reviews, and optional challenges;
- retain deterministic reproducibility under a supplied session seed;
- persist session progress where supported;
- return a content-pool warning when alternatives are exhausted.

Development diagnostics should expose:

- session seed;
- question seed;
- instance ID;
- template ID;
- standard ID;
- eligible candidate count;
- recent-history size;
- selection reason;
- repetition-constraint relaxation.

Hide these details in production child-facing mode.

## 14. Diagnostic requirements

Diagnostics are intentionally short.

For a given domain or strand:

- ask four independent reviewed probes;
- advance with at least three correct;
- stop with one or fewer correct;
- ask two tie-breakers when exactly two are correct;
- do not use speed;
- do not count diagnostic results as full mastery by default;
- do not assign one overall grade level;
- do not repeat an instance;
- do not reuse the same narrow item form when alternatives exist.

A standard is not diagnostic-ready unless it can supply four independent probes.

## 15. Mastery requirements

Default policy:

- at least eight scored attempts;
- at least 80% accuracy over the most recent ten scored attempts;
- evidence from at least three distinct sessions;
- evidence from at least two templates or response formats;
- three most recent independent attempts correct;
- answer-revealing hints excluded from independent mastery evidence;
- duplicate question instances excluded from repeated evidence.

Review intervals:

- 1 day
- 3 days
- 7 days
- 14 days
- 30 days

Use an injected clock.

## 16. Required validation

For each production generator configuration, run at least 1,000 deterministic seeds where practical.

Report:

- unique instances;
- unique prompts;
- unique answers;
- unique targets;
- unique distractor sets;
- unique answer arrangements;
- duplicate rate;
- effective variety.

Reject production content when:

- a standard reference is invalid;
- the prompt is empty;
- a correct answer is ambiguous;
- a distractor equals the answer;
- choices repeat;
- bounds are invalid;
- accessibility metadata is missing;
- provenance is missing;
- content is not reviewed;
- effective variety is too small for its declared coverage state.

## 17. Required test categories

### Standards

- exact record count;
- uniqueness;
- schema validation;
- idempotent import;
- inactive rows excluded.

### Questions

- same seed produces the same instance;
- different seeds create valid variation;
- stable instance IDs;
- correct evaluation;
- invalid standard rejection;
- production exclusion of unreviewed content.

### Variety

- no repeated instance in a ten-question session;
- more than one template form used;
- answer positions vary;
- diagnostic probes are independent;
- content exhaustion returns a warning.

### Mastery and review

- threshold transitions;
- distinct-session requirement;
- hint exclusion;
- duplicate-instance exclusion;
- review scheduling;
- failed-review behavior.

### UI

- Learning route is reachable;
- Learning does not instantiate Phaser;
- question submission reaches the curriculum application layer;
- progress updates;
- persisted state restores where supported;
- development diagnostics are hidden in production.

### Separation

- curriculum modules do not import Phaser;
- curriculum modules do not import game modules;
- existing game routes and behavior remain unchanged.

## 18. Required reports and commands

Codex should maintain commands equivalent to:

- `curriculum:import`
- `curriculum:validate`
- `curriculum:coverage`
- `curriculum:questions:validate`
- `curriculum:questions:generate`
- `curriculum:diagnostic`
- `curriculum:mastery:recalculate`
- `curriculum:review:due`
- `curriculum:session:plan`
- `curriculum:content:review-packet`
- `curriculum:content:approve`
- `curriculum:content:reject`
- `curriculum:content:retire`
- `curriculum:content:unsupported`
- `curriculum:passages:validate`
- `test:curriculum`
- `test:learning:e2e`

Adapt names to repository conventions.

## 19. Definition of done for each change

Every Codex change must report:

1. Files added or modified
2. Architecture decisions
3. Standards affected
4. Templates added or changed
5. Review-state changes
6. Commands added or changed
7. Tests run and results
8. Coverage-state changes
9. Remaining content limitations
10. Confirmation that existing games were not modified

Do not accept “implemented” without executed tests and exact counts.

## 20. Recommended Codex workflow

For each task:

1. Read this guide.
2. Read the governing prompt.
3. Read the applicable numbered ticket.
4. Inspect the repository.
5. Run current tests before changing code.
6. Report material architectural conflicts.
7. Implement one phase only.
8. Run focused and regression tests.
9. Produce coverage and content reports.
10. Commit separately before starting the next phase.

## 21. Current next task

The current priority is not Grades 3–5.

The immediate priority is:

- expand the six visible Kindergarten standards;
- create at least 24 validated templates;
- generate a review packet;
- have a human approve sufficient templates;
- reach four independent diagnostic probes per standard;
- verify a ten-question practice session with no repeated instance;
- keep all games unchanged.

Only after this is stable should Codex proceed to full K–2 expansion.
