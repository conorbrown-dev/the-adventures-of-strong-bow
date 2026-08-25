# Diagnostic gap analysis

## Current behavior

The Learning UI starts a subject-specific diagnostic through `LearningFacadeService`. The service loads reviewed, diagnostic-eligible K–2 templates, groups them by grade, and selects up to six templates per grade with a domain round-robin. Every assessment starts at Kindergarten regardless of the learner's configured grade.

Within each grade, the current state machine asks four questions. Three correct answers advance to the next grade. Exactly two correct answers add two tie-breakers, and both tie-breakers must be correct to advance. A miss stops upward testing. Attempts are stored immutably and the final `CurriculumDiagnosticPlacement` stores a grade and the IDs of incorrectly answered standards.

The browser saves the active session ID, but the server keeps the authoritative session only in an in-process `Map`. Although `CurriculumLearningSession` exists in Prisma, the diagnostic does not use it. Refresh works only while the same server process remains alive.

## Evidence currently collected

- An immutable attempt records question instance, template, primary/supporting standards, answer, correctness, hint use, independence, purpose, and time.
- The active in-memory session records grade, score, selected templates, submitted instance IDs, and a flat list of diagnostic probes.
- The final placement records subject grouping, one grade, missed standard IDs, and completion time.
- The general mastery policy intentionally excludes diagnostic attempts from ordinary practice mastery.

The immutable attempt and uniqueness constraint are sound foundations. They are not currently assembled into per-skill evidence, coverage, confidence, strand placement, or a resumable assessment.

## Why the current approach is insufficient

The 3-of-4 gate treats question count as the definition of evidence. Domain-aware sampling improves variety, but four items cannot cover the four ELA domains (`L`, `RF`, `RI`, `RL`) or the five Kindergarten Math domains (`CC`, `G`, `MD`, `NBT`, `OA`) with repeated independent evidence. A correct answer is effectively allowed to stand in for an entire domain, and no standard can receive enough repeated evidence to distinguish mastery from a lucky response.

The score average also hides prerequisite gaps. For example, strong language and comprehension answers can offset a missed foundational reading answer. The flat missed-ID list does not say whether a skill was unassessed, uncertain, developing, or repeatedly missed.

## Domains that can be missed

The reviewed auto-assessable K–2 catalog currently exposes these placement domains:

- ELA: Language (`L`), Reading Foundational Skills (`RF`), Informational Reading (`RI`), and Literature (`RL`). Speaking/listening and authentic writing require adult observation and are intentionally not part of automatic placement.
- Math: Counting and Cardinality (`CC`, Kindergarten), Operations and Algebraic Thinking (`OA`), Number and Operations in Base Ten (`NBT`), Measurement and Data (`MD`), and Geometry (`G`).

With four questions, at least one Kindergarten Math domain must be omitted. Domain rotation can also select only one standard within a broad domain. The old grade score cannot prove breadth within `RF`, `OA`, or `NBT`.

## False-positive advancement

- One correct response can be interpreted as evidence for a broad standard or domain.
- A 3-of-4 average can advance despite an essential foundational miss.
- Random seed rotation, rather than an explicit coverage contract, determines which standards represent a grade.
- Repeated generated content is not considered when deciding whether evidence is independent.
- A final decision is forced even when evidence is sparse.

## False-negative placement

- Two slips in the initial four force tie-breakers, even if both misses are in a noncritical or unusually difficult domain.
- Two correct tie-breakers cannot describe a learner with uneven strands.
- The output collapses a learner with high comprehension and an isolated decoding gap into one lower grade without preserving the demonstrated strength.
- A server restart discards the session and forces the learner to begin again.

## Required architecture changes

The POC needs explicit diagnostic blueprints, per-standard evidence, domain requirements, critical-prerequisite gates, adaptive next-question selection, uncertainty states, strand-level results, confidence, learning targets, and durable session checkpoints. Placement must be derived only after required coverage is complete. Duplicate submissions must be idempotent at both the in-memory and database repository boundaries.

The existing immutable attempt model, reviewed content catalog, seeded generators, progress repository, controller boundary, and thin React client should be retained. Diagnostic rules belong in a curriculum application/domain module, not the UI or controller.

## POC versus later refinement

### Required for this POC

- Deterministic K–2 ELA and Math blueprints built from the reviewed catalog.
- Representative coverage of every available domain and repeated evidence for selected standards.
- Configurable evidence thresholds, critical domains, and maximum items.
- Extra probes for inconsistent evidence.
- Durable, resumable server-side state using `CurriculumLearningSession`.
- Detailed persisted reports with confidence, strand placement, strengths, gaps, unresolved skills, and item counts.
- Learning targets created from demonstrated gaps.
- Simulation and behavioral tests.

### Later refinement

- Empirically calibrated item difficulty and discrimination.
- Larger reviewed template pools for true form-level diversity.
- Authored prerequisite links for every standard and cross-domain dependency graphs.
- Starting-point estimates that can safely skip lower-level probes, with verification backchecks.
- Multi-session break scheduling and parent-controlled assessment windows.
- Adult-scored writing/speaking evidence integrated into a combined placement.
- Psychometric confidence intervals, norming, bias review, accommodations research, and longitudinal validation.
