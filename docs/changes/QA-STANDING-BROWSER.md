# QA-STANDING-BROWSER

Each scenario was run once alone in a visible window on 16 November 2026, then again after its cure. None of the five faults was in the game.

| Item | Kind | Evidence | Done |
| --- | --- | --- | --- |
| `arena-shove` | check wrong | Failed at once with "reading 'commit'": the report line read `provenance.commit` when the baseline is retired and no provenance exists. | Added `?.`. Passed twice alone (202 pictures). |
| `drive-lesson-run` | check out of date | The board opens with its first corner already selected, and a selected radio sends no change, so "every choice moves the course" could not hold for it. | That choice must stay checked, every other must move the course. Passed twice alone. |
| `ski-finish` | check wrong | The page was not stuck. The group visit flew three legs in one browser call (limit 60 s); alone the legs took about 100 s together (one 44 s, one 47 s). | Three calls, one per leg. Passed twice alone. |
| `p4-audio` | check out of date, plus load | Alone it failed after the race: medal and earnedCars differ, because earned cars were released on 3 November. The 128-frame gap of the last two nights did not recur alone. | Both fields join the pay fields the unpaid replay cannot write; a failure now names the fields. Passed twice alone. The gap stays listed. |
| `arsenal-wave1-audio` | passes alone | Passed with nothing else heavy running. It plays real-time sound, so it fails when the laptop is busy (rule 3). | Nothing changed. |
| `frames`, `deep-frames`, `frame-pacing` | not run | Claude rules. `deep-frames` needs `--headed` and the nightly browser step has none; `frame-pacing` compares against the wrong file path; `frames` read 34 to 35 ms at High. | Entries kept. |

## Changed assertions, for Claude to review

- `drive-lesson-run`: old, `driveLessonCourse === courseId` after each click. New, the same for every choice not already selected; the already selected one must stay checked. Ruling: `driveLessonBoardModel` selects `courses[0]` when none is chosen.
- `p4-audio`: `medal` and `earnedCars` added to `PAY_FIELDS` (the replay may differ there). Ruling: earned cars released 3 November 2026 (`src/feature-flags.js`). Every other result field still must match.

## Checks

Browser scenarios each run alone twice on the cured files (except `arsenal-wave1-audio`, once). Lane tier (`--changed --jobs 4`, 16 November, on the last commit of this branch before the notes): 23 passed, 0 failed. `tools/test-board.mjs` and `tools/test-repo-hygiene.mjs` passed. Left to the night: `test-arena-shove`, `test-first-person-polish`. No game file changed, no race fingerprint moved.

## Removed

Standing entries `arena-shove`, `drive-lesson-run`, `ski-finish`. The unproven one-call group flight in `ski-finish`.
