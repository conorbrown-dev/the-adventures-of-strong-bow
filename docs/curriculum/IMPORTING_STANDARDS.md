# Importing the vendored Common Core standards

Ticket 1 imports only `data/curriculum/generated/common-core-k5-standards.json`.
It never downloads, scrapes, or regenerates standards data. The manifest hashes and
record count are checked before import.

Run from the repository root:

```bash
npm run curriculum:validate
npm run curriculum:import
npm run curriculum:coverage
npm run test:curriculum
```

`curriculum:download` is retained as a compatibility command and only validates
the vendored source; it performs no network access.

The importer upserts on `officialId`, so rerunning it is idempotent. Only active,
assessable leaf standards are exposed as future quiz targets. Placeholder rows with
`instructionalStatus: notApplicableAtGrade` are retained for hierarchy fidelity but
are never quiz targets.

When standards are publicly displayed, include:

> © Copyright 2010. National Governors Association Center for Best Practices and
> Council of Chief State School Officers. All rights reserved.

Molly's Learning Game is an independent product and is not endorsed by the National
Governors Association Center for Best Practices or the Council of Chief State School
Officers.
