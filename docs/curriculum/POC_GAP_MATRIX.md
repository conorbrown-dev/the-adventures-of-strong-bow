# Common Core POC gap matrix

> Historical snapshot from 2026-07-27. The diagnostic and session-persistence rows were superseded on 2026-08-25 by [DIAGNOSTIC_GAP_ANALYSIS.md](./DIAGNOSTIC_GAP_ANALYSIS.md) and [DIAGNOSTIC_DESIGN.md](./DIAGNOSTIC_DESIGN.md).

| Requirement | Current status | Evidence | Missing behavior | Files responsible | Planned correction |
| --- | --- | --- | --- | --- | --- |
| Approved production catalog | partial | Facade filters reviewed, Conor Brown, hash-present K rows | Hash is not recalculated on every selection | `learning-facade.service.ts` | Validate catalog before session creation |
| Practice integration | partial | React calls server start/submit/next APIs | No selector policy or due-review priority | facade, selector | Route session selection through selection policy |
| Diagnostic integration | partial | Four-question diagnostic session persists placement | No tie-breaker / early-stop orchestration | facade, diagnostic placement | Add diagnostic state machine |
| Immutable attempts | partial | Prisma repository + duplicate guard | No database-level unique instance/session constraint | Prisma schema/repository | Add idempotent repository guard |
| Mastery recalculation | pass at domain level | `ProgressService` tests | Not exercised by browser acceptance test | progress/facade tests | Add facade acceptance scenarios |
| Progress queries | partial | Attempts/mastery/latest placement returned | Due review status/date not rendered | facade/UI | Add due-review query and UI state |
| Spaced review | pass at domain level | injected-clock progress tests | Practice session does not prioritize due reviews | selector/facade | Use planner in facade |
| Active-session restoration | partial | Session ID stored and GET endpoint restores process-memory session | Server restart loses sessions | session repository | Persist session state or show recovery path |
| TTS test abstraction | fail | Existing TTS reaches `/api/tts` | No fake adapter; browser tests can time out | `speech.ts`, e2e | Inject fake adapter and block network |
| Browser acceptance coverage | fail | Existing smoke test is unstable | No ten-question practice/diagnostic/mastery acceptance tests | e2e | Add production-like API-backed tests |
| Game separation | passWithLimitations | No game source changed; curriculum has no Phaser imports | Existing game route smoke not rerun | e2e | Add route smoke coverage |
