# Molly's Learning Game — Common Core K–5 Starter Kit

This package is intended to be copied into the repository for Molly's browser-based
Phaser/TypeScript learning game.

## Start here

1. Copy this package into the repository, preserving the folder structure.
2. The machine-readable K-5 standards are already included. Optional: run the download script to fetch the official PDFs for local review.
3. Run `python scripts/build-vendored-common-core.py` to verify/rebuild the vendored JSON and CSV.
4. Give Codex `prompts/00_IMPLEMENT_CURRICULUM_SYSTEM.md`.
5. Have Codex complete the implementation tickets in numerical order.
6. Do not bulk-copy third-party lessons, images, stories, or assessments into the
   shipping game. Use the source catalog and attribution rules in `docs/curriculum`.

## What is included

- A primary Codex implementation prompt
- Five smaller implementation tickets
- JSON Schemas for standards, question templates, generated questions, attempts,
  and mastery progress
- Original sample standards metadata and question templates
- A verified curriculum-source and licensing manifest
- Attribution notices
- Scripts that download the official Common Core identifier CSV and reference PDFs

## Recommended first release

Import the complete official K–5 Common Core catalog, but ship authored/generated
question coverage in this order:

1. Kindergarten ELA foundational skills
2. Kindergarten math
3. Grade 1 ELA foundational skills
4. Grade 1 math
5. Grade 2 ELA and math
6. Grades 3–5 by domain

This gets Molly useful material quickly without pretending that merely importing a
standard creates a valid assessment for it.

## Included standards dataset

The archive now includes 695 K-5 Common Core Math and ELA rows, so
implementation does not depend on the two broken machine-readable URLs.

See:

- `docs/curriculum/DATA_SOURCE_RECOVERY.md`
- `data/curriculum/generated/common-core-k5-manifest.json`

## Proctored mastery checks

Set `CURRICULUM_PROCTOR_CODE` in the server environment to an adult-only code. A parent or teacher enters it before a five-question proctored check. A score of at least 4 out of 5 verifies mastery for that standard; verified standards rotate out of everyday practice until a scheduled review is due.

## Student authentication

Set `JWT_SECRET` in every production server environment to a long, randomly generated secret. The server refuses to start in production without it. Student-specific progress, quiz attempts, subject-level changes, and standalone Learning sessions require the bearer token issued after student creation or PIN login. The API derives the learner identity from that signed token and does not accept a caller-supplied learner ID.

## Railway deployment

Add a PostgreSQL service to the project. On the application service, set
`DATABASE_URL` to `${{Postgres.DATABASE_URL}}` (using the database service's actual
name) and set `JWT_SECRET` to a long, randomly generated secret. The production
launcher requires both variables, applies Prisma migrations, and starts the API
on port 3000 alongside the web server.

Railway checks `/api/health`, which verifies that the API and database respond.
The homepage alone cannot establish that learning sessions are available.

## Mastered game skills

Open **Fossil Dig → Settings** for parent and teacher controls. Uncheck any
Fossil Dig lesson to remove it from the lesson menu. Uncheck **CVC practice
across games** to disable Fossil Dig CVC and Short Vowels, Phonics Racing
Short Vowels, and Barn Door Vowels (whose closed-vowel exercises use CVCs).
Other lessons retain CVC distractors when they help contrast the target skill.

These preferences apply to all students in the current browser and persist
across reloads. Recheck a skill to make it available again. The **Dig length &
sound** button opens the existing game length and volume controls.
