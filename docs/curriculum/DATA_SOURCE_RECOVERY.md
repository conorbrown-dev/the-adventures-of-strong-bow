# Common Core Machine-Readable Source Recovery

## Status

On July 24, 2026, both previously referenced official machine-readable URLs
returned HTTP 404:

- `https://thecorestandards.org/wp-content/uploads/ccssi.zip`
- `https://www.thecorestandards.org/assets/E0607_ccss_identifiers.csv`

The official Common Core landing page states that the site is experiencing
technical challenges. The official ELA and Mathematics PDFs remain available.

## Repository strategy

The project no longer downloads machine-readable standards during a build.

Instead, it vendors:

- `resources/raw/ccss-recovery-source-philngo-rev-02895145.csv`
- `data/curriculum/generated/common-core-k5-standards.json`
- `data/curriculum/generated/common-core-k5-standards.csv`
- `data/curriculum/generated/common-core-k5-manifest.json`

The raw recovery snapshot is pinned to a specific GitHub Gist revision, and the
normalized outputs include SHA-256 hashes and provenance.

## Source confidence

The recovery CSV is not an official NGA/CCSSO machine-readable publication. It is a
public compilation of the Common Core standards. The standards text itself remains
subject to the Common Core Public License and required attribution.

The build performs:

- required-header validation;
- K-5 filtering;
- identifier normalization;
- duplicate detection;
- fixed expected record count validation;
- representative statement checks against official PDF content;
- SHA-256 manifest generation.

This is sufficient to unblock engineering. Before describing the dataset as fully
audited, perform a complete row-by-row comparison against the official PDFs or
replace it with a restored official machine-readable release.

## Current dataset totals

- Total K-5 rows: 695
- ELA rows: 504
- Mathematics rows: 191
- Leaf rows: 619
- Rows classified as directly assessable: 601
- Not-applicable placeholder rows: 18

## Rebuild

```bash
python scripts/build-vendored-common-core.py
```

The rebuild script performs no network access.
