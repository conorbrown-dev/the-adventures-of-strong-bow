# Ticket 1: Curriculum Domain and Official Common Core Import

Implement only the curriculum domain model, persistence contracts, schema
validation, and vendored K–5 Common Core JSON importer.

Use `00_IMPLEMENT_CURRICULUM_SYSTEM.md` as the governing prompt.

Acceptance criteria:

- the vendored JSON and manifest are validated before import;
- only Math and ELA, grades K–5, are imported;
- official IDs and exact statements are preserved;
- supplied hierarchy, leaf status, canonical identifiers, statements, and provenance are retained;
- import is idempotent and deterministic;
- generated data is not manually edited;
- public attribution is documented;
- tests cover filtering, duplicates, malformed input, and idempotency;
- no Phaser dependency exists in the curriculum domain.

- builds and tests do not require internet access;
- the imported record count is exactly 695 unless an explicitly reviewed dataset
  version changes that expectation;
- inactive not-applicable placeholder rows are not treated as quiz targets.
