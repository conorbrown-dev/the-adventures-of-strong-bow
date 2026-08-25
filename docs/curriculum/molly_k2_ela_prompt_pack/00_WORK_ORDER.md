# K–2 ELA Curriculum Rebuild — Work Order

## Current checkpoint

Stages 1, 2, and 2B are complete. Stage 3 implementation and automated verification are complete, but production enablement remains blocked on seven qualified isolated-phoneme recordings and a manual accessibility/playback review. Stage 4 has not started.

For the exact repository state, setup commands, remaining gate, and continuation order, read `CURRENT_PROGRESS_AND_HANDOFF.md`. The detailed Stage 3 evidence is in `../KINDERGARTEN_VERTICAL_SLICE_RESULTS.md`.

## Purpose

This folder contains a staged set of implementation prompts for rebuilding the K–2 ELA curriculum in the homeschool application.

The `/learning` area is the primary academic experience.

The product has three distinct educational systems:

1. **Curriculum** — teaches new knowledge and skills through instruction, guided practice, traditional Q&A, independent practice, and mastery checks.
2. **Diagnostics** — determines what the learner already knows. Diagnostics should assess without becoming the primary teaching mechanism.
3. **Games** — short, enjoyable breaks that reinforce skills already introduced by the curriculum.

This work is primarily about **curriculum**.

---

# Core Product Problem

The current curriculum appears to treat educational standards too directly as question prompts.

For example, an early Kindergarten practice question may be:

> Which part of a book shows its name?
>
> - the cover
> - the table
> - the shoe

This can represent a legitimate print-concepts expectation, but it is not an appropriate foundation for a learn-to-read curriculum.

A beginning Kindergarten learner may not yet read independently.

The curriculum must therefore stop assuming that the learner already possesses the decoding skills the curriculum is supposed to teach.

---

# Governing Principle

> **Standards define the destination. Curriculum defines the road.**

Do not optimize for:

> How can every standard become a question?

Optimize for:

> How can this application systematically teach a child from their current skill level toward mastery of the standards?

A useful conceptual direction is:

```text
Standard
  ↓
Competency
  ↓
Skill
  ↓
Prerequisites
  ↓
Instruction
  ↓
Guided Practice
  ↓
Independent Practice
  ↓
Mastery Check
```

The exact names and implementation must fit the existing repository.

---

# Important Educational Definitions

**Phonological awareness** — awareness of the sound structure of spoken language, including words, rhyme, syllables, and sounds.

**Phonemic awareness** — the ability to hear and manipulate individual speech sounds, or phonemes.

**Phonics** — the relationship between written letters or spelling patterns and speech sounds.

**Decoding** — using letter-sound knowledge to read a written word.

**Encoding** — representing spoken sounds with written letters, usually through spelling.

**CVC word** — a consonant-vowel-consonant word such as `cat`, `bed`, `pig`, `hop`, or `sun`.

**Decodable text** — text primarily containing spelling/sound patterns the learner has already been taught.

**Listening comprehension** — understanding spoken language or a story read aloud.

**Reading comprehension** — understanding text the learner reads.

**Prerequisite** — a skill that should be established before a dependent skill is taught or assessed independently.

---

# Execution Order

Run these prompts in order.

## Step 1

`01_AUDIT_CURRENT_K2_ELA.md`

**Purpose:** Understand the existing repository and identify educational/architectural gaps.

**Production-code changes:** Not allowed except tiny inspection aids if absolutely necessary. Prefer no code changes.

**Gate:** The audit document must exist and be specific enough to support architecture decisions.

---

## Step 2

`02_DESIGN_K2_ELA_PROGRESSION.md`

**Purpose:** Design the K–2 skill graph, instructional progression, standards mapping, and implementation plan.

**Production-code changes:** Not allowed.

**Gate:** The progression, coverage matrix, and implementation plan must be internally consistent.

---

## Step 3

`02B_DESIGN_INTERACTIVE_TUTOR_AND_LESSON_ENGINE.md`

**Purpose:** Design the reusable interactive tutor, lesson recipe system, narration/TTS strategy, remediation behavior, and learner-facing instructional components.

**Production-code changes:** Not allowed except tiny prototypes if necessary to validate feasibility.

**Gate:** The tutor/lesson-engine design must be compatible with the Stage 2 curriculum graph and make it possible to teach a non-reader without relying on prerecorded videos.

---

## Step 4

`03_IMPLEMENT_KINDERGARTEN_VERTICAL_SLICE.md`

**Purpose:** Implement one complete Kindergarten foundational-literacy vertical slice end-to-end.

The slice should prove that the application can progress conceptually through:

```text
spoken sound awareness
→ letter/sound knowledge
→ vowel knowledge
→ short-vowel work
→ CVC blending/segmenting
→ CVC decoding
→ simple decodable sentences
→ appropriate comprehension
```

**Gate:** Working behavior, automated educational-sequence tests, and actual output inspection.

---

## Step 5

`04_REVIEW_AND_EXPAND_K2.md`

**Purpose:** Review the vertical slice for architectural and educational correctness, correct defects, then expand through Grade 1 and Grade 2.

**Gate:** K–2 progression is represented, standards coverage is verified, and the `/learning` path follows prerequisites rather than arbitrary question ordering.

---

# Rules for All Stages

1. Inspect before changing.
2. Do not preserve an abstraction merely because existing tests depend on it.
3. Do not claim completion because code compiles.
4. Inspect actual learner-facing curriculum sequences.
5. Prefer deterministic educational behavior over arbitrary randomness.
6. Preserve durable learner progress.
7. Preserve idempotent question/attempt behavior.
8. Keep curriculum rules out of React components, route handlers, and individual games.
9. Do not make grade level the only representation of learner progress.
10. Do not introduce a full commercial psychometric or reading-program system unless required.
11. Prefer the smallest coherent architecture that supports the product goal.
12. Document assumptions and unresolved limitations.

---

# Model Work Style

For each stage:

1. Read this work order.
2. Read the current stage file.
3. Inspect all relevant repository code and documentation.
4. Summarize findings before large edits.
5. Complete only the current stage.
6. Run relevant tests/build/typechecks.
7. Inspect the diff.
8. Self-review against the educational goal.
9. Stop at the stage gate instead of automatically continuing into the next file.

When a stage says **do not implement**, obey it.

---

# Product-Level Self-Review Question

At every stage ask:

> **If a five-year-old who cannot yet read entered `/learning`, could this system actually teach that child to read without first requiring them to read?**

If the answer is no, the architecture or curriculum is still incomplete.
