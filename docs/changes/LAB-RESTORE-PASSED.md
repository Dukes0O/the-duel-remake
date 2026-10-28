---
task: LAB-RESTORE-PASSED
status: done
flag: lab-2
player_facing: yes
---

# LAB-RESTORE-PASSED: a passed lesson's bench action without replaying the lesson

Found in the FINISH-DEEP update (28 October 2026). In the walking Lab, the Rust machine always opened the five-step lesson, and
the Restore button sat only on the old bench panel that appears after the lesson's challenge. A player who had already passed
Rust had to sit through the lesson again to restore the Sirena. Claude decided: a passed lesson never has to be taken twice to
use what it opened, and the lesson stays open to replay.

## What changed

- `src/lab/lab-view.js`: when the player uses a machine whose lesson is passed and the bench holds something to use, the bench
  panel opens at once instead of the lesson. "Something to use" is the Rust bench's Restore offer (or its free replay), and the
  wind tunnel's secret REVERSE button once that secret is open (it too sat only on the old bench panel). A lesson with nothing
  to use still opens as the lesson. The new `replay` button opens the lesson on demand.
- `src/lab/lab-markup.js`: `benchMarkup` has a `replay` form for that panel: name, "Passed" mark, a short line, "Replay the
  lesson", then the Restore offer. No dials or Run button. The ordinary bench markup is unchanged.
- `tools/scenarios/lab-restore.mjs`: now walks the real keys to the Rust machine and presses E (as the workshop lesson recipe
  does) instead of clicking a hidden board button. It checks that no lesson shows before Restore, restores, watches the free
  replay, then presses "Replay the lesson" and sees the lesson open. The rest of the recipe (both payments, both finishes,
  racing the wreck) is unchanged and passed.
- `tools/test-lab-restore.mjs`: one new test for the passed-bench markup.

No save shape change, no rule change (`restore.js`, `lab-model.js` and the save code are untouched), no sound or art. Other
benches checked: the Launch angles, Strength, G-force, Wax and flying lessons keep their challenge button inside the lesson
frame, and the tuning lessons' actions live on the Tune and Shop pages, so none of those sits behind a passed lesson.

## Checks

Browser recipe `lab-restore` passed on a private port with memory-only saves, no errors or warnings. The wind tunnel REVERSE
path is covered by the markup and existing fan tests, and `lab-fan-view` was not changed. Changed assertions: none. Gates are
recorded below.

## Removed

Nothing replaced; the old "click the hidden board button" step in `lab-restore.mjs` is gone.
