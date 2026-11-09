# DIG-YARD-TOY

From the audit of 9 November 2026 (`docs/board/audit-2026-11-09.md`, item W3). Kyle said yes
to this card on 9 November.

The Dig (an excavator, a truck and a trencher to operate beside the Scrapdome) is built and
is the one new Wasteland piece that has been played in a browser. Players cannot reach it,
because its yard button shows only with the whole town (`wasteland-town`, off). Gratian loves
the Wasteland; this gives him something new there this week.

## Settled design (Claude)

- **Its own switch:** `the-dig` in `src/feature-flags.js`. In `src/screen-yard-home.js` the
  THE DIG button shows on `the-dig` alone; THE TOWN stays behind `wasteland-town`.
- **A toy, not a job:** no pay, no goal, nothing saved. If the Dig writes anything to a
  player's save today, stop and name it in the change note before switching on (a save review
  then applies).
- **One line in the yard's "Things to try"** (`src/yard-things-to-try.js`) that says the
  machines are there and which keys start them.
- **Before it is switched on:** the machine models no longer show the atlas's empty white
  cells in the game; every machine sound cue plays (`src/sound-bank.js`); Escape returns to
  the yard; the opening view shows the controls.
- While in `src/feature-flags.js`: `wasteland-town` and `nissan-skyline` are each listed
  twice. Keep the value the game uses now (the later one) and remove the other line.
- **Sound:** no new game event; the cues already exist.

## Who does what

Codex builds and runs the checks. Claude then plays the Dig from the yard and back in a
visible browser with sound, and decides the release (rule 18).

## Checks

- `node tools/test-the-dig.mjs`.
- New test: with `the-dig` on and `wasteland-town` off, the yard shows THE DIG and not THE
  TOWN; with both off, neither.
- Laptop only: `tools/scenarios/the-dig.mjs` with memory-only storage; Claude's play pass;
  one frame check on Performance in the Dig yard (rule 8), since a player can now reach it.

## Removed

The duplicate switch lines. Nothing else: the town keeps its own button and switch.
