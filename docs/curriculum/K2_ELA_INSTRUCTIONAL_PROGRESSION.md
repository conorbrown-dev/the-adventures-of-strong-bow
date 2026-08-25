# K–2 ELA Instructional Progression

Stage 2 design only. This document defines the instructional architecture and sequence that the Stage 2B tutor/lesson-engine design must turn into a reusable teaching experience before Stage 3 proves it with a small Kindergarten vertical slice. It does not change production curriculum or learner data.

Repository source of truth inspected: `server/src/curriculum/domain/`, `server/src/curriculum/application/`, `server/src/curriculum/infrastructure/`, `server/prisma/schema.prisma`, `src/learning/`, the Common Core generated dataset, the Oklahoma ELA catalog, and the Stage 1 gap analysis.

## 1. Design principles

1. **Standards are destinations; skills are teachable steps.** Oklahoma is the primary reporting framework because the product is Oklahoma-first. Common Core remains a secondary, provenance-bearing crosswalk. Neither framework controls instructional order.
2. **A stable skill is the smallest durable learning target.** Activities and question templates target skills; standards roll up evidence from mapped skills.
3. **Teach before test.** An unintroduced skill receives instruction and a modeled example before guided or independent practice. A diagnostic may probe an unintroduced skill, but it must not mark that skill “introduced.”
4. **Prerequisites outrank numeric priority.** Rank resolves ties only among skills whose prerequisites are satisfied.
5. **Audio is core delivery, not a cosmetic accommodation.** Pre-reader activities narrate directions and every non-visual response option. The evidence model records delivery mode and support without treating accessibility as failure.
6. **Listening and reading evidence are separate.** Narrated comprehension can build knowledge and comprehension without claiming independent decoding.
7. **Decodability is learner-relative.** A sentence is independently decodable only if its patterns and explicitly mapped irregular words are within the learner's taught scope.
8. **Accuracy precedes speed.** Fluency begins with accurate decoding and phrasing; timed pressure is not a prerequisite for early mastery.
9. **Grade organizes expectations, not access.** A learner may have K phonics, Grade 1 listening comprehension, and Grade 2 vocabulary profiles simultaneously.
10. **Curriculum, diagnostics, and games retain separate purposes.** They can share skill IDs and content assets, but evidence rules differ.
11. **Human review remains a production boundary.** Skill mappings, sequences, decodable text, phoneme audio, distractors, rubrics, and mastery policies require versioned review.
12. **Preserve durable infrastructure.** Extend the existing authenticated API, deterministic sessions, idempotent attempts, review gates, TTS service, and lesson renderer rather than replacing them without cause.

### Smallest coherent domain model

The proposed first-class unit is `ElaSkillDefinition`:

```ts
type ElaSkillDefinition = {
  id: string;                         // stable, never reused
  version: number;
  domainId: ElaDomainId;
  competencyId: string;
  parentSkillId?: string;             // optional coverage-family rollup; never a prerequisite shortcut
  name: string;
  description: string;
  gradeBand: { introducedBy: "K" | "1" | "2"; expectedBy: "K" | "1" | "2" };
  prerequisiteSkillIds: string[];
  sequenceRank: number;               // tie-breaker, not a substitute for prerequisites
  importance: "FOUNDATIONAL" | "CORE" | "SUPPORTING" | "ENRICHMENT";
  standardMappings: Array<{
    standardId: string;
    framework: "OKLAHOMA" | "COMMON_CORE";
    relationship: "PRIMARY" | "SUPPORTING";
  }>;
  masteryPolicyId: string;
  contentScopeId?: string;            // phonics/decodability constraints when needed
  allowedPurposes: ActivityPurpose[];
  delivery: {
    independentReading: "NONE" | "OPTIONAL" | "REQUIRED";
    audio: "REQUIRED" | "SUPPORTED" | "NOT_APPLICABLE";
  };
  review: ReviewMetadata;
};
```

Design choices:

- `subject` is omitted because this is an ELA-specific aggregate. A future generic skill interface may add it without changing IDs.
- Activity type is not embedded as authored content in the skill. `allowedPurposes` constrains valid activity mappings; versioned `LearningActivityDefinition` records supply the actual instruction or assessment.
- Content constraints are referenced, not duplicated per skill. This allows several activities to share one controlled phonics scope.
- Coverage-level skill families in the standards matrix may have executable child skills when a broad outcome must be learned cumulatively. For example, `ela.phonics.cvc-and-one-syllable-decode` can roll up reviewed vowel-specific children such as `ela.phonics.cvc.decode.short-a`. Only leaf/executable skills are selected and assigned direct learner mastery; family state is derived from its required children. `parentSkillId` is not a substitute for explicit prerequisite edges.
- Standards mapping is many-to-many and is not used as the prerequisite graph.
- Review metadata is required before a skill can enter the production progression.

An activity is separately modeled:

```ts
type ActivityPurpose =
  | "INSTRUCTION"
  | "MODELED_EXAMPLE"
  | "GUIDED_PRACTICE"
  | "INDEPENDENT_PRACTICE"
  | "MASTERY_CHECK"
  | "DIAGNOSTIC"
  | "REVIEW"
  | "GAME_REINFORCEMENT";

type LearningActivityDefinition = {
  id: string;
  version: number;
  skillIds: string[];
  primarySkillId: string;
  purpose: ActivityPurpose;
  activityKind: string;
  contentScopeId?: string;
  deliveryModes: EvidenceMode[];
  content: Record<string, unknown>;
  review: ReviewMetadata;
};
```

This separation allows many activities per skill, one activity to support related skills, and different evidence rules for an explanation, guided response, independent response, diagnostic probe, or game.

## 2. K–2 domain structure

| Domain | Competencies | K–2 purpose |
| --- | --- | --- |
| Oral language | Word/sentence awareness; listening and speaking routines | Builds spoken language without requiring print. |
| Phonological and phonemic awareness | Rhyme; syllables; onset/rime; isolation; blending; segmentation; manipulation | Develops access to speech sounds before and alongside phonics. |
| Print concepts and alphabet knowledge | Book/print handling; directionality; word boundaries; letter identity/name/case | Provides the visual-print foundation without displacing decoding. |
| Phonics and word recognition | Consonants/vowels; CVC; complex consonants; vowel patterns; syllable types; morphology; irregular words | Connects speech sounds to print in a cumulative sequence. |
| Encoding and written conventions | Sound-to-spelling; handwriting; spelling; sentence conventions | Reinforces the same sound-spelling system through writing. |
| Decodable text and fluency | Accurate word reading; sentences; connected text; automaticity; phrasing; self-correction | Moves from word accuracy to meaningful connected reading. |
| Listening comprehension | Literature and informational understanding from narrated/shared text | Allows rich comprehension and knowledge building before decoding catches up. |
| Reading comprehension | Understanding learner-read controlled and later grade-level text | Attributes comprehension evidence only when text delivery supports a reading claim. |
| Vocabulary and language | Oral vocabulary; context; morphology; word relationships; grammar and usage | Builds language beyond the limits of currently decodable words. |
| Composition and communication | Drawing/emergent writing; narrative/informational/opinion composition; discussion; research; multimodal communication | Covers the full ELA standards while allowing adult-observed and rubric-scored evidence. |

The domains are parallel strands. Listening comprehension, oral vocabulary, discussion, and emergent composition start immediately; they do not wait for decoding. Print concepts are supporting skills taught in short, purposeful doses. The foundational decoding spine is phonological awareness → alphabet/sound knowledge → vowel knowledge → CVC work → increasingly complex phonics → decodable connected text.

## 3. Skill dependency graph

Prerequisites are directed edges between stable skill IDs. The graph must be acyclic, versioned, reviewed, and validated at catalog load. An edge means “sufficiently established before independent work,” not necessarily “mastered before any exposure.” Each edge may eventually carry a threshold such as `INTRODUCED` or `MASTERED`; the Stage 3 implementation should begin with `MASTERED` for decoding-critical edges and `INTRODUCED` for safe co-development edges. Stage 2B must define how lesson recipes represent the guided exposure allowed before those independent-work thresholds are met.

```text
Spoken word awareness
  ├─→ rhyme awareness/production
  └─→ syllable blending/segmentation
          └─→ onset/rime blending/segmentation
                  └─→ phoneme isolation (initial → final → medial)
                          ├─→ phoneme blending (2 → 3 → 4+ phonemes)
                          ├─→ phoneme segmentation (2 → 3 → 4+ phonemes)
                          └─→ phoneme manipulation (add/delete/substitute)

Letter identity + case matching
  └─→ common consonant sounds ──────────────┐
Vowel identity + short-vowel sound ─────────┤
Three-phoneme oral blending ────────────────┤
                                            ▼
                                  decode short-vowel CVC

common consonant sounds + short-vowel sound ─┐
Three-phoneme segmentation ──────────────────┤
Letter formation/sound-to-symbol ────────────┤
                                             ▼
                                   encode short-vowel CVC

decode CVC + mapped high-frequency words + print directionality
  └─→ read controlled sentence
        └─→ read controlled connected text
              ├─→ reading comprehension evidence
              └─→ fluency (accuracy → automaticity → phrasing)

CVC/closed pattern
  ├─→ digraphs and consonant blends
  ├─→ final consonant patterns
  └─→ silent-e contrast
         ├─→ open/closed syllable contrast
         ├─→ vowel teams and r-controlled vowels
         └─→ inflections/structural analysis
                └─→ two- and multisyllable decoding
```

Concrete example:

```text
ela.phonics.cvc.decode.short-a requires:
  ela.alphabet.lowercase.set-1
  ela.phonics.consonant-sounds.set-1
  ela.phonics.vowel.short-a
  ela.pa.phoneme-blend.three

ela.text.sentence.short-a requires:
  ela.phonics.cvc.decode.short-a
  ela.word.irregular.set-1 (only if the sentence uses those words)
  ela.print.direction.left-to-right
  ela.print.word-boundaries-spacing
  ela.print.sentence-features
```

The standard mapping can connect each of these skills to both `K.2.PWS.4` and relevant Common Core `K.RF.*` outcomes. Mastery remains separate for each skill.

### Instructional importance

- `FOUNDATIONAL`: gates the decoding spine or access to instruction—phoneme blending/segmentation, letter-sound knowledge, short vowels, CVC decoding, controlled text.
- `CORE`: required grade-band ELA learning that does not gate every decoding step—comprehension, encoding, fluency, composition, vocabulary.
- `SUPPORTING`: useful enabling knowledge—book parts, print terminology, alphabet sequence, reference features.
- `ENRICHMENT`: optional extension beyond the current required path.

Importance never overrides an unsatisfied prerequisite. It determines which ready skill is selected first and prevents supporting print-concept questions from crowding out foundational decoding work.

## 4. Kindergarten progression

All stages include parallel narrated literature/informational comprehension, oral vocabulary, discussion, drawing, and emergent writing. “Stage” is instructional readiness, not a rigid week or age.

| Stage | Foundational focus | Representative stable skills | Learner evidence |
| --- | --- | --- | --- |
| K0: oral access | Spoken word awareness, rhyme, syllables, oral directions | `ela.pa.word-awareness`, `ela.pa.rhyme`, `ela.pa.syllable`, `ela.oral.follow-directions` | Select, say, clap, move, or sort using audio/pictures; no print required. |
| K1: sound parts and print orientation | Onset/rime; initial/final sounds; book orientation; words vs pictures; directionality | `ela.pa.onset-rime`, `ela.pa.isolate.initial`, `ela.pa.isolate.final`, `ela.print.book-orientation`, `ela.print.direction.left-to-right` | Spoken/picture responses plus adult-observed book handling. |
| K2: first letter/sound set | Letter vs symbol, uppercase/lowercase identity and matching, names, common consonant sounds; identify vowels as a class | `ela.alphabet.letter-vs-symbol`, `ela.alphabet.case-match.set-1`, `ela.phonics.consonant-sounds.set-1`, `ela.phonics.vowel.identity` | Visual selection with narrated controls; produce sounds using prerecorded/reviewed audio prompts. |
| K3: first short vowel and oral CVC | Short `a`; medial sound discrimination; blend/segment two and three phonemes | `ela.phonics.vowel.short-a`, `ela.pa.isolate.medial`, `ela.pa.phoneme-blend.three`, `ela.pa.phoneme-segment.three` | Spoken sound work first, then sound-to-letter mapping. |
| K4: short-a CVC reading/writing | Decode unfamiliar short-a CVCs; encode/spell; generalize beyond practiced families | `ela.phonics.cvc.decode.short-a`, `ela.encoding.cvc.short-a` | Read and build unfamiliar controlled words; no passing by memorizing one family. |
| K5: expand short vowels | Add short `i`, `o`, `e`, `u` with auditory contrast; cumulative CVC decoding/encoding | `ela.phonics.vowel.short-i`, `.short-o`, `.short-e`, `.short-u`, `ela.phonics.cvc.decode.mixed-short-vowels` | Interleaved minimal contrasts and unfamiliar words within taught letters. |
| K6: early connected text | Explicitly mapped high-frequency words; decodable phrases/sentences; punctuation awareness | `ela.word.regular.high-frequency.k`, `ela.word.irregular.set-1`, `ela.text.sentence.cvc`, `ela.print.punctuation.basic` | Read controlled sentences; explain temporary irregular parts; answer literal reading questions. |
| K7: consolidation | Phoneme substitution; selected common digraphs/final patterns where ready; decodable connected text | `ela.pa.manipulate.substitute`, `ela.phonics.digraph.intro`, `ela.text.connected.k` | New word transfer, brief connected reading, retell/details from learner-read text. |
| K8: Kindergarten exit profile | Accurate cumulative decoding, early automaticity, shared/independent reading habits | `ela.fluency.accurate.k`, `ela.reading.literal.k`, `ela.composition.emergent.k` | Separate strand states; no single overall grade erases a decoding gap. |

Suggested letter order is organized for early word-building and visual/auditory contrast, not alphabetical recitation:

```text
Set 1: m, s, t, p, n, c + a
Set 2: f, r, l, h, b + i
Set 3: d, g, k, w + o
Set 4: j, v, y, x + e
Set 5: q, z + u; cumulative review
```

Uppercase, lowercase, name, and common sound are taught within each set. Similar-looking or easily confused forms are introduced with enough spacing and explicit comparison. This order is a design seed for qualified review, not a claim of final scientific validation.

In the first set, `c` is scoped only to its common `/k/` correspondence in words such as `cat` and `can`; soft `c` is explicitly forbidden until a later reviewed pattern scope. Letter identity and a particular sound-spelling correspondence remain distinct skills.

Print concepts run as short supporting activities at K0–K6. Book cover/title identification must never become the gate to phonemic awareness or decoding.

## 5. Grade 1 progression

Grade 1 begins at the learner's skill frontier. A learner missing Kindergarten decoding prerequisites receives the relevant instruction without being forced through unrelated Kindergarten standards.

| Stage | Primary progression | Parallel language/literacy work |
| --- | --- | --- |
| G1-0 bridge | Verify/reteach phoneme blending, segmentation, short vowels, and CVC transfer | Narrated comprehension, oral vocabulary, discussion, sentence composition. |
| G1-1 complex consonants | Digraphs (`sh`, `ch`, `th`, `wh`, `ng`, `ck`), initial/final blends, final consonant patterns | Encode the same patterns; read controlled sentences. |
| G1-2 vowel contrasts | Short vs long vowels; final/silent-e; every syllable contains a vowel | Explicit comparison of pairs such as `cap/cape`; avoid terminology before useful. |
| G1-3 common vowel patterns | Common vowel teams and r-controlled vowels, introduced in reviewed sets | Decodable text constrained to introduced patterns and mapped irregular words. |
| G1-4 structural word reading | Inflectional endings, compounds, contractions where mapped, two-syllable decoding | Morphology supports vocabulary and spelling as well as decoding. |
| G1-5 word recognition | Automatic recognition of currently decodable high-frequency words plus explicitly mapped irregular words | No undifferentiated whole-word list. |
| G1-6 fluency and text | Accurate connected reading, repeated reading, automaticity, phrasing, self-correction | Listening and reading comprehension remain separate; literature/information skills deepen in both modes. |
| G1-7 composition/research | Complete sentences; narrative, information, and opinion pieces; shared research | Adult/rubric evidence for open performance, with work samples later. |

Grade 1 phonemic-awareness work extends to four-to-six phonemes and add/delete/substitute operations as required by Oklahoma `1.2.PA.*`; it remains spoken and does not require printed choices.

## 6. Grade 2 progression

| Stage | Primary progression | Parallel language/literacy work |
| --- | --- | --- |
| G2-0 bridge | Address unresolved complex-consonant, vowel-pattern, and oral manipulation gaps | Preserve stronger listening/vocabulary placement. |
| G2-1 advanced pattern sets | Additional vowel teams, diphthongs where reviewed, r-controlled patterns, final patterns | Cumulative encoding and controlled passages. |
| G2-2 syllable types | Closed, open, silent-e, vowel-team, r-controlled, consonant-`le` patterns | Teach useful recognition/decoding before requiring terminology. |
| G2-3 structural analysis | Common roots, prefixes, suffixes, inflections, contractions, abbreviations, spelling changes | Connect morphology to meaning and spelling. |
| G2-4 multisyllable decoding | Two-syllable and emerging multisyllable division/decoding with cumulative patterns | Generalize to unfamiliar words, not memorized lists. |
| G2-5 automatic word reading | Regular high-frequency words plus explicitly mapped irregular parts | Review words in phrases and connected text. |
| G2-6 fluency and comprehension | Accurate, smooth, expressive grade-appropriate reading with self-correction | Reading comprehension uses independently read text; listening comprehension continues with richer texts. |
| G2-7 composition/knowledge | Organized narrative, informational, and opinion paragraphs; research, language, multimodal communication | Rubric-scored products and adult evidence remain distinct from multiple choice. |

## 7. Listening versus reading comprehension

Comprehension concepts can be parallel, but their skills and evidence cannot collapse:

| Concept | Listening skill example | Reading skill example |
| --- | --- | --- |
| Character/setting | `ela.listen.literature.elements.k` | `ela.read.literature.elements.k` |
| Sequence/retell | `ela.listen.sequence.k` | `ela.read.sequence.k` |
| Main idea/details | `ela.listen.information.main-idea.k` | `ela.read.information.main-idea.k` |
| Prediction/cause-effect | `ela.listen.inference.early` | `ela.read.inference.early` |

Listening activities use rich, age-appropriate narrated language and may exceed the learner's decoding vocabulary. Reading activities use text whose decoding demands match the learner's scope. A narrated copy of a reading passage may remain available as an accommodation or instructional mode, but the resulting evidence is tagged `LISTENING` or `SUPPORTED_READING`, not `INDEPENDENT_READING`.

Proposed evidence modes:

```text
SPOKEN_ONLY
LISTENING
VISUAL_PRINT_WITH_NARRATED_DIRECTIONS
SUPPORTED_READING
INDEPENDENT_READING
ADULT_OBSERVED
```

Support events are separately recorded: prompt replay, choice audio, slow blend, hint, adult read-aloud, modeled answer, speech response, and reduced-choice scaffold. Support informs the next activity but does not remove earned knowledge or label accessibility use as failure.

## 8. Instruction, practice, and mastery lifecycle

```text
NOT_INTRODUCED
  → INSTRUCTION
  → MODELED_EXAMPLE
  → INTRODUCED
  → GUIDED_PRACTICE
  → PRACTICING
  → INDEPENDENT_PRACTICE
  → MASTERY_CHECK
  → MASTERED
  → REVIEW_DUE
  → MASTERED or PRACTICING
```

Rules:

- Diagnostic evidence updates placement/gap confidence only. It can allow the selector to skip instruction when sufficient independent evidence already exists, but it does not masquerade as a completed lesson.
- Instruction/model responses are unscored for mastery.
- Guided attempts record misconceptions/support but are not independent mastery evidence.
- Independent practice builds readiness for a mastery check.
- Mastery checks use unseen/equivalent forms, the correct evidence mode, and skill-specific policy. They are not the first encounter with content.
- A failed mastery check returns the learner to targeted guided or independent practice; it is not punitive.
- Open writing/speaking/fluency skills use reviewed adult or rubric evidence rather than forced multiple choice.

Default policy shape, with values reviewed per skill:

```ts
type SkillMasteryPolicy = {
  minimumIndependentAttempts: number;
  minimumAccuracy: number;
  minimumDistinctActivities: number;
  minimumOccasions: number;
  requiredEvidenceModes: EvidenceMode[];
  criticalErrorRules?: string[];
  reviewScheduleDays?: number[];
};
```

Standards progress is derived from mapped skill states and mapping relationships. It is a reporting rollup, not the source that advances the course.

## 9. TTS and audio use

### Required behaviors

- Pre-reader screens automatically narrate concise directions, with visible replay and stop controls.
- Every response option whose meaning is linguistic rather than purely visual has an audio control and keyboard/focus behavior.
- Phoneme, segmented-word, slow-blend, normal-word, sentence, and passage audio are separate authored cue types.
- Slow blending plays discrete reviewed phoneme clips with controlled spacing; ordinary TTS must not be assumed to synthesize phonemes accurately.
- Normal pronunciation uses prerecorded reviewed assets where available or model TTS for whole words/sentences.
- Narration stops before navigation or replacement prompts, using the existing `speak`/`stopSpeaking` boundary.
- Tests inject fake/in-memory audio responses or mock `/api/tts`; selection and scoring must not depend on real audio duration.

### Content metadata

```ts
type AudioCue = {
  id: string;
  kind: "PHONEME" | "SEGMENTED_WORD" | "SLOW_BLEND" | "WORD" | "SENTENCE" | "PASSAGE" | "DIRECTION";
  text?: string;
  phonemeIds?: string[];
  assetKey?: string;
  pronunciation?: string;
  review: ReviewMetadata;
};
```

The existing `src/quiz/speech.ts` remains the feature-code entry point. Stage 2B must specify the reusable tutor narration and cue-resolution contract; Stage 3 should implement the approved subset above the existing helper rather than introducing browser synthesis into activities.

## 10. Decodable-content strategy

A small explicit scope is sufficient; Stage 2 does not require a general linguistic engine.

```ts
type DecodableScope = {
  id: string;
  graphemePhonemeIds: string[];
  allowedPatternIds: string[];
  targetPatternIds: string[];
  allowedRegularWords: string[];
  mappedIrregularWords: Array<{
    word: string;
    regularParts: string[];
    irregularParts: string[];
  }>;
  forbiddenPatternIds: string[];
  maxWordsPerSentence?: number;
  review: ReviewMetadata;
};
```

Authoring validation tokenizes a proposed word/sentence against the declared scope, permits only listed irregular words, and reports exact unintroduced patterns. It must reject silent-e, vowel-team, blend, digraph, or morphology patterns unless explicitly allowed. Proper names and contractions are not silent exceptions.

Decodable texts carry both a phonics target and a comprehension purpose. Questions about learner-read text can assess literal meaning without adding harder decoding in the answer choices; image or narrated answer options may be used while preserving the fact that the passage itself was independently read.

Vocabulary/read-aloud content uses a separate rich-language scope and is never constrained to decodable vocabulary.

## 11. Learner-selection algorithm

The selector returns an activity, not merely a question template.

```text
input:
  learner skill progress
  diagnostic target skills
  reviewed skill graph
  reviewed activities/content scopes
  due reviews
  session history and requested length

1. Mark mastered skills with elapsed review intervals as review due.
2. Map diagnostic standard targets to candidate skills; do not use standard order.
3. Find READY skills:
     active, reviewed, within supported K–2 band,
     all gating prerequisites sufficiently satisfied,
     at least one valid activity for the needed lifecycle phase.
4. Keep the current focus skill while productive instruction/practice remains.
5. Otherwise rank READY skills by:
     a. due critical review (bounded so review does not consume the whole session),
     b. unresolved critical diagnostic target,
     c. importance: FOUNDATIONAL > CORE > SUPPORTING > ENRICHMENT,
     d. in-progress before not-introduced,
     e. grade-band appropriateness,
     f. reviewed sequenceRank,
     g. stable skill ID.
6. Derive purpose from progress:
     NOT_INTRODUCED → INSTRUCTION/MODELED_EXAMPLE
     INTRODUCED → GUIDED_PRACTICE
     PRACTICING → INDEPENDENT_PRACTICE
     mastery-ready → MASTERY_CHECK
     REVIEW_DUE → REVIEW
7. Filter activities by evidence mode, content scope, accessibility, and recency.
8. Choose deterministically among equivalent activities using the session seed.
9. Plan a short coherent session: focus activities, one compatible spiral review,
   and optional supporting oral/comprehension work; never introduce many new skills at once.
```

A reasonable early session is 6–10 activities, not ten unrelated standards. Stage 2B must define resumable lesson-stage checkpoints within that session; Stage 3 simulation should expose every selection reason, prerequisite decision, recipe/stage checkpoint, content scope, and expected evidence mode.

## 12. Progress and mastery model

`SkillProgress` is the durable source for instructional selection:

```ts
type SkillState =
  | "NOT_INTRODUCED"
  | "INTRODUCED"
  | "PRACTICING"
  | "MASTERED"
  | "REVIEW_DUE";

type SkillProgress = {
  learnerId: string;
  skillId: string;
  skillVersion: number;
  state: SkillState;
  highestCompletedPhase: ActivityPurpose | null;
  independentAttemptCount: number;
  masteryAchievedAt: Date | null;
  nextReviewAt: Date | null;
  updatedAt: Date;
};
```

Attempts add `primarySkillId`, `supportingSkillIds`, activity ID/version, purpose, evidence mode, and structured support events while retaining current standard IDs for reporting compatibility.

Example learner profile:

```text
Alphabet knowledge       MASTERED
Phonemic awareness       PRACTICING
CVC decoding             NOT_INTRODUCED (prerequisite blocked)
Listening comprehension MASTERED at Grade 1 expectation
Independent reading      NOT_INTRODUCED
```

Standard rollups should report `not covered`, `in progress`, `partially demonstrated`, or `demonstrated` based on their mapped primary skills. A broad standard never becomes mastered from one child skill or one multiple-choice response.

## 13. Review strategy

- Reuse the current 1/3/7/14/30-day intervals as a configurable default, not a universal immutable policy.
- Review is skill- and pattern-specific. A short-a review can use an unseen word or sentence within the same scope.
- Include at most a bounded share of review activities in a session unless a foundational review failure blocks current work.
- Successful reviews advance the interval. A failed review returns the skill to `PRACTICING`, schedules targeted support, and preserves mastery history.
- Mix cumulative patterns only after each included pattern has been introduced.
- Listening comprehension, oral vocabulary, writing, and fluency may use different review evidence and intervals.
- Game reinforcement can refresh exposure but does not independently award mastery unless an activity is explicitly reviewed for valid mastery evidence—which games should not assume by default.

## 14. Known limitations and review decisions still required

1. The proposed letter sets and phonics order require review by a qualified early-literacy educator before production approval.
2. English phoneme representation varies by dialect. Phoneme IDs, pronunciations, examples, and audio need a documented dialect policy and human review.
3. The repository contains no reviewed Oklahoma/Common Core crosswalk; Stage 2's coverage matrix is a design mapping, not an official equivalence claim.
4. Existing standards and activities contain verified misalignments. In particular, the Kindergarten Common Core `K.RF.3.b/.c/.d` content is shifted across vowel knowledge, high-frequency words, and word discrimination. The matrix flags these for reclassification.
5. Mastery thresholds in this document are policy shapes, not validated psychometrics.
6. Decodable validation will initially need a curated lexicon and pattern set; it cannot infer all English pronunciations safely.
7. Speech recognition is optional response support and may be unreliable for young children or some speech differences. Pointer/keyboard/picture alternatives must remain.
8. Adult-observed writing, speaking, and fluency require reviewed rubrics; two generic checkboxes are not sufficient evidence for every standard.
9. Existing learner evidence cannot be safely converted into fine-grained skill mastery without provenance. The implementation plan therefore uses conservative migration.
10. Stage 2B must still define the reusable tutor and lesson renderer before implementation. Stage 3 then proves one vertical slice, not the full K–2 sequence. Unimplemented skills must remain unavailable rather than silently falling back to standards-order questions.

### Stage 2 self-review answer

If implemented faithfully, this architecture gives a non-reader a valid route: spoken sound instruction and narrated controls precede print demands; letters/sounds and short vowels precede CVC reading; CVC reading precedes controlled sentences; narrated comprehension continues independently of decoding; and reading mastery is recorded only from the appropriate evidence mode. No planned pre-reading activity requires reading as an unstated prerequisite.
