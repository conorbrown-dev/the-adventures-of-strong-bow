# Ticket 5: Phaser Adapters and Parent/Developer Coverage View

Integrate the curriculum application API with the game without moving learning
logic into Phaser scenes.

Implement adapters for the existing game modes that can render supported neutral
question types and submit answers.

Also add a developer/parent-facing progress view that shows:

- mastery by grade, subject, and domain;
- current learning targets;
- review-due skills;
- diagnostic placement by strand;
- uncovered curriculum standards in development mode only.

Acceptance criteria:

- scenes do not own correct-answer or mastery logic;
- all game modes use the same submission API;
- wrong answers receive corrective feedback;
- accessibility settings are honored;
- coverage data comes from the curriculum report rather than hard-coded totals.
