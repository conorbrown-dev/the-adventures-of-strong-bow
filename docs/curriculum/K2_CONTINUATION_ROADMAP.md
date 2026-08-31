# K–2 curriculum continuation roadmap

This roadmap is the portable handoff for continuing Molly's Learning Academy from another device or a new Codex session. It records what is implemented and verified, what remains, and the order of work. It does not claim that alignment coverage alone replaces a public-school program.

## Current scope

- Jurisdiction: Oklahoma first; do not add another state until this K–2 foundation has expert review.
- Grades: Kindergarten, Grade 1, and Grade 2.
- Core focus: reading and language arts, mathematics, science, social studies, health, physical education, fine arts, computer science, and information literacy.
- Supplemental areas: education technology and AI literacy are available but must remain clearly labeled as supplemental.

## Verified implementation

The curriculum catalog currently has 1,210 reviewed templates. The content validator reports one passage and one explicitly unsupported item. The following work is committed on `main`:

- Oklahoma K–2 standards catalogs and activity templates for the listed subject areas.
- Auto-scored K–2 Math and ELA practice templates, with answer choices and prompt-variation regression tests.
- Adult-observed activities for performance, writing, investigation, movement, and other skills that cannot be reliably judged by multiple-choice answers.
- Two successful adult observations required before an adult-scored skill is marked mastered.
- K–2 Math and ELA learning roadmaps, controlled subject placement, diagnostics, proctored checks, spaced review, hint tracking, and independent-versus-supported progress counts.
- Parent checklists for every K–2 adult-scored ELA activity.
- Optional adult observation notes stored with an activity attempt and displayed on the learner progress screen.
- An immediate same-skill retry after an incorrect practice response, with a fresh equivalent question.
- JWT-authenticated Learning and progress APIs that derive learner identity from the signed student session, reject cross-student access, expire invalid browser sessions, and keep Demo Mode out of tracked Learning.
- Production refuses to use the development JWT signing key when `JWT_SECRET` is missing.

Recent milestones:

- `18935c7` — varied K–2 Math practice prompts
- `1dc07d6` — varied K–2 ELA practice prompts
- `caa0a10` — parent checklists for K–2 ELA activities
- `165125e` — adult observation evidence
- `c5772fb` — same-skill practice retry

## Lesson-plan work in progress

- A versioned lesson-plan schema and validation/review workflow now protects the production boundary for instructional content.
- `k.math.counting-and-quantities` is the first reviewed sequence: five instructional days covering `K.CC.A.1`, `K.CC.A.2`, and `K.CC.A.3` with adult setup, concrete materials, text recommendations, explicit modeling, guided practice, reviewed-template question banks, extensions, reteach paths, accommodations, and measurable evidence.
- Conor Brown approved the sequence on August 25, 2026. Its content hash is stored with the review record, and the production lesson-plan loader now includes it.
- The standalone Learning dashboard now shows the approved plan at the learner's selected grade and subject. The dedicated guided-lesson screen includes every day, materials, text recommendation, independent-practice mapping, reteach path, accommodations, replayable model-backed overview narration, and predictable return navigation. The authenticated endpoint exposes only reviewed lesson plans.
- `k.ela.print-and-early-reading` is a machine-validated five-day Kindergarten ELA instructional draft. It teaches print concepts, letter-sound connections, and early word reading using existing reviewed templates, and remains outside the production bundle until named human review.
- `k.math.operations-and-number-bonds` adds five validated days of concrete addition, subtraction, decomposition, make-ten work, and fluency within five.
- `1.math.addition-and-subtraction-strategies` adds five validated Grade 1 days covering story problems, related facts, counting strategies, unknowns, and equation meaning.
- `1.ela.sound-spelling-and-word-reading` adds five validated, adult-supported Grade 1 days covering oral phoneme work, digraphs, one-syllable decoding, short/long vowel contrasts, syllables, endings, irregular words, and controlled-text reading.
- The lesson-plan catalog now contains five plans and 25 instructional days: one reviewed production plan and four validated drafts. The generated HTML/JSON review packet contains all five plans, while the production API continues to expose only the reviewed plan.

## Remaining objectives

### 1. Turn standards coverage into complete instruction

- Create sequenced, multi-day lesson plans for every K–2 Math and ELA standard cluster: warm-up, explicit model, guided practice, independent practice, extension, and reteach path.
- Add concrete materials lists, printable or on-screen manipulatives, age-appropriate read-aloud/text recommendations, and a parent preparation guide for each hands-on activity.
- Replace generic adult prompts where needed with reviewed, child-friendly task directions that identify a visible product or performance.
- Add grade-specific course roadmaps for science, social studies, health, physical education, fine arts, computer science, and information literacy; the activity catalogs exist, but these subjects do not yet have parent-facing unit sequences.

### 2. Deepen assessment quality

- Expand each auto-scored Math and ELA skill into a reviewed item bank with several meaningfully different contexts and difficulty levels, not merely numeric substitutions.
- Add rubric-based scoring for writing, oral language, reading fluency, projects, science investigations, movement, and fine arts; preserve the adult evidence note with each rubric result.
- Add formative checks during lessons and grade-level summative assessments with a documented blueprint and coverage report.
- Have Oklahoma-qualified curriculum and assessment reviewers validate every standards interpretation, item, answer, distractor, and rubric before presenting readiness claims.

### 3. Make progress reporting useful for homeschool records

- Provide parent exports of standards progress, attempts, observation notes, work samples, dates, and mastery evidence.
- Add a parent-facing dashboard that identifies prerequisites, scheduled reviews, incomplete lessons, and suggested next steps by subject.
- Support uploading or linking evidence artifacts such as scans, photos, audio recordings, and completed writing; define retention, access, and deletion rules before storing them.

### 4. Meet accessibility, safety, and operational needs

- Audit every screen and lesson for keyboard operation, focus visibility, contrast, readable language, captions/transcripts, screen-reader labels, and reduced-distraction alternatives.
- Add documented accommodations for dyslexia, dysgraphia, speech/language needs, hearing or vision needs, motor needs, and multilingual learners. Do not treat an accommodation as invalidating mastery evidence.
- Review child privacy, account security, parent access, data retention, content safety, and incident handling before collecting additional student evidence.
- Verify deployment reliability, database backup/recovery, health checks, error reporting, and session persistence. Run end-to-end tests for enrollment, placement, learning, adult scoring, progress, and exports.

### 5. Establish responsible launch criteria

- Consult current Oklahoma homeschool requirements and a qualified professional; do not claim legal compliance or equivalence to public school without a jurisdiction-specific review.
- Pilot with families and educators, collect structured usability and learning-evidence feedback, and revise the curriculum before a broader launch.
- Maintain versioned curriculum releases, reviewer records, change logs, and regression suites whenever standards or learning content changes.

## Recommended next increment

Review the four validated sequences as one K–1 packet and approve only those whose unchanged content hashes pass named human review. The next authoring tranche should complete Kindergarten shapes/measurement/data, add the remaining short-vowel and controlled-text scope to the executable ELA engine, and build Grade 1 place-value instruction. Continue to treat reviewed question coverage and complete instructional coverage as separate claims.

## Verification commands

Run these after server curriculum changes:

```powershell
Set-Location server
npx jest src/curriculum/application/question-generator.spec.ts --runInBand
npx jest src/curriculum/application/learning-facade.service.spec.ts --runInBand
npx jest src/curriculum/infrastructure/lesson-plan-catalog.spec.ts --runInBand
npm run curriculum:content:validate
npm run curriculum:lesson-plans:validate
npm run build
```

Run these after client changes:

```powershell
npm test
npm run build
```

Before committing, also run:

```powershell
git diff --check
git status -sb
```
