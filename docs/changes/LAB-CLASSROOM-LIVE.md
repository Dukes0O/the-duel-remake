# LAB-CLASSROOM-LIVE

Claude, 31 October 2026. Kyle: "we really don't use the preview anymore. you can upgrade the
lessons in the live game." The switch `lab-classroom` goes on, so the pendulum opens as the
classroom lesson in the live game, and the old pendulum lesson goes.

## What changed

- `src/feature-flags.js`: `lab-classroom` on (main session's commit, reviewed there).
- The Lab notebook keeps the classroom words: a classroom lesson lists its notebook words
  (`WORDS` in `pendulum-classroom.js`, under the ids the old lesson saved), and
  `src/lab/lesson-ui.js` shows them beside the old lessons' words. A classroom word has no 3D
  picture, so its meaning shows on its own.
- `src/lab/classroom/classroom-ui.js`: a lesson button reached with Tab now presses on Enter or
  Space; before, the lesson took Enter as Continue and the focused button (Leave, for one) never
  pressed. A button clicked with the mouse does not hold the keys. Found by `lab-navigation`.
- Lab scenarios now drive the classroom where they reached the old pendulum:
  `lab-navigation` and `lab-polish` recognise the classroom screen and leave it with its own
  Leave button; `lab-polish` checks a classroom lesson opens at its first step with its seven-part
  strip and no old panel beside it. `lab-lessons-flying` plays projectile, fire and altitude; the
  pendulum is played end to end by `lab-classroom`.

## Removed

- `src/lab/lessons/pendulum-lesson.js` and `pendulum-animation.js` (the old five-step pendulum).
- Their parts of `tools/test-lab-lessons-flying.mjs`: the old pendulum drawing's string lengths
  and label checks, its try script, and "each pendulum answer uses the period from the existing
  bench", which tested the removed lesson's evaluator. The classroom lesson's own suite checks the
  same rule (every swing time from `stringPeriod`, weight makes no difference).
- The pendulum's turn in `tools/scenarios/lab-lessons-flying.mjs`.

## Checks moved, not dropped

The two checks the Flying scenario made on the pendulum now run in `tools/scenarios/lab-classroom.mjs`:
teaching never passes the lesson by itself and the notebook keeps all three words; and in the
helicopter challenge the key idea card covers no button. The model-scale line ("one tenth the size")
is still shown exactly once: projectile, fire and altitude share it.

## Changed assertions (Claude's review, rule 18)

- `tools/test-feature-flags.mjs` and `tools/test-lab-classroom.mjs`: `lab-classroom` moves from the
  must-stay-dev list to the must-be-on list. This records the release; nothing is loosened.
- `tools/test-lab-lessons-flying.mjs`: "all four packets" becomes "all three packets"; the removed
  pendulum lines are listed under Removed. The other lessons' assertions are unchanged.

## Checks

- Lane tier (`--changed --jobs 4`): 45 passed, 0 failed.
- All 22 `tools/test-lab-*.mjs`: pass.
- All 14 Lab scenarios pass: 11 in the first batch; `lab-navigation` failed on the Enter fault
  above and passed after the fix; `lab-lessons-snow` timed out while a build ran beside it and
  passed alone (rule 3); `lab-classroom` reran after the key fix and passes (24 pictures).
- `npm run build`: passes.
- Rule 19: since the full tier on 86c48d4f only Lab code and its tests changed (no shared core,
  save shape or physics), so no full tier.
