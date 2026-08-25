# Stage 2 — Design the K–2 ELA Instructional Progression

## Objective

Using the Stage 1 audit, design a coherent K–2 ELA instructional architecture and learning progression.

This stage is **design only**.

Do not perform major production implementation.

Read first:

```text
00_WORK_ORDER.md
docs/curriculum/K2_ELA_CURRICULUM_GAP_ANALYSIS.md
```

---

# Governing Principle

Standards describe expected outcomes.

Curriculum must provide the prerequisite order and instruction necessary to reach those outcomes.

Design from:

> What does a child need to learn next?

not:

> What standard ID comes next?

---

# Required Instructional Model

Design an architecture capable of representing something conceptually equivalent to:

```text
Standard
  ↕ mapping
Competency
  ↓
Skill
  ↓ prerequisite relationships
Instruction
  ↓
Guided Practice
  ↓
Independent Practice
  ↓
Mastery Check
```

Names may differ.

A first-class teachable unit must exist below broad standards.

---

# Skill Requirements

Evaluate and specify a skill representation capable of expressing:

- stable identifier
- subject
- domain/strand
- grade or grade band
- name
- description
- prerequisite skills
- instructional order/rank
- instructional importance
- standard mappings
- mastery policy
- content constraints
- activity types
- whether independent reading is required
- whether TTS/audio is required or supported

Do not blindly implement every field above. Design the smallest coherent model that satisfies the requirements.

---

# K–2 ELA Progression

Design a dependency-aware progression through at least the following domains.

## Oral Language / Phonological Awareness

Include developmentally appropriate sequencing for:

- word awareness
- rhyme
- syllables
- onset/rime
- beginning sounds
- ending sounds
- medial sounds
- phoneme isolation
- blending
- segmentation
- phoneme manipulation where appropriate

Early activities should be possible without reading.

---

## Print Concepts

Include:

- book orientation
- front/back cover
- title
- words vs pictures
- left-to-right progression
- top-to-bottom progression
- spaces
- basic punctuation awareness

These are legitimate skills but should not dominate the core decoding progression.

---

## Alphabet Knowledge

Include:

- uppercase recognition
- lowercase recognition
- uppercase/lowercase matching
- letter names
- common sounds
- distinguishing letters from symbols/numbers

Determine a useful instructional order.

Do not assume alphabetical order must equal instructional order.

---

## Consonants and Vowels

Include:

- identifying vowels
- identifying consonants
- common consonant sounds
- short vowel sounds
- auditory vowel discrimination
- medial vowel identification
- distinguishing short vowel sounds

---

## CVC Reading

Treat CVC decoding as first-class curriculum.

CVC = consonant-vowel-consonant.

Examples:

```text
cat
bed
pig
hop
sun
```

Represent:

- phoneme blending
- phoneme segmentation
- decoding
- encoding/spelling
- generalization to unfamiliar words
- short-vowel progression

Do not let learners pass solely through memorized word families.

---

## High-Frequency Words

Distinguish where practical between:

- words that are currently decodable
- words with irregular spelling features requiring explicit mapping

Avoid a whole-word-memorization-only curriculum.

---

## Decodable Text

Design for sentences and passages primarily constrained to previously taught spelling/sound patterns.

The architecture should eventually be able to know:

```text
target phonics pattern
allowed patterns
known high-frequency words
unintroduced patterns to avoid
```

A full linguistic engine is not required in this stage.

---

## Increasing Phonics Complexity

Sequence concepts such as:

- digraphs
- consonant blends
- final consonant patterns
- long vs short vowels
- final/silent-e
- open syllables
- closed syllables
- vowel teams
- r-controlled vowels
- inflectional endings
- multisyllable decoding
- syllable division where appropriate

Map these appropriately across Kindergarten, Grade 1, and Grade 2.

Do not force terminology earlier than useful.

A learner may learn that `cat` uses the short `a` sound before needing to memorize the formal term `closed syllable`.

---

## Fluency

Design progression for:

- accurate decoding
- increasing automaticity
- repeated reading where useful
- phrasing
- connected text

Accuracy should precede pressure for speed.

---

## Vocabulary

Support vocabulary through:

- oral language
- narration/read-alouds
- images/context
- learner-read text

Vocabulary growth must not be limited to independently decodable words.

---

## Comprehension

Model separately:

```text
Listening Comprehension
Reading Comprehension
```

Early learners should be able to practice:

- characters
- setting
- sequencing
- main idea
- details
- prediction
- cause/effect
- retelling

through narrated text before independent reading is established.

---

# Dependency Graph

Define how prerequisites are represented.

Example:

```text
Decode short-a CVC words
  requires:
    recognize relevant lowercase letters
    know relevant consonant sounds
    recognize short-a
    blend three phonemes
```

Then:

```text
Read short-a decodable sentence
  requires:
    decode short-a CVC words
    recognize required high-frequency words
```

This graph should drive selection more strongly than simple numeric priority.

---

# Instructional Priority

Design a priority concept in addition to prerequisites.

Possible categories:

```text
FOUNDATIONAL
CORE
SUPPORTING
ENRICHMENT
```

Use names appropriate to the repository.

Example conceptually:

```text
CVC decoding → foundational
book-cover identification → supporting
```

Do not let equal standards status imply equal instructional priority.

---

# Grade Level

Grade level should organize content but should not be the sole representation of progress.

The model should support states such as:

```text
Letter Knowledge: mastered
Phonemic Awareness: developing
CVC Decoding: emerging
Listening Comprehension: strong
Independent Reading: not yet established
```

---

# Lesson / Activity Purposes

Design how learning content distinguishes purposes such as:

```text
INSTRUCTION
GUIDED_PRACTICE
INDEPENDENT_PRACTICE
MASTERY_CHECK
DIAGNOSTIC
REVIEW
GAME_REINFORCEMENT
```

Exact enums/names are flexible.

The core requirement is that a teaching example, practice item, and diagnostic probe are not interchangeable just because they refer to the same standard.

---

# Teach Before Test

Design curriculum progression so a learner encountering an unknown skill receives instruction before independent mastery testing.

A lesson may contain:

```text
introduction
explicit explanation
worked example
guided practice
independent practice
mastery check
```

Not every micro-skill requires a large lesson.

But:

> questions alone are not instruction.

---

# TTS / Audio

Design early-learning behavior assuming that some learners cannot yet read.

Treat narration as a core instructional capability.

Support future activities involving:

- spoken phonemes
- spoken words
- spoken sentences
- repeat audio
- slow blending
- normal pronunciation
- narrated comprehension passages

Preserve testability through fake/in-memory adapters where applicable.

---

# Learning Selection Algorithm

Design how `/learning` selects the next curriculum activity.

Selection should consider:

- prerequisites
- current mastery
- current instructional stage
- previous exposure
- unresolved gaps
- review needs
- grade/band
- skill priority
- session length

A reasonable conceptual rule:

> Select the highest-priority unmastered skill whose prerequisites are sufficiently satisfied, then select the appropriate instructional activity for the learner's stage within that skill.

Do not reduce this to random selection or numeric standard order.

---

# Mastery / Progress

Define how the architecture should distinguish:

```text
not introduced
introduced
practicing
mastered
review due
```

Do not overbuild spaced repetition yet.

Preserve the ability to add it later.

---

# Standards Mapping

Use the actual Oklahoma/Common Core standards already present in the repository.

Do not fabricate standards.

Map standards **onto** the instructional progression.

Allow:

- one standard → many skills
- one skill → multiple standards
- many activities → one skill

---

# Required Deliverable 1

Create:

```text
docs/curriculum/K2_ELA_INSTRUCTIONAL_PROGRESSION.md
```

It must include:

1. Design principles.
2. K–2 domain structure.
3. Skill dependency graph.
4. Kindergarten progression.
5. Grade 1 progression.
6. Grade 2 progression.
7. Listening vs reading comprehension.
8. Instruction/practice/mastery lifecycle.
9. TTS/audio use.
10. Decodable-content strategy.
11. Learner-selection algorithm.
12. Progress/mastery model.
13. Review strategy.
14. Known limitations.

Use diagrams/pseudocode where useful.

---

# Required Deliverable 2

Create:

```text
docs/curriculum/K2_ELA_STANDARD_COVERAGE_MATRIX.md
```

For every relevant K–2 ELA standard in the repository, identify:

```text
Standard ID
Description
Mapped domain
Mapped competency
Mapped skills
Instructional stage
Instructional importance
Existing content
Missing content
Coverage status
```

Use the repository as the source of truth.

---

# Required Deliverable 3

Create:

```text
docs/curriculum/K2_ELA_IMPLEMENTATION_PLAN.md
```

The implementation plan must specify:

1. Domain-model changes.
2. Persistence/database changes.
3. Migration requirements.
4. API changes.
5. Curriculum catalog/seed changes.
6. Learning-selection changes.
7. Lesson/activity changes.
8. Question-template changes.
9. TTS/audio implications.
10. UI changes.
11. Diagnostic compatibility.
12. Game integration.
13. Existing content that can remain.
14. Content requiring reclassification.
15. Content to deprecate.
16. Existing learner-data migration.
17. Automated test strategy.
18. Simulation strategy.
19. Rollout phases.

---

# Kindergarten Vertical Slice Specification

The implementation plan must define a small but complete Kindergarten vertical slice to be implemented in Stage 3.

It should prove the architecture through a sequence conceptually like:

```text
phonological/phonemic awareness
→ letters and sounds
→ vowels
→ one or more short-vowel groups
→ CVC blending
→ CVC segmentation
→ CVC decoding
→ CVC encoding
→ simple decodable sentence
→ comprehension appropriate to reading ability
```

Do not attempt all K–2 content before proving the vertical slice.

---

# Simulation Design

Specify learner profiles for later testing.

At minimum:

```text
A: complete beginner
B: knows alphabet but weak phonemic awareness
C: can blend one CVC vowel pattern
D: reads CVC fluently but lacks long-vowel patterns
E: strong listening comprehension, weak decoding
F: advanced early reader entering at Kindergarten
```

For each profile, Stage 3/4 should be able to print or inspect the next 10–20 curriculum selections.

---

# No Major Implementation

Do not:

- create the full database migration;
- replace learning selection;
- bulk-regenerate content;
- expand all Grades K–2;
- rewrite diagnostics.

Tiny prototypes or pseudocode are acceptable only if needed to validate feasibility.

---

# Stage Completion

Stop after the three required design documents exist and are consistent with:

```text
docs/curriculum/K2_ELA_CURRICULUM_GAP_ANALYSIS.md
```

Self-review the design with this question:

> If a child cannot yet read, does this architecture provide a valid path for teaching them to read without requiring reading as an unstated prerequisite?
