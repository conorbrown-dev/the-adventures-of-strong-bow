# Diagnostic simulation results

The automated harness in `diagnostic-assessment.spec.ts` runs deterministic hypothetical learners through a compact three-grade ELA blueprint. The fixture uses one representative standard in each of four domains so the state-machine behavior is easy to audit. Production blueprints use up to two standards per domain, so a consistently strong production ELA run requests 48 responses rather than the fixture's 24.

| Learner | Simulated knowledge | Evidence requested | Final starting level | Gaps | Confidence |
| --- | --- | ---: | --- | --- | --- |
| A | Consistently strong across K–2 | 24; two per skill in every grade/domain | Grade 2 | None | High |
| B | Strong language/comprehension, weak foundational reading | 8; complete Kindergarten breadth, two per skill | Kindergarten | `K.RF.1` critical prerequisite | High |
| C | Kindergarten mastery; Grade 1 foundational-reading gap | 16; complete K and Grade 1 breadth | Grade 1 | `1.RF.1` critical prerequisite | High |
| D | Grade 2 capable learner beginning at Kindergarten | 24; efficient floor-to-ceiling verification | Grade 2 | None | High |
| E | Alternating/random-like guesses | 16; four per skill because every two-answer pattern is uncertain | Kindergarten | All skills developing; foundational reading critical | High that reinforcement is needed |

The harness also separately verifies that one correct response in every domain remains insufficient, a mixed response pattern receives two additional probes, and a duplicate question-instance ID contributes only once.

These are deterministic policy simulations, not norming studies. “High” means the configured coverage and evidence rules reached a decisive result; it does not claim population-level psychometric confidence.
