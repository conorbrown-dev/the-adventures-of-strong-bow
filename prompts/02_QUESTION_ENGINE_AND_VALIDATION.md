# Ticket 2: Deterministic Question Engine and Validation

Implement reviewed question templates, deterministic question instances,
answer evaluation, content validation, and production-bundle validation.

Use the schemas and sample files under `data/curriculum/`.

Acceptance criteria:

- same template version plus seed produces the same instance;
- all standard references are checked;
- duplicate/ambiguous choices are rejected;
- generator bounds are enforced;
- unreviewed templates cannot enter production;
- provenance is mandatory;
- generators are tested across at least 1,000 seeds where practical;
- no runtime AI is used to determine correctness.
