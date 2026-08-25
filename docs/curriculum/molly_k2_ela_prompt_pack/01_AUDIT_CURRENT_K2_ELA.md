# Stage 1 — Audit the Current K–2 ELA Curriculum

## Objective

Inspect the repository and determine why the current `/learning` curriculum behaves more like standards-based question practice than a coherent instructional program.

This stage is **analysis only**.

Do not perform the curriculum redesign yet.

---

# Product Context

The `/learning` area is traditional curriculum, instruction, practice, and quizzes.

Diagnostics are separate and exist to determine current learner ability.

Games are short educational breaks and reinforcement.

The immediate concern is that early Kindergarten curriculum may present questions such as:

> Which part of a book shows its name?

while foundational reading skills such as letter-sound relationships, short vowels, blending, segmenting, and CVC decoding appear absent or underrepresented.

A beginning learner may not yet know how to read.

The curriculum must not accidentally require independent reading as a prerequisite for learning to read.

---

# Central Question

Determine whether the repository currently behaves conceptually like:

```text
Standard
→ question template
→ practice
```

and whether this has caused broad standards to be treated as if they were already complete instructional units.

---

# Repository Audit

Locate and inspect all relevant material, including:

- Oklahoma standards data
- Common Core mappings, if present
- standards import/generation scripts
- curriculum catalog
- question templates
- learning-item definitions
- lesson concepts, if any
- skill concepts, if any
- mastery state
- learner progress
- diagnostic state where it overlaps curriculum
- `/learning` backend flow
- `/learning` frontend flow
- selection/ordering logic
- persistence models
- APIs
- tests
- seed data
- curriculum documentation
- TTS/audio abstractions
- any content-generation code

Trace the complete path from:

```text
standard/catalog data
→ selected learning item
→ API
→ UI
→ answer
→ persistence
→ next learning item
```

---

# Questions the Audit Must Answer

## Standards vs Curriculum

1. Are standards treated as instructional units?
2. Is there a concept below `Standard` representing teachable skills?
3. Can one broad standard map to many skills?
4. Can multiple standards map to one instructional progression?
5. Are standards being taught in standards-file order?
6. Are learning questions effectively generated one-per-standard or a small fixed number per standard?

---

## Instruction

Determine whether the application distinguishes:

- explicit instruction
- worked examples
- guided practice
- independent practice
- mastery checks
- diagnostic probes
- review
- game reinforcement

If these are not distinct, document how current behavior substitutes quizzes for teaching.

---

## Kindergarten Foundational Literacy

Identify current support for:

- oral-language activities
- rhyme
- syllables
- onset/rime
- phoneme isolation
- phoneme blending
- phoneme segmentation
- phoneme manipulation
- uppercase recognition
- lowercase recognition
- uppercase/lowercase matching
- letter names
- consonant sounds
- vowel recognition
- short vowel sounds
- medial vowel discrimination
- CVC blending
- CVC segmentation
- CVC decoding
- CVC encoding/spelling
- word families
- digraphs
- consonant blends
- long vs short vowel behavior
- final/silent-e
- open syllables
- closed syllables
- vowel teams
- r-controlled vowels
- high-frequency words
- decodable sentences
- decodable connected text
- fluency
- vocabulary
- listening comprehension
- independent reading comprehension

For each, classify:

```text
well represented
partially represented
represented only indirectly
missing
cannot determine
```

Include evidence from the repository.

---

# Hidden Reading Requirements

Audit early Kindergarten activities for accidental literacy prerequisites.

For representative questions determine:

1. Must the learner read the prompt?
2. Must the learner read the answer choices?
3. Has the curriculum already taught the required letter/sound patterns?
4. Could TTS make the activity valid?
5. Is the activity actually assessing a different skill than its standard claims?

Flag cases where reading comprehension is confounded with decoding.

---

# Listening vs Reading Comprehension

Determine whether the data model or question system distinguishes:

```text
Listening Comprehension
```

from:

```text
Reading Comprehension
```

If not, explain the consequences.

A learner may have strong story comprehension when text is narrated while still being unable to decode written text.

Those are different skills.

---

# Instructional Priority

Determine how the application decides what the learner receives first.

Look for:

- numeric sort order
- standard code sorting
- random selection
- first unmastered standard
- template order
- explicit priority
- prerequisite graph
- grade-level order

Determine why a print-concepts question can become an early/first Kindergarten activity.

---

# Question Quality

Audit representative multiple-choice content.

Look for trivial distractors such as:

```text
cover
table
shoe
```

Determine whether distractors are:

- plausible
- skill-relevant
- developmentally appropriate
- answerable through elimination without knowing the target concept

Document generation/validation weaknesses.

---

# Existing Data That Can Be Reused

Identify reusable assets:

- standards data
- mappings
- attempt persistence
- learning sessions
- mastery calculations
- question rendering
- TTS
- question templates
- API contracts
- test infrastructure
- learner profile/progress structures

Avoid recommending replacement of working infrastructure without a reason.

---

# Existing Abstractions That May Be Harmful

Explicitly call out any abstraction that prevents proper curriculum design.

Examples could include:

```text
one template = one standard
one mastery value = one standard
grade = sole placement state
random unmastered question
question = lesson
```

Do not assume these exist. Verify.

---

# Required Deliverable

Create:

```text
docs/curriculum/K2_ELA_CURRICULUM_GAP_ANALYSIS.md
```

It must contain:

1. Executive summary.
2. Current architecture.
3. Current learner-flow diagram.
4. Current content-generation model.
5. Current sequencing model.
6. Foundational-literacy coverage table.
7. Hidden-reading-dependency findings.
8. Listening-vs-reading-comprehension findings.
9. Question-quality findings.
10. Standards-vs-curriculum findings.
11. Reusable architecture.
12. Harmful/inadequate abstractions.
13. Highest-risk educational failures.
14. Recommended architectural direction.
15. Questions/unknowns that must be resolved in Stage 2.

---

# Important Guardrails

Do **not**:

- redesign the database yet;
- regenerate the curriculum;
- rewrite the diagnostic;
- add hundreds of templates;
- delete existing standards;
- implement a skill graph;
- alter learner production data.

Small test scripts used only to inspect data are acceptable if necessary.

---

# Completion Criteria

This stage is complete only when another engineer can read the gap analysis and understand:

- why the current curriculum order is educationally weak;
- what foundational literacy content exists;
- what is missing;
- what parts of the system caused the problem;
- what architecture is safe to reuse;
- what Stage 2 must design.

Stop after completing the audit and verifying the document against the actual repository.
