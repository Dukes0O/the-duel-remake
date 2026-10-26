# LAB-LESSON-FRAME

The short board entry controls current state, ownership, dependencies and locks.

Codex. Design: `docs/LAB.md` sections 12.2 and 12.3. Switch `lab-2` (dev).

Build the frame every lesson will use, driven by a lesson's data (its words,
steps, predictions and checks), so later lessons are data plus their own
animations: the five steps with pause, step and replay; the Lab notebook
(words learned, saved through `lab-save.js` with an old-save default) and
underlined words that show their meaning anywhere; force arrows in the four
colours, to scale, with numbers; particle streams; prediction cards with
pictures; the guided, prompted, alone sequence of tries; the hint ladder and
"Show me"; the key-idea card during the challenge.

Checks: a test that a lesson cannot use a word it has not shown; a test of
the hint ladder (what happened, plainer hint, Show me); the notebook saved
and old saves loading. This adds a save field: the independent save review.
Lane tier and build.

## Codex implementation decision

The design is settled in `docs/changes/LAB-LESSON-FRAME.md` before code.
The packet contract is in `docs/lab-lesson-authoring.md`. Future lesson
packets load automatically from `src/lab/lessons/*-lesson.js`; no screen
changes are needed. Existing unconverted lessons remain until their own
content cards replace them. The browser example stays in test fixtures.
