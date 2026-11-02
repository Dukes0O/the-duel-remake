# WATER-FINISH: The Water Road switched on

Claude (Director), 1 November 2026. Card `docs/board/cards/WATER-FINISH.md`, the last
of The Water Road (`docs/story/wasteland-water-road.md`). No Preview step (Kyle,
31 October 2026).

## What changed

- `src/feature-flags.js`: `water-road` is `on`.
- `tools/test-feature-flags.mjs`: `water-road` moves from the dev list to the released
  list (the count is unchanged). `tools/test-water-hooks.mjs`: the switch reads `on`.
- `start-preview.bat`: `water-road` leaves the Preview's dev list (it is on everywhere).

## The play-through

`node tools/browser-harness.mjs scenario water-road` on a fresh memory-only career, as a
young driver on Easy with automatic gears: the Story button's red dot and Hollis's note;
"Race on Sal's road" filling the setup; START; Hollis on the radio at GO; the race
driven by the game's own autopilot against the Easy rival (won on the second try, so a
lost try leaves the job open and a win saves it); the results tick; the yard's Next up
naming chapter 1 and its button; the Story Wall at chapters 1, 2, 5 and 8 with one
button each (the career moved on by hand between them); the Story Wall's fight button
starting the Dustmonger's fight; and, as a finished player, Hollis's end lines on the
yard visit, every chapter ticked and the water works full. Results: see Checks.

What this play-through does not do: drive every warlord fight and Scrapdome job to a
win in the browser. Those are the live game's own fights and modes, unchanged; their
Easy win rates are measured in `docs/changes/WATER-EASY.md` (a player no better than
an Easy computer car rarely wins them; EASY-YOUNG-DRIVER follows). A chapter's job is
optional: a chapter is done when its warlord is beaten.

## Checks

- Lane tier (PowerShell): 43 passed, 0 failed, 0 not run. `npm run build` passes.
- `scenario water-road` with the switch on: all 13 facts pass; Sal's road lost on
  the first try and won on the second (the job saved, the tick shown).
- Kyle got a six-picture sheet of the play-through with the release note.
- Full tier for the release and the yard frame check: see VERIFICATION.

## Changed assertions

- `tools/test-feature-flags.mjs` and `tools/test-water-hooks.mjs`: `water-road` reads
  `on` instead of `dev`. A release of a finished switch, nothing loosened. Claude's
  review: approved.

## Removed

`water-road` from the Preview's dev switch list.
