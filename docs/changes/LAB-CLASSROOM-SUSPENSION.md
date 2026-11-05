# LAB-CLASSROOM-SUSPENSION

## What changed

Suspension now opens as a classroom lesson under `lab-classroom`. Brian teaches
springs, body shake and body roll before asking the learner to predict. The
board measures the same four spring and road combinations as the suspension
bench. Its free test counts three distinct settings, and Show me selects and
runs a new setting pair each time. The existing bench goal still checks all
four combinations, so the challenge rules and reward path remain unchanged.

The lesson preserves the existing notebook ids `suspension-word-0` through
`suspension-word-3`. The new body-shake term uses `suspension-body-shake`.
`lessonOpenState` still requires driving lesson 1, and the scenario sets
`drivingLessons:{version:1,done:{corner:true}}` in its memory-only profile.

The audit fault is addressed in the classroom challenge wording: it asks for
both springs on both roads, rather than directing the learner to choose “the
other spring.” The challenge submits the original four settings to
`suspensionBench.goalMet`.

## Proposed recorded lines

These replace the current Suspension line text if Claude records the lesson
voice. No audio files or shared voice tables changed in this lane.

- `lab.brian.suspension.intro`: “This rig moves one wheel over a rough road
  while the car body rides above it. Watch the body and the tyre-contact light;
  we will name the measurements next.”
- `lab.brian.suspension.explain`: “A soft spring gives less body shake on
  these bumps, while a stiff spring gives less body roll in this model bend.
  The rig measures each result, so you can compare the trade-off.”
- `lab.brian.suspension.pass`: “You compared both springs on both roads.
  Now you can choose a spring for the road ahead.”

## Checks

- `node --test tools/test-lab-classroom.mjs`: 34 passed, 0 failed. Added checks
  for the complete screen contract, hidden answers while guessing, exact bench
  results, the lesson gate, all four challenge settings, three distinct free
  tests and Show me choosing a different setting each time. Existing
  assertions were not changed.
- `node --test tools/test-lab-classroom-page.mjs`: 6 passed, 0 failed.
- `npm.cmd run build`: passed. PowerShell blocks the `npm` script shim, so the
  equivalent Windows `npm.cmd` entry point ran the requested build. Vite
  reported the existing large-chunk and ineffective dynamic-import warnings.
- Browser scenario: not run here because Chrome is unavailable in this job;
  Claude plays the lesson and checks the screen. The keyboard-only scenario is
  `tools/scenarios/lab-classroom-suspension.mjs` and waits for the real
  four-setting bench goal to return the lesson's completion line.
- Lane tier: not run, as requested; Claude runs it.
- Race fingerprints: none were recorded or changed. This lesson does not
  change race rules or simulation code.

## Removed

- No files removed. The old suspension lesson source remains outside the
  classroom route; removing that legacy path belongs to LAB-CLASSROOM-LIVE.
