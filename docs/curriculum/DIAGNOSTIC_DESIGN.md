# Diagnostic design

## POC model

The diagnostic is a deterministic, standards-coverage assessment rather than a fixed quiz. It uses actual reviewed, diagnostic-eligible templates from the K–2 catalog. A `DiagnosticBlueprint` describes each grade and domain, the representative standards required for coverage, evidence thresholds, weights, critical-prerequisite status, and item limits.

For the POC, each domain requires up to two representative standards. Each standard normally needs two independent generated question instances. Two correct responses establish `MASTERED`; mixed evidence remains `INSUFFICIENT_EVIDENCE` and triggers up to two additional probes. At the maximum, 75% correct is `MASTERED`, lower mixed performance is `DEVELOPING`, and repeated misses are `EMERGING`. The policy is centralized and can later vary by authored standard.

## State machine

```text
START GRADE
    |
    v
select uncovered standard across domains
    |
    v
record one unique independent instance
    |
    +-- required evidence missing ----------> select next probe
    |
    +-- mixed/uncertain and below maximum --> probe same skill again
    |
    v
evaluate all domain requirements
    |
    +-- coverage incomplete ----------------> select next probe
    +-- critical domain incomplete ---------> finish at this instructional level
    +-- overall threshold not met ----------> finish at this instructional level
    +-- next grade exists ------------------> START NEXT GRADE
    +-- K-2 ceiling demonstrated -----------> finish at Grade 2
```

The first pass favors breadth: one probe for every required standard across domains before any standard receives its second probe. Additional probes target uncertainty. The question count is therefore a result of the blueprint and learner evidence, not a fixed four-item constant.

## Evidence model

Each `DiagnosticSkillEvidence` contains:

- standard and domain identifiers;
- attempt, correct, and incorrect counts;
- recent performance;
- distinct question-instance and template IDs;
- observed difficulty bands;
- numeric confidence and an explicit status;
- whether the standard belongs to a critical domain.

Statuses are `UNASSESSED`, `INSUFFICIENT_EVIDENCE`, `EMERGING`, `DEVELOPING`, `MASTERED`, and `STRONG_MASTERY`. Duplicate question-instance IDs are ignored. A single response always remains insufficient evidence.

## Coverage and mastery

A domain is covered only when every selected representative standard has reached the policy's minimum evidence. A domain is mastered when its configured proportion of selected standards is mastered. A grade can advance only when:

1. every domain is covered;
2. the weighted proportion of mastered domains meets the grade threshold; and
3. every critical domain is mastered.

ELA Reading Foundational Skills (`RF`) is critical. Kindergarten Math Counting and Cardinality (`CC`) is critical; Grade 1–2 Operations (`OA`) and Base Ten (`NBT`) are critical. These are explicit POC policy choices and are isolated in configuration for later curriculum review.

No unrelated strength can average away a failed critical domain. An incomplete blueprint produces an unresolved result, never mastery.

## Question selection

Blueprint construction groups templates by their catalog/standards domain and deterministically rotates standards from the session seed. Selection then uses this priority:

1. unassessed required standards, interleaved across domains;
2. required standards below minimum evidence;
3. mixed standards below their maximum evidence;
4. no question when a defensible grade decision is available.

Within a standard, unseen templates are preferred. When only one generator exists, a new deterministic seed produces a different question instance. Previously used instance IDs are rejected as new evidence.

## Floor, ceiling, and strand placement

Assessment starts at Kindergarten to establish a verified floor. Failure at Kindergarten yields Kindergarten as the starting instructional level and stops upward testing. Passing a grade opens the next grade. The first grade with incomplete prerequisites becomes the recommended starting instructional level. Passing the Grade 2 ceiling yields Grade 2 because the catalog cannot yet justify a higher recommendation.

Each domain also retains its own instructional level. A domain that passes Kindergarten but not Grade 1 is reported as Grade 1, while stronger domains may retain Grade 2 evidence. The simplified overall grade does not erase those strand results.

## Stopping and confidence

A grade stops when coverage and all uncertainty probes are resolved, or when its configured maximum is reached. The whole assessment stops at the first non-passing grade or the catalog ceiling. Confidence is:

- `HIGH` when required coverage is complete and all selected skills are decisive;
- `MODERATE` when coverage is complete but one or more skills remain explicitly unresolved at the maximum;
- `LOW` when a safety cap prevents required coverage.

The report exposes coverage numerically and lists unresolved skills rather than converting them to mastery.

## Persistence and idempotency

`CurriculumLearningSession.state` stores the current generated question (including its server-only answer), blueprint, evidence, stage, selected template IDs, and submitted instance IDs after every state transition. The service can rehydrate this state after a process restart. The browser's local session ID is only a pointer.

Attempts retain the database uniqueness key `(learnerId, sessionId, questionInstanceId, purpose)`. Repository insertion is idempotent, and session evidence also de-duplicates question-instance IDs. A completed session is checkpointed before its report is returned.

## Learning relationship

Diagnostic attempts remain in the same immutable attempt stream as learning and practice. To avoid claiming durable classroom mastery from a short placement assessment, they do not directly grant the existing spaced-practice `mastered` state. Instead, the detailed diagnostic evidence becomes part of the durable learner report, and `EMERGING`/`DEVELOPING` standards become active `CurriculumLearningTarget` records. Existing practice selection prioritizes these targets. Thus placement immediately changes instruction without conflating placement confidence with long-term retained mastery.

## Parent-facing output

The persisted/API report includes overall level, confidence, evidence coverage, total responses, demonstrated strengths, reinforcement needs, critical prerequisite gaps, unresolved skills, per-domain instructional levels, and per-standard evidence. The child screen continues to show a neutral “check” and encouraging feedback; detailed evidence is shown in Progress.

## Known POC limitations

- Representative standards are algorithmically selected because no human-authored blueprint file yet identifies the most instructionally important subskills.
- Most standards have one generator template, so independence relies on reviewed seed variation rather than multiple item forms.
- Difficulty metadata is largely band 1 and cannot yet support calibrated ability estimates.
- Automatic placement covers ELA and Math only. Writing, speaking/listening, investigations, and performance tasks need adult evidence.
- Grade 2 is the assessment ceiling, so a strong result means “at least Grade 2 within this catalog,” not a measured Grade 3 placement.
- The POC checkpoints every response and allows leaving/resuming, but does not yet schedule a child-facing break automatically.
