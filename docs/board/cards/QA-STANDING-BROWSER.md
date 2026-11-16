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
fails has its cause written into `docs/board/checks/standing-failures.json` once card QA-NIGHTLY-NEWS has made that
file; until then the table is the record.

## Checks

Each scenario run alone after its cure; the lane tier only for game files that changed.

## Claude answers

(none yet)
