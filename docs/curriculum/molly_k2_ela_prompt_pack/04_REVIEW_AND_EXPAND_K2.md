# Stage 4 — Review the Kindergarten Slice and Expand Through K–2

## Objective

Perform a critical review of the Stage 3 implementation before expanding it.

Then correct architectural/educational defects and extend the curriculum progression through the remaining Kindergarten, Grade 1, and Grade 2 ELA scope.

Read:

```text
00_WORK_ORDER.md
docs/curriculum/K2_ELA_CURRICULUM_GAP_ANALYSIS.md
docs/curriculum/K2_ELA_INSTRUCTIONAL_PROGRESSION.md
docs/curriculum/K2_ELA_STANDARD_COVERAGE_MATRIX.md
docs/curriculum/K2_ELA_IMPLEMENTATION_PLAN.md
docs/curriculum/KINDERGARTEN_VERTICAL_SLICE_RESULTS.md
```

---

# Part 1 — Adversarial Review

Do not begin expansion immediately.

Review the Stage 3 implementation as if you are trying to prove it wrong.

Inspect:

- domain model
- schema/migrations
- prerequisite behavior
- curriculum selection
- mastery state
- lesson/practice distinctions
- TTS/audio
- content constraints
- decodability
- standards mappings
- UI flow
- test coverage
- simulation outputs
- duplicate submission behavior
- restart/restoration behavior

---

# Review Questions

## Educational Validity

1. Does the system teach before it tests?
2. Can a non-reader operate the early curriculum?
3. Are auditory skills tested without accidental reading dependencies?
4. Is CVC decoding actually taught?
5. Are learners demonstrating transfer to unfamiliar words?
6. Are encoding and decoding both represented?
7. Are short-vowel patterns explicit?
8. Are advanced patterns withheld until appropriate?
9. Are listening and reading comprehension separate?
10. Are print concepts appropriately weighted?

---

## Architectural Validity

1. Are standards still improperly functioning as lesson units?
2. Is there a stable skill/competency layer?
3. Can prerequisites form a graph?
4. Does `/learning` select from the graph?
5. Is instructional logic duplicated in UI code?
6. Is game logic coupled to curriculum progression?
7. Is diagnostic behavior improperly mixed with instruction?
8. Can one standard map to multiple skills?
9. Can multiple standards map to a skill?
10. Is learner state durable?

---

## Content Validity

Inspect actual learner-facing items.

Look for:

- obvious distractors
- ambiguous answers
- vocabulary beyond expected level
- untaught phonics patterns
- inconsistent TTS
- hidden reading demands
- repetitive/memorization-prone examples
- content that technically maps to a standard but has low instructional value

Fix discovered defects before expansion.

---

# Part 2 — Expand Kindergarten

Complete the Kindergarten progression from the Stage 2 design.

This may include, as appropriate:

- remaining phonological-awareness skills
- remaining alphabet knowledge
- all short vowels
- broader CVC decoding
- encoding
- early high-frequency words
- decodable sentences/text
- beginning fluency
- listening comprehension
- reading comprehension only when decoding prerequisites permit
- print concepts
- vocabulary
- language/writing standards represented in the repository

Do not blindly apply this list. Follow actual standards and the Stage 2 progression.

---

# Part 3 — Expand Grade 1

Implement the Grade 1 progression according to prerequisite relationships.

Likely concepts may include:

- long vs short vowel discrimination
- final/silent-e patterns
- digraphs
- consonant blends
- common vowel teams
- additional spelling patterns
- more complex high-frequency words
- inflectional endings
- increasing sentence/text complexity
- fluency
- vocabulary
- listening comprehension
- independent reading comprehension
- writing/language skills represented by the standards

Use the actual repository standards to determine scope.

---

# Part 4 — Expand Grade 2

Implement the Grade 2 progression.

Likely concepts may include:

- increasingly complex vowel patterns
- r-controlled vowels
- additional vowel teams
- multisyllable decoding
- syllable patterns/division where appropriate
- morphology/affixes where required
- fluency
- vocabulary
- increasingly complex connected text
- reading comprehension
- writing/language skills represented by the standards

Again, use actual standards.

Do not fabricate coverage.

---

# Open / Closed Syllables

Ensure the curriculum represents the underlying behavior at the appropriate point.

Definitions:

**Closed syllable** — generally a syllable ending in a consonant with a short vowel, such as `cat`.

**Open syllable** — generally a syllable ending in a vowel, where the vowel commonly represents its long sound, such as `me` or `go`.

Do not require terminology before the learner needs it.

Teach pattern behavior first when developmentally appropriate.

---

# Standards Coverage

Update:

```text
docs/curriculum/K2_ELA_STANDARD_COVERAGE_MATRIX.md
```

Every relevant K–2 ELA standard should end in a meaningful status such as:

```text
covered
partially covered
blocked
not applicable to current modality
```

No standard should be marked covered merely because one generic question exists.

Coverage should mean the curriculum genuinely teaches and assesses the relevant competencies.

---

# Curriculum Selection

Generalize the Stage 3 selection algorithm across K–2.

The next learning activity should be based on:

- prerequisite satisfaction
- skill mastery
- current lesson stage
- priority
- grade/band
- gaps
- review needs
- previous exposure
- session constraints

Do not fall back to:

```text
random question
first unmastered standard
lowest standard code
```

---

# Learner Progress

Ensure learner progress can be represented at meaningful granularity.

Example:

```text
Phonemic Awareness
  blending: mastered
  segmentation: practicing

Phonics
  short a: mastered
  short i: mastered
  short o: practicing
  final-e: not introduced

Listening Comprehension
  strong

Independent Reading
  CVC text: mastered
  long-vowel text: emerging
```

A single grade or percentage may exist as a summary but must not become the source of truth.

---

# Diagnostic Integration

Now review the diagnostic system against the skill graph.

Do not necessarily rewrite the entire diagnostic in this stage if that is a separate workstream.

At minimum ensure:

- diagnostics can target skills rather than only broad standards;
- diagnostic evidence can update compatible learner mastery state;
- curriculum does not teach during diagnostic probes;
- diagnostic placement can identify prerequisite gaps;
- grade-level placement does not erase strand-level differences.

Document remaining diagnostic work explicitly.

---

# Game Integration

Games remain secondary reinforcement.

Ensure games can request or receive curriculum skills without containing independent copies of curriculum rules.

Conceptually:

```text
curriculum teaches short-a CVC
↓
learner reaches appropriate practice state
↓
game break can reinforce short-a CVC
```

Games should not be required to introduce critical academic skills.

---

# Parent-Facing Data

Ensure backend/API models can support future views such as:

```text
Current ELA Path

Phonological Awareness
8 / 10 skills mastered

Letter-Sound Knowledge
18 / 20 mastered

Short Vowels
a: mastered
e: practicing
i: mastered
o: not started
u: not started

CVC Decoding
developing

Listening Comprehension
strong

Independent Reading
early Kindergarten
```

Do not necessarily build a polished parent dashboard unless already in scope.

Ensure the data exists.

---

# Review / Retention

Preserve or add a minimal mechanism for revisiting mastered material.

Do not implement an overcomplicated spaced-repetition algorithm unless justified.

At minimum ensure the architecture does not permanently remove a skill from future review merely because it reached mastery once.

---

# Expanded Simulation Harness

Simulate learners such as:

```text
A: complete beginner
B: knows letters, weak phonemic awareness
C: CVC reader, no long-vowel knowledge
D: Grade 1 phonics, weak fluency
E: strong listening comprehension, weak decoding
F: uneven Grade 1/2 profile
G: advanced reader entering at Kindergarten
H: learner with one severe prerequisite gap but strong higher-level comprehension
```

For each:

1. initialize learner state;
2. show the next 20–40 curriculum selections;
3. simulate plausible answers;
4. show how state changes;
5. verify that prerequisites control progression;
6. verify there are no nonsensical jumps.

---

# Required Tests

Expand educational behavior tests to include:

- all Kindergarten short vowels;
- CVC generalization;
- encoding;
- long vs short vowel transition;
- final/silent-e progression;
- digraph/blend prerequisites;
- higher phonics pattern gating;
- listening vs reading comprehension;
- uneven skill profiles;
- advanced learner skipping known skills;
- remediation after discovered gap;
- standards mapping;
- content decodability;
- durable state;
- duplicate attempts;
- review behavior where implemented.

---

# Required Documentation

Create:

```text
docs/curriculum/K2_ELA_FINAL_REVIEW.md
```

Include:

1. architecture summary;
2. educational progression summary;
3. changes made after Stage 3 review;
4. Kindergarten coverage;
5. Grade 1 coverage;
6. Grade 2 coverage;
7. remaining standards gaps;
8. sample learner paths;
9. diagnostic integration status;
10. game integration status;
11. known limitations;
12. next recommended curriculum work.

Update all previous design/coverage documents if implementation diverged.

---

# Final Quality Gates

Do not report K–2 ELA curriculum complete until:

- [ ] foundational literacy is first-class curriculum;
- [ ] a non-reader can begin without independent reading;
- [ ] phonological/phonemic awareness exists;
- [ ] alphabet/letter-sound instruction exists;
- [ ] vowel/consonant concepts exist;
- [ ] short-vowel progression exists;
- [ ] CVC blending exists;
- [ ] CVC segmentation exists;
- [ ] CVC decoding exists;
- [ ] CVC encoding exists;
- [ ] decodable text exists;
- [ ] long-vowel progression exists at the appropriate level;
- [ ] open/closed syllable behavior is represented appropriately;
- [ ] additional K–2 phonics patterns follow prerequisites;
- [ ] listening and reading comprehension are distinct;
- [ ] instruction is distinct from independent assessment;
- [ ] standards map to teachable skills;
- [ ] skills support prerequisites;
- [ ] `/learning` respects the curriculum graph;
- [ ] content avoids unintroduced phonics patterns where required;
- [ ] learner state is durable;
- [ ] duplicate evidence is prevented;
- [ ] educational sequence tests pass;
- [ ] simulation output has been manually inspected;
- [ ] K–2 standards coverage is documented honestly;
- [ ] relevant builds/typechecks/tests pass.

---

# Final Product Review

Do not judge success by total question count or standards count.

Judge success by the learner path.

Ask:

> Can this system take a child who does not yet read and systematically teach the prerequisite skills that lead to increasingly independent reading?

Then ask:

> When the child already knows some of those skills, can the system avoid wasting time while still identifying and repairing prerequisite gaps?

If either answer is no, continue correcting the curriculum before declaring the work complete.
