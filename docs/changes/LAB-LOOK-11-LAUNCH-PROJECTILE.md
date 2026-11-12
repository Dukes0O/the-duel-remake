# LAB-LOOK round 11: the wide board on Launch and Projectile (a Sonnet helper)

Branch `worktree-agent-accf055551cfc8882` (on `integration/wasteland` e64793b1f). Sheet and review note:
`docs/board/looks/lab-look/round-11-launch-projectile.jpg` and `round-11-launch-projectile-review.md`.

## What changed

- `src/lab/lessons/launch-board.js`: exports `size` (1320 by 680) and `strip(view)`; the scene is the whole board at 21 units to the
  metre (was 9), the launcher drawn in its old units and scaled about the lip (`inLauncherUnits`, `K`), the deck marked to 50 m, taller hills.
  The tape's reading, how far it is from the flag, the table of launches and "Your launches" are in the strip; Brian's mark is a card in the sky
  (`jobCard`); the three close-ups sit over the middle of the board. Ramp panel and dial at the right (`RAMP`, `DIAL`). Own key caps
  (`cap`, letter 16 units). Check scenes and the recap are drawn as before, centred, with their small labels raised to 15.
- `src/lab/lessons/projectile-board.js`: exports `size` and `strip(view)`; `geometry(view)` gives each step's post, scale and size factor
  (16 units to the metre, 12.5 in the free test; post at 300, centred for the wonder, the free test and the questions); the helicopter, post, buoy, flag,
  bucket, stone and splash grow with the scale. The clock and the two tables of results are in the strip.
- `src/lab/classroom/board-art.js` (shared, the one change outside the two lessons): `outdoors(ctx, width)` and `waterBody(ctx, y, time, width)`
  take a width, 1000 by default, as the wall, floor and background already do. With the default, every number is the one it was, so Fuel, Wax,
  Altitude, Fire, Lift and Pendulums draw as before. (The other helper may touch this file for Fuel and Wax; the change is small and additive.)
- `tools/scenarios/lab-classroom-launch.mjs` and `lab-classroom-projectile.mjs`: `toScreen` fits the 1320-wide board and the two moved points
  (below).

## Wording proof

A scratch script (not kept) played every step of both lessons at many settings: every dial reading and ramp, every launch in the free test (13
ramps by 12 dial readings), every guess and answer, Brian's three marks, Show me, and in Projectile every height and speed, a spread of flags, a
release at every few metres in the job. It drew 9,561 Launch moments and 4,521 Projectile moments with the old board (integration's) and with the new
board plus its strip, and listed every text the old board drew (only counting text whose anchor lies on the board, as the canvas clips the rest)
that the new one did not, at string level and at word level (split at spaces and commas, lower case), and the hover sentences over a grid of points.

- Launch: no word or number missing. Only difference: the table's column words (Angle, Speed, Distance, Against the flag) are now the
  table's first row ("Angle, speed", "Distance" or "Distance, against the flag"), and the speed, angle and distance of a launch are one row ("45°, 72 km/h" and "35.6 m"). The hover
  sentence "This table lists each launch with its angle, speed and distance." was also given over the lower panel in the three word steps that show a
  close-up and no table (27 of 41 maps, an error in the old board); it is now the strip's hint when the table is shown.
- Projectile: no ruler number, label or sentence is missing. The helicopter's speed label ("15 m/s") and the Space cap are not drawn once the helicopter
  is past the board's right edge, a few metres sooner than before (the post is further right); the "m/s down" label of a fast stone next to the water is
  now held on the board instead of drawn below it.

## Tests

- `test-lab-classroom-launch.mjs` 15 of 15 (two added: the strip, and no text under 15 units at any step, 500+ texts scanned).
- `test-lab-classroom-projectile.mjs` 21 of 21 (three added: the strip, no text under 15 units, every fall and the whole ruler on the board).
- Every `tools/test-lab*.mjs` (31 files) passes.

## Changed assertions (old, new, reason)

- `test-lab-classroom-launch.mjs`, mouse test: hover points `[300, 330]` (the tape box) and `[500, 480]` (the table) are replaced by a check that the
  strip's hint gives the tape's sentence and the table's sentence, because both are in the strip now; `[80, 300]` (launcher) becomes
  `[LIP.x - 60, DECK_Y + 40]` = `[162, 588]`, `[400, 272]` (deck) becomes `[LIP.x + 250, DECK_Y + 12]` = `[472, 560]`, and the flag hover
  `(118 + 27 * 9, 240)` becomes `(LIP.x + 27 * PX, DECK_Y - 40)` = `(789, 508)`, because the scene moved and grew.
- Same file, "the flights stay on the board": was three flights against a scene 590 wide and 30 from the top (constants 9, 118, 268); now every ramp at every
  dial reading against the scene's own `WIN`, `LIP`, `PX` (stronger), plus that the furthest landing is 36 to 80 units from the board's edge.
- `test-lab-classroom-projectile.mjs`: the buoy hover `(200 + JOB.buoyM * 12, 596)` becomes `(post + JOB.buoyM * metre, 610)` from `geometry(view)`
  = `(780, 610)`, because the scene moved and grew; "Show me lands on the board" allows `x < size.width` (1320) instead of `x < 1000`.
- `tools/scenarios/lab-classroom-launch.mjs`: the click on Flatter `(690, 160)` becomes `(1010, 156)`. `lab-classroom-projectile.mjs`: the flag drag
  from `(200 + 5 * 12, 590)` to `(200 + 13 * 12, 590)` becomes `(300 + 5 * 16, 590)` to `(300 + 13 * 16, 590)`. Both `toScreen` fit 1320 by 680. Each still checks the same thing.

- `tools/test-repo-hygiene.mjs` (a shared file, for Claude's review): the allow-list for review sheets under `docs/board/looks/` took only
  `round-N.jpg` and `look-N.jpg`; it now also takes a name with words after the number (`round-11-launch-projectile.jpg`, the name the brief
  gives), `(?:round|look)-\d+(?:-[a-z]+(?:-[a-z]+)*)?\.jpg`. It still refuses every other picture in the repository. The other round 11 helper's sheet
  name needs the same line.

## Checks

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 43 of 43. An earlier run had 42 of 43: `test-repo-hygiene`
  refused the sheet's name until its allow-list was widened (above).
- `npm run build` passes.
- All 24 `lab-*` browser scenarios pass (`run-browser-scenarios.mjs --jobs 3`), including `lab-classroom-launch` and `lab-classroom-projectile`
  with their moved points, and every other lesson's.
- `test-review-evidence` 9 of 9 (the sheet has its review note), `test-board` (629 checks), `test-repo-hygiene` pass.
- Every `tools/test-lab*.mjs` (31 files) passes.

## Removed

Nothing is replaced and removed: the old tape box, the lower panel and the old close-up panels of Launch are drawn on the wide board
instead, and Projectile's old corner table and clock are in the strip.
