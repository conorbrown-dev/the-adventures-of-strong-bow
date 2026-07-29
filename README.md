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
