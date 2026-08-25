Task: Redesign the Curriculum Diagnostic as a Real Placement Assessment

You are working on a browser-based homeschool learning platform intended to provide a serious educational alternative for homeschooled children.

This is not a casual educational game or a four-question quiz.

The curriculum/diagnostic system must be capable of determining, with reasonable educational confidence, what a learner knows, what prerequisite skills they are missing, and what instructional level they should begin at.

The current implementation is too simplistic.

For example, the current ELA diagnostic may ask approximately four Kindergarten questions and, based on those answers, decide whether the learner should move into Grade 1.

That is not sufficient evidence to conclude that a learner has mastered Kindergarten ELA.

Your task is to redesign the diagnostic and placement architecture around demonstrated mastery of curriculum skills, not around an arbitrary small number of questions.

Primary Product Goal

The placement system must answer:

What is the highest instructional level at which this learner has demonstrated enough prerequisite mastery to begin learning successfully?

The purpose is instructional placement, not simply assigning a grade label.

The diagnostic must identify:

Skills the learner has clearly mastered.
Skills that appear mastered but need additional evidence.
Skills the learner has not mastered.
Important prerequisite gaps.
The appropriate starting instructional level.
The specific standards/skills that should be remediated.
The confidence of the placement decision.

Do not assume that chronological age determines placement.

A learner may simultaneously have:

Grade 1 decoding ability,
Kindergarten phonemic awareness gaps,
Grade 2 vocabulary ability,
and Grade 1 writing ability.

The architecture must support this reality.

Critical Design Principle: Assess Skills, Not Just Grades

Do NOT implement placement as:

Ask 4 Kindergarten questions
↓
Pass?
↓
Try Grade 1

Instead, model each grade as a collection of domains, standards, skills, and prerequisite relationships.

For ELA, examples of skill families may include:

Print concepts
Phonological awareness
Phonemic awareness
Letter recognition
Letter-sound correspondence
Decoding
Encoding/spelling
High-frequency word recognition
Vocabulary
Reading comprehension
Listening comprehension
Language/grammar
Writing
Speaking/listening where assessable through the application

Use the actual curriculum catalog and standards already present in this repository rather than blindly using this example list.

Inspect the existing standards and determine the real domains represented by the curriculum.

Before Writing Code

First inspect the current implementation thoroughly.

Locate:

curriculum standards
standards hierarchy
question templates
diagnostic session logic
placement logic
attempt persistence
mastery calculations
question selection
Learning facade/services
APIs
database models
UI diagnostic flow
existing tests
documentation describing curriculum behavior

Then create:

docs/curriculum/DIAGNOSTIC_GAP_ANALYSIS.md

The document must explain:

How diagnostic placement currently works.
Why the current approach is insufficient.
What evidence is currently collected.
What important curriculum domains can currently be missed.
Where false-positive advancement can occur.
Where false-negative placement can occur.
What architectural changes are necessary.
Which changes are required for the current POC versus later refinement.

Do not start by blindly replacing the current system.

Understand the existing architecture first.

Diagnostic Model

Design the diagnostic around a skill evidence model.

Each assessed skill or standard should accumulate evidence.

Conceptually, support something like:

SkillEvidence

standardId
skillId
attemptCount
correctCount
incorrectCount
recentPerformance
difficultyLevelsObserved
confidence
status

Possible statuses:

UNASSESSED
INSUFFICIENT_EVIDENCE
EMERGING
DEVELOPING
MASTERED
STRONG_MASTERY

The exact domain model is your decision, but the system must represent the difference between:

answered one question correctly

and

provided enough independent evidence to reasonably infer mastery
Never Infer Mastery From One Question

A single correct answer is weak evidence.

The system should normally require multiple independent demonstrations of a skill before declaring mastery.

For example, a skill might require:

3-5 representative probes

depending on the nature of the standard.

However:

Do not blindly require the same number for every standard.

Some standards are narrow.

Some standards contain several distinct skills.

Some standards require broader evidence.

Create an extensible policy.

Example:

minimumEvidence
masteryThreshold
requiredSubskills
maximumDiagnosticItems

This policy should be configurable rather than scattered through application code.

Breadth Before Promotion

A learner must not be promoted simply because they performed well on a few randomly selected standards.

Before concluding that Kindergarten ELA is mastered, the diagnostic must obtain evidence across the critical Kindergarten ELA domains.

Create the concept of required diagnostic coverage.

For example:

GradeDiagnosticBlueprint
grade
subject
domains[]

Each domain could contain:

DomainRequirement
domain
requiredStandards
minimumEvidence
weight
criticalPrerequisite

The exact implementation may differ.

The important behavior is:

The system knows what evidence it needs before it is allowed to make a placement decision.

Critical Prerequisites

Some gaps should prevent advancement even if overall performance is high.

Example:

A learner who understands stories well but cannot reliably identify letter sounds should not simply be classified as Grade 1-ready because their average diagnostic score is high.

Support the concept of critical prerequisite skills.

A learner may advance only when:

sufficient diagnostic coverage has been obtained;
overall mastery meets the configured threshold; AND
critical prerequisite skills meet their required thresholds.

Do not reduce placement to a single average percentage.

Adaptive Diagnostic Behavior

The diagnostic should be adaptive.

Its goal is:

Obtain enough evidence to make a reliable placement decision while asking as few questions as reasonably necessary.

That is very different from:

Always ask four questions.

Use progressive evidence gathering.

Example behavior:

Start with representative probes
↓
Strong evidence?
↙ ↘
yes uncertain
↓ ↓
sample another ask additional probes
domain in that skill/domain

A learner who consistently demonstrates mastery should move through the assessment faster.

A learner with inconsistent responses should receive additional diagnostic probes.

Confidence and Uncertainty

The system must explicitly understand that sometimes it does not yet know.

Do not force every diagnostic into a confident grade placement after an arbitrary number of questions.

Support concepts such as:

placementConfidence
evidenceCoverage
unresolvedSkills

Potential placement confidence levels:

LOW
MODERATE
HIGH

or an equivalent numeric model.

When evidence is insufficient, gather more evidence.

Suggested Diagnostic Flow

Design something conceptually similar to:

1. Determine starting estimate.
2. Sample major domains from that level.
3. Identify likely strengths and weaknesses.
4. Probe uncertain skills.
5. Verify critical prerequisites.
6. Determine whether the learner should:
   - move downward,
   - remain at this level,
   - or test upward.
7. If testing upward, repeat representative coverage at the next level.
8. Stop when the learner reaches the first instructional level where
   prerequisite mastery is incomplete.
9. Persist:
   - demonstrated mastery,
   - gaps,
   - evidence,
   - placement,
   - confidence.

Do not interpret this as a requirement for an unnecessarily long exam.

Make it adaptive.

Ceiling and Floor Testing

The diagnostic should be capable of establishing both a floor and a ceiling.

Example:

If a child demonstrates Kindergarten mastery easily:

Kindergarten
↓
Grade 1 sampling
↓
Grade 1 mastery demonstrated
↓
Grade 2 sampling
↓
significant gaps found

Placement may therefore be:

Primary instructional level: Grade 2
Prerequisite remediation: specific Grade 1 skills

depending on the curriculum model.

Likewise, if Kindergarten material reveals foundational gaps, do not continue unnecessarily into higher-level questions.

Strand-Level Placement

Do not assume one global grade label perfectly represents the learner.

Where practical, preserve placement/mastery independently by domain or strand.

Example:

ELA

Phonemic Awareness: K
Phonics/Decoding: Grade 1
Vocabulary: Grade 2
Reading Comprehension: Grade 1
Writing: K

The UI may present a simplified overall instructional level, but the underlying curriculum engine must retain the more useful information.

The learning system should subsequently use these gaps to select instruction.

Relationship Between Diagnostic and Learning

Diagnostic results must not become dead metadata.

The results should directly influence what the learner sees next.

For example:

Diagnostic
↓
Mastery Profile
↓
Learning Plan
↓
Target prerequisite gaps
↓
New instruction/practice
↓
Mastery evidence
↓
Updated learner model

Diagnostic attempts and normal learning attempts should contribute to the same durable learner knowledge model where educationally appropriate.

Do not create two disconnected representations of student ability.

Question Selection

Questions should be selected intentionally.

Avoid:

ORDER BY RANDOM()
LIMIT 4

or its conceptual equivalent.

The diagnostic selector should know:

which domains still need evidence;
which standards are critical;
which skills are uncertain;
which difficulty level should be tested next;
which questions have already been seen;
whether enough evidence exists to stop testing a skill.

Favor representative coverage and information gain over randomness.

Randomization may be used within an eligible question set, but randomness must not determine the diagnostic curriculum coverage.

Prevent Memorization / Duplicate Evidence

Do not treat repeated answers to the same question as independent mastery evidence.

Where possible:

use multiple question templates;
vary content;
vary examples;
avoid immediate repetition;
track question instances;
distinguish repeated attempts from independent demonstrations.

The learner should demonstrate the skill, not memorize the item.

Diagnostic Length

There should NOT be a hardcoded expectation that the assessment contains four questions.

Instead establish:

minimum diagnostic evidence

- adaptive continuation
- maximum reasonable session length

A diagnostic might require 15, 25, 40, or more responses depending upon:

learner performance;
curriculum breadth;
uncertainty;
number of grade levels tested;
prerequisite gaps.

However, this application is intended for young children.

Therefore avoid creating a single exhausting test session.

Design for checkpointing and resumability.

A diagnostic should be capable of pausing and continuing later without losing its evidence state.

Child-Friendly Assessment UX

The learner may be approximately Kindergarten through elementary age.

The diagnostic experience must therefore:

avoid displaying intimidating test language;
avoid showing failure percentages;
avoid telling the child they are "behind";
provide encouraging neutral feedback;
keep individual interactions short;
allow natural breaks;
preserve progress across sessions.

The parent-facing UI may show detailed diagnostic results.

The child-facing UI should focus on the activity.

Parent Diagnostic Report

Design the domain model/API so the application can eventually present something like:

ELA Placement

Overall instructional starting point:
Grade 1

Confidence:
High

Demonstrated strengths:

- Letter recognition
- Beginning/ending sounds
- Basic decoding
- High-frequency words

Needs reinforcement:

- Medial vowel discrimination
- Segmenting four-phoneme words

Prerequisite gaps:

- Long-vowel patterns not yet demonstrated

Grade 1 readiness:
Ready with targeted review

Evidence:
32 diagnostic responses
8 skill groups evaluated
7 demonstrated
1 developing

The precise presentation can evolve, but the backend must expose enough data to produce this.

Assessment Integrity Requirements

The system must obey these invariants.

Invariant 1
No grade-level mastery decision without sufficient curriculum coverage.
Invariant 2
No mastery determination from a single lucky answer.
Invariant 3
Critical prerequisite gaps cannot be hidden by averaging unrelated strengths.
Invariant 4
Insufficient evidence must remain insufficient evidence.

Do not convert uncertainty into mastery.

Invariant 5
Diagnostic state must survive server restart.
Invariant 6
Duplicate question submissions must not create duplicate mastery evidence.
Invariant 7
Question count is an implementation consequence of required evidence,
not the definition of the diagnostic.
Architecture

Keep the curriculum engine independent of the games.

Games should consume curriculum questions/evidence through application interfaces.

Do not put educational mastery rules inside:

React components
game scenes
route handlers
controllers
UI state

Create explicit domain/application concepts for:

DiagnosticSession
DiagnosticBlueprint
DiagnosticEvidence
MasteryState
PlacementDecision
QuestionSelection
PrerequisiteRelationship
LearningPlan

Names may differ if the existing architecture has better terminology.

Follow the repository's existing architecture and conventions.

Persistence

The repository already contains or is moving toward durable curriculum learning sessions and immutable attempts.

Preserve those guarantees.

Diagnostic progress must survive:

browser refresh
client reconnect
server restart
deployment

Do not rely on server memory for authoritative diagnostic state.

The persisted data must be sufficient for the server to reconstruct the diagnostic state.

Idempotency

Question submissions must remain idempotent.

If the same question instance is submitted twice because of:

retries,
double clicks,
network reconnects,
race conditions,

it must not count as two pieces of mastery evidence.

Preserve or strengthen the existing uniqueness guarantees.

Testing Requirements

This change is not complete with unit tests around a score-calculation method.

Create tests demonstrating educational behavior.

At minimum cover scenarios similar to:

Scenario A — False positive prevention

Learner answers several easy Kindergarten questions correctly but has not been assessed across required domains.

Expected:

Kindergarten mastery NOT established.
More evidence required.
Scenario B — Consistent mastery

Learner demonstrates mastery across all required Kindergarten domains.

Expected:

Kindergarten prerequisites satisfied.
Diagnostic begins probing Grade 1.
Scenario C — Critical gap

Learner performs strongly overall but repeatedly misses an essential foundational phonics skill.

Expected:

Critical prerequisite gap recorded.
System does not blindly mark Kindergarten fully mastered.
Scenario D — Uncertainty

Learner responds inconsistently to a skill.

Expected:

Additional probes selected.
System does not prematurely classify mastery/non-mastery.
Scenario E — Strong learner

Learner rapidly demonstrates Kindergarten and Grade 1 mastery.

Expected:

Diagnostic efficiently climbs toward Grade 2 rather than forcing every possible Kindergarten question.
Scenario F — Foundational learner

Learner struggles with foundational Kindergarten skills.

Expected:

Diagnostic stops climbing and identifies the appropriate instructional starting point.
Scenario G — Restart

Diagnostic is partially complete and the server restarts.

Expected:

Session resumes with the same accumulated evidence and does not restart placement.
Scenario H — Duplicate submission

Same diagnostic answer is submitted concurrently twice.

Expected:

One immutable attempt/evidence contribution exists.
Simulation Testing

Create a test harness that can simulate hypothetical learners.

For example:

Learner A:
90-100% mastery of K skills

Learner B:
strong comprehension
weak phonemic awareness

Learner C:
mixed K/Grade 1 abilities

Learner D:
Grade 2 capable learner beginning at K diagnostic

Learner E:
random guessing

Run the diagnostic algorithm against these profiles.

Document:

questions/evidence requested;
final placement;
gaps found;
confidence;
total item count.

This will help expose pathological placement behavior that ordinary unit tests may miss.

Do Not Optimize for Minimum Code Changes

The objective is not:

Make the existing four-question implementation slightly better.

The objective is:

Build the foundation of a trustworthy elementary diagnostic system.

Reuse the existing architecture where appropriate, but if the existing abstraction prevents correct educational behavior, refactor it.

Do not preserve a bad abstraction merely because changing it requires more work.

POC Scope

We do NOT need to solve every psychometric problem before shipping the proof of concept.

Do not attempt to build a full commercial standardized-testing engine.

For the POC we need a defensible deterministic system based on:

standards coverage;
prerequisite skills;
repeated evidence;
mastery thresholds;
adaptive probing;
persistent state;
transparent placement logic.

Design interfaces so more sophisticated models can be introduced later.

Explain Your Reasoning Through Artifacts

Before implementation, produce:

docs/curriculum/DIAGNOSTIC_GAP_ANALYSIS.md
docs/curriculum/DIAGNOSTIC_DESIGN.md

DIAGNOSTIC_DESIGN.md must explain:

Diagnostic state machine.
Evidence model.
Mastery calculation.
Coverage requirements.
Critical prerequisite handling.
Adaptive question-selection algorithm.
Upward/downward placement logic.
Stopping rules.
Persistence model.
Relationship between diagnostic and later learning/mastery.
Parent-facing output model.
Known limitations of the POC approach.

Include diagrams or pseudocode where useful.

Important: Challenge Existing Assumptions

Do not assume existing diagnostic behavior is correct simply because tests currently pass.

Existing tests may only prove that the current implementation behaves as originally coded.

Evaluate whether those tests represent the actual product requirement.

If a test asserts behavior inconsistent with the requirements above:

identify the conflict;
document why the behavior is incorrect;
replace the test with one representing the intended educational behavior.

Do not preserve incorrect behavior merely to keep existing tests green.

Definition of Done

Do not report this task as complete until all of the following are true:

Existing diagnostic implementation has been analyzed.

Diagnostic gap analysis exists.

Diagnostic design exists.

Grade placement requires meaningful standards/domain coverage.

Mastery requires multiple pieces of evidence where appropriate.

Critical prerequisites are represented.

Adaptive probing exists.

Uncertainty results in additional assessment rather than arbitrary placement.

Higher grades can be probed when lower grades are clearly mastered.

Strand-level mastery can be represented.

Diagnostic evidence persists durably.

Diagnostic sessions resume after restart.

Duplicate submissions do not inflate evidence.

Diagnostic results feed the learner mastery model.

Automated educational-behavior tests exist.

Simulated learner profiles have been tested.

Client typecheck/build succeeds.

Server typecheck/build succeeds.

Relevant automated tests pass.

Any required database migration is included.

Documentation describes remaining POC limitations.

Work Method

Work iteratively.

For each major phase:

Inspect.
Explain what you found.
Identify the educational or architectural problem.
Implement the smallest coherent architectural improvement.
Test it.
Inspect the diff.
Self-review for unintended behavior.
Continue to the next phase.

Do not declare success because the code compiles.

Evaluate the implementation against the actual product goal:

Could a parent reasonably trust this diagnostic to identify whether their child has the prerequisite knowledge required for the next instructional level?

If the answer is no, continue improving it.
