# Curriculum Resource and Licensing Manifest

Verified for planning on July 24, 2026. This is an engineering inventory, not legal
advice. Preserve item-level notices and re-check licenses before commercial release.

## 1. Common Core State Standards

### Vendored K-5 machine-readable dataset

- Import file: `data/curriculum/generated/common-core-k5-standards.json`
- Tabular copy: `data/curriculum/generated/common-core-k5-standards.csv`
- Integrity/provenance: `data/curriculum/generated/common-core-k5-manifest.json`
- Pinned recovery source: `resources/raw/ccss-recovery-source-philngo-rev-02895145.csv`
- Rebuild script: `scripts/build-vendored-common-core.py`
- Record count: 695
- License applied to standards text: Common Core Public License
- Required notice:
  `© Copyright 2010. National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved.`

The recovery source is a public GitHub snapshot rather than an official
machine-readable NGA/CCSSO release. Representative entries were checked against the
official PDFs. A full row-by-row audit remains a release-hardening task.

### Official reference PDFs

- Mathematics:
  https://corestandards.org/wp-content/uploads/2023/09/Math_Standards1.pdf
- English Language Arts/Literacy:
  https://corestandards.org/wp-content/uploads/2023/09/ELA_Standards1.pdf

Use the PDFs for human review and final content verification. Do not make production
builds depend on downloading or parsing them.

### Broken machine-readable URLs

Do not use these in scripts:

- `https://thecorestandards.org/wp-content/uploads/ccssi.zip`
- `https://www.thecorestandards.org/assets/E0607_ccss_identifiers.csv`

Both returned 404 on July 24, 2026.

## 2. Illustrative Mathematics K-5

- URL: https://im.kendallhunt.com/k5/curriculum.html
- License: CC BY 4.0 for curriculum materials except excluded marks and separately
  licensed content
- Use for progression and item-design reference
- Prefer original Molly's Learning Game wording and artwork

## 3. Achieve the Core

- Permissions URL: https://achievethecore.org/ccpd
- General permission: CC0/public-domain dedication
- Individual pages may contain third-party material
- Do not bulk scrape; preserve page-level provenance for selected adaptations

## 4. EL Education K-5 Language Arts, 2017 edition

- Curriculum URL: https://access.openupresources.org/curricula/el-k5-2017
- Licensing URL: https://www.openupresources.org/help-support/licensing-questions/
- Generally CC BY 4.0, excluding identified third-party material
- Create original passages and graphics rather than copying referenced books,
  poems, photographs, or illustrations

## Provenance policy

Every non-original template or passage must record:

- source title and URL;
- author or organization;
- license;
- copied/adapted/inspired status;
- attribution text;
- review date and reviewer;
- confirmation that excluded third-party components were removed or replaced.
