# Stage 3 — Implement the Kindergarten Foundational-Literacy Vertical Slice

## Objective

Implement the first end-to-end curriculum slice based on the approved K–2 ELA design.

Read first:

```text
00_WORK_ORDER.md
docs/curriculum/K2_ELA_CURRICULUM_GAP_ANALYSIS.md
docs/curriculum/K2_ELA_INSTRUCTIONAL_PROGRESSION.md
docs/curriculum/K2_ELA_STANDARD_COVERAGE_MATRIX.md
docs/curriculum/K2_ELA_IMPLEMENTATION_PLAN.md
docs/curriculum/INTERACTIVE_TUTOR_AND_LESSON_ENGINE_DESIGN.md
```

Do not redesign the system from scratch unless repository realities make the Stage 2/2B designs impossible.

The Kindergarten slice must use the reusable tutor/lesson architecture defined in Stage 2B rather than reverting to static quiz pages.

If an assumption proves wrong, document it and make the smallest coherent adjustment.

---

# Goal

Prove that `/learning` can teach a beginning reader through a real prerequisite-based sequence.

The vertical slice should demonstrate a path conceptually similar to:

```text
spoken sound awareness
→ letter recognition
→ letter-sound association
→ vowel awareness
→ short vowel
→ CVC blending
→ CVC segmentation
→ CVC decoding
→ CVC encoding
→ simple decodable text
→ comprehension appropriate to reading ability
```

The exact phonics sequence should follow the Stage 2 design.

---

# Scope

Implement only enough content and architecture to prove the model thoroughly.

Do not try to populate every K–2 skill yet.

Favor a complete vertical slice over broad shallow coverage.

---

# Domain Model

Implement the minimum production model required by the Stage 2 design.

This may include concepts such as:

- competency
- skill
- prerequisite relationship
- standard mapping
- instructional priority
- mastery policy
- activity/lesson purpose
- learner skill state

Reuse existing entities where they already fit.

Do not create parallel concepts unnecessarily.

---

# Persistence

Persist authoritative learner state.

Progress must survive:

- browser refresh
- client reconnect
- server restart
- deployment

Do not keep authoritative curriculum progression only in memory.

Preserve existing immutable-attempt/idempotency behavior.

Duplicate submissions must not create duplicate mastery evidence.

---

# Activity Purposes

Implement enough distinction to support at least:

```text
instruction
guided practice
independent practice
mastery check
```

If diagnostics/review/game reinforcement already use the same activity structures, preserve compatibility.

A learner must not receive a mastery-style question for an entirely new skill before instruction.

---

# Early Reader UX

For the vertical slice, ensure that a beginning learner can interact without independent reading.

Use existing TTS/audio support where available.

At minimum:

- prompts can be narrated where reading is not yet expected;
- answer choices can be narrated where appropriate;
- phoneme/word pronunciation is available for sound-based activities;
- repeated playback does not alter mastery evidence.

If production TTS is difficult to exercise in tests, use a fake adapter.

---

# Foundational Content

Implement representative real curriculum content for the slice.

At minimum include enough content to prove:

## Phonemic / Sound Awareness

Examples:

- identify beginning sound
- identify ending sound
- identify medial sound
- blend spoken phonemes
- segment spoken CVC words

These should not require reading when testing auditory skills.

---

## Letter Knowledge

Examples:

- recognize selected uppercase/lowercase letters
- match uppercase and lowercase
- associate selected consonants with sounds

Use the instructional sequence defined in Stage 2.

---

## Vowel Knowledge

Teach explicitly:

- what vowels are at an age-appropriate level;
- selected short vowel sound(s);
- auditory discrimination;
- identifying the vowel sound in spoken CVC words.

Do not simply quiz the learner on vowels without first introducing the concept.

---

## CVC Blending and Segmenting

Support examples conceptually like:

```text
/m/ /ă/ /t/
→ mat
```

and:

```text
sat
→ /s/ /ă/ /t/
```

Use multiple independent examples.

---

## CVC Decoding

Teach and practice unfamiliar decodable words built only from taught letters/patterns.

Do not rely entirely on memorized word families.

Ensure successful performance represents transferable decoding.

---

## CVC Encoding

Include spelling/build-the-word style activities.

Example:

```text
Hear:
/m/ /ă/ /p/

Build:
m a p
```

---

## Decodable Sentence

Once prerequisites are satisfied, introduce a simple sentence constrained to known patterns and permitted high-frequency words.

Avoid unintroduced phonics patterns.

---

## Comprehension

Include at least one example demonstrating the distinction between:

- narrated/listening comprehension;
- learner-read comprehension.

Do not mark reading comprehension failure when the unresolved skill is decoding.

---

# Content Metadata

Where generated or parameterized content exists, include enough metadata to constrain:

- target skill
- phonics pattern
- allowed graphemes
- known high-frequency words
- prohibited/unintroduced patterns
- activity purpose
- difficulty
- answer type

Do not overbuild a full NLP engine.

---

# Decodability Guard

Implement a practical POC-level mechanism to keep independent-reading content within the learner's taught patterns.

It may be:

- curated word lists
- pattern tags
- grapheme constraints
- approved vocabulary sets
- a simple validator

The implementation must at least prevent obvious failures such as presenting:

```text
train
night
cake
chair
```

to a learner whose independent-reading knowledge is limited to simple short-vowel CVC patterns.

---

# Distractor Quality

Improve validation/generation so trivial distractors are not accepted for targeted skill questions.

Bad:

```text
Which part of a book shows its name?

cover
table
shoe
```

A distractor should be plausible enough that the learner needs the intended knowledge.

Do not make distractors confusing or deceptive.

---

# Learning Selection

Replace or augment current `/learning` selection for the vertical-slice skills so selection respects:

1. prerequisite satisfaction;
2. skill state;
3. instructional stage;
4. skill priority;
5. current mastery;
6. review where implemented.

A beginning reader must not jump directly to an independent reading-comprehension passage.

---

# Existing Print-Concept Content

Do not delete legitimate print-concepts material.

Reclassify or reprioritize it according to Stage 2.

It may still appear as supporting Kindergarten curriculum.

It should not displace foundational decoding instruction.

---

# Learner State

Support meaningful states such as:

```text
not introduced
introduced
practicing
mastered
```

Add `review due` only if Stage 2 determined it belongs in this phase.

Mastery should be skill-based where the architecture now supports it.

---

# Standards Traceability

Every vertical-slice skill must map back to relevant actual standards in the repository.

Do not create untraceable curriculum that loses standards coverage.

Standards mapping should not determine teaching order.

---

# Automated Educational Tests

Create tests that prove behavior rather than only CRUD.

At minimum:

## Test A — Complete Beginner

Given:

```text
no demonstrated reading skills
```

Expected:

- no independent reading passage;
- foundational non-reading-dependent instruction selected.

---

## Test B — Knows Letters, Cannot Blend

Given:

```text
letter recognition mastered
letter sounds sufficiently mastered
CVC blending not mastered
```

Expected:

- blending/segmenting instruction or practice;
- not connected-text comprehension.

---

## Test C — Short-Vowel/CVC Progression

Given a learner mastering the selected short-vowel pattern:

Expected:

- progresses through CVC blending/decoding;
- does not receive advanced unintroduced patterns.

---

## Test D — Listening vs Reading

Given:

```text
strong listening comprehension
weak decoding
```

Expected:

- listening comprehension can remain strong;
- independent reading comprehension is not inferred as mastered.

---

## Test E — Prerequisite Enforcement

Given a learner selected for a skill with unmet prerequisites:

Expected:

- prerequisite curriculum is selected instead.

---

## Test F — Duplicate Submission

Submit the same question instance more than once, including concurrent behavior if supported.

Expected:

- one authoritative evidence contribution.

---

## Test G — Restart / Restoration

Persist a partially completed curriculum session/state.

Reconstruct after simulated restart.

Expected:

- learner resumes consistently;
- no duplicated advancement/evidence.

---

## Test H — Decodability

Given a learner whose taught phonics set is restricted to the current vertical slice:

Expected:

- independent-reading content contains no disallowed advanced patterns.

---

## Test I — Distractor Validation

Given an obviously irrelevant multiple-choice distractor:

Expected:

- generator/validator rejects or flags it.

---

# Curriculum Simulation Harness

Create or extend a simulation harness.

Profiles:

```text
A: complete beginner
B: knows alphabet but weak phonemic awareness
C: can blend selected CVC pattern
D: strong listening comprehension but weak decoding
E: advanced early reader
```

Print/log/serialize the next 10–20 selections for each.

Inspect the actual sequence.

Tests may pass while the sequence remains educationally nonsensical.

---

# Human-Readable Validation Artifact

Create:

```text
docs/curriculum/KINDERGARTEN_VERTICAL_SLICE_RESULTS.md
```

Include:

1. architecture implemented;
2. database/migration changes;
3. vertical-slice skills;
4. standards mappings;
5. example lesson flow;
6. simulated learner sequences;
7. example generated/curated items;
8. decodability behavior;
9. TTS behavior;
10. tests/builds executed;
11. limitations;
12. issues deferred to Stage 4.

---

# Build / Test Requirements

Run all relevant:

- server tests
- client tests
- typechecks
- production builds
- database/schema validation that is possible in the environment

If infrastructure prevents a test, document precisely:

- what could not run;
- why;
- what command should be run in an environment that has the dependency.

Do not report the test as passed if it was not executed.

---

# Diff Review

Before finishing:

1. inspect the full diff;
2. look for duplicated curriculum logic;
3. look for UI-layer educational rules;
4. look for hardcoded question counts;
5. look for random selection bypassing prerequisites;
6. look for schema changes without migration;
7. look for broken compatibility with diagnostics/games;
8. look for data loss risks.

---

# Stage Completion Question

Inspect the actual running/generated sequence and answer:

> If a five-year-old entered this vertical slice unable to read, could they make meaningful progress toward reading without the application first requiring independent reading?

If not, keep working.

Stop after the Kindergarten vertical slice and its verification are complete.
