# QA-STANDING-BROWSER

Kyle's decision of 16 November 2026 ("a nightly check that tells news", `docs/board/decisions.md`), after the audit.
Claude's card; a Sonnet helper on the laptop does the work, because these need a real browser, which Codex's lane
jobs cannot start.

## The seven

These failed in each of the last three nightly ledgers (`docs/board/checks/night-2026-11-05.json`, `-11-09`, `-11-12`):
the frame stage of the full check, and the browser scenarios `arena-shove`, `deep-frames`, `drive-lesson-run`,
`frame-pacing`, `p4-audio` and `ski-finish`. `arsenal-wave1-audio` failed in two of the three and is looked at too.

## Three of them already have cards

Found the same day: three of the seven were given cards after the full check of 5 November, and nobody built them,
because each is a browser scenario and Codex's lane jobs cannot start a browser. They are Claude's now, done by the same
helper under this card, each closed in its own file:

- `arena-shove`: QA-ARENA-SHOVE-BASELINE (the cause is known and Codex's ruling is written there; Claude reviews it first).
- `drive-lesson-run`: QA-DRIVE-LESSON-RUN-BOARD (the check expects an older lesson board).
- `ski-finish`: QA-SKI-FINISH-TIMEOUT (times out after the slalom).
- `arsenal-wave1-audio` (two nights of three): QA-WAVE1-AUDIO-FLIGHT, Claude's already.

Without a card until now: the frame stage, `deep-frames`, `frame-pacing` and `p4-audio`. The standing list of
QA-NIGHTLY-NEWS names each item's own card where it has one.

## What to do

For each, thirty minutes at most (rule 4):

1. Read its failure message in the three ledgers. Run it once, alone, in a visible window, with nothing else heavy
   running (`node tools/run-browser-scenarios.mjs --scenarios <name> --jobs 1 --headed`).
2. Say which of these it is, with the evidence:
   - **the game is wrong:** cure it if the cure is small and inside one file area, otherwise write a card;
   - **the check is out of date** after a ruling: correct the check to the ruling and write the old and new assertion
     under "Changed assertions, for Claude to review";
   - **it cannot pass at night** (a frame timing that needs the laptop alone on one screen, rule 8): say so. Claude then
     rules whether it leaves the nightly run and stays a release-day check;
   - **it passes alone:** it is unreliable beside other work (rule 3); say what it shares.
3. Never change a tolerance or an assertion to make one pass.

## What done looks like

A table in the change note: item, which of the four, the evidence in one line, what was done. Each item that still
fails has its cause written into `docs/board/checks/standing-failures.json`, in the words of the failure itself with every
number written as `#` (the nightly check compares them that way). `p4-audio` and `ski-finish` are listed with "not yet
known", so the first night reports each as failing in a new way until its real message is written in.

## Checks

Each scenario run alone after its cure; the lane tier only for game files that changed.

## Done on 16 November 2026 (a Sonnet helper, two rounds; Claude reran two of them beside other work)

None of the five faults was in the game.

| Item | What it was | What was done |
| --- | --- | --- |
| `arena-shove` | the check read a value that is missing once the old baseline is retired | a guard; passes (202 pictures). Card QA-ARENA-SHOVE-BASELINE closed |
| `drive-lesson-run` | the check expected a click on the corner that is already selected to change the course | that corner must stay checked, every other must move the course. Card QA-DRIVE-LESSON-RUN-BOARD closed |
| `ski-finish` | each helicopter leg ran 44 to 47 s inside one browser call (60 s limit): a step reads the ground at 85 points and a flight is up to 108,000 steps | each leg is flown in pieces of 6,000 steps; passes beside other work. Card QA-SKI-FINISH-TIMEOUT closed |
| `p4-audio` | not updated since earned cars were released on 3 November (the medal and the earned car differ from the unpaid replay) | both fields allowed; a failure now names the fields. Its 128-frame gap did not recur alone and stays on the standing list (QA-P4-AUDIO-FRAME-GAP) |
| `arsenal-wave1-audio` | passes alone; plays real-time sound and fails when the laptop is busy (rule 3) | nothing changed (QA-WAVE1-AUDIO-FLIGHT) |
| `frame-pacing` | read the frame stage's result from the wrong file path | the path, and the fixture in `tools/test-full-check.mjs`, corrected |

## Left on this card

- **`deep-frames`** throws unless it has a visible window, and the nightly browser step has none and runs four browsers at
  once. Claude's ruling: it leaves that step and runs in the frame stage. That needs the frame stage's own list of three
  names (`tools/full-check.mjs`, three places) and a check of the deep-frames result, so it is a small job of its own.
- **The frame stage** read High 34.3 and 35.1 ms and Performance 18.2 and 35.3 ms on two nights. Readings near 33 to 35 ms
  are two refreshes of the screen: the known sign that the laptop was not set to one screen (rule 8), not a slow game.
  To rule: whether the stage should say "not valid: more than one screen" and not count as a failure on such a night.
- The nightly check leaves a failure that names a timeout off the standing list on purpose (a timeout usually means a busy
  laptop); `tools/test-full-check.mjs` pins that. Unchanged.

## Claude answers

Changed assertions reviewed 16 November 2026, nothing loosened: `drive-lesson-run` (the already selected corner must stay
checked; every other choice still must move the course), `p4-audio` (two result fields join the ones the unpaid replay
cannot write; every other field still must match), `ski-finish` (the thin-air radio line is read right after the piece of
flight that said it), `test-full-check` (the fixture's file path, to match where the frame stage writes).
