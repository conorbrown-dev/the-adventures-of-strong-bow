# Ticket 3: Diagnostic, Mastery, Review, and Question Selection

Implement attempt recording, per-standard mastery, spaced review, strand-aware
diagnostics, and next-question selection.

Acceptance criteria:

- all policies are deterministic under injected clock and random seed;
- mastery follows the configured evidence rules;
- repeated identical instances do not inflate evidence;
- diagnostics produce a per-strand profile rather than one grade;
- overdue reviews outrank new content;
- failed review returns a skill to practice without deleting history;
- speed is not required for mastery;
- policy transitions have focused tests.
