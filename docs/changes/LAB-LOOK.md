# LAB-LOOK and LAB-UX-FIXES

Claude, 11 November 2026, with Sonnet helpers and Codex's image tool. Both cards stay open (the plan is on
`docs/board/cards/LAB-LOOK.md`).

## What changed

- Round 1 (Claude): `src/lab/classroom/board-art.js` and `src/lab/lessons/lift-board.js`, described in
  `docs/board/looks/lab-look/round-1-review.md`.
- Brian's portraits (a Sonnet helper): `public/assets/lab/brian-{talk,cheer,hint,explain}.jpg` with credits;
  `src/lab/classroom/brian-faces.js` (new) maps the classroom's four moods to them and preloads them;
  `classroom-ui.js` and `classroom.css` show the portrait at 132 x 132 with a 150 ms fade.
- Routine fixes (the same helper): titles and names are no longer broken into word buttons (`src/lab/word-links.js`,
  new, with `data-name` marks on the door board, shop, rust parts, machine choice and Ask Brian); G-force's last
  button reads "Start the lap"; `docs/LAB.md` gives the Projectile challenge's 10 m and the Fire challenge's 7
  minutes and names the recipes that build the Lab's models; two narrow-window style rules are removed; one gold and
  one off-white replace two near-identical pairs.

- Round 3 (a Sonnet helper): `braking-board.js`, `downforce-board.js` and `fuel-board.js` redrawn; `board-art.js`
  gains `roadCar`, `tarmac`, `paintStripe`, `roadPost`, `forceArrowTo`, `steel`, `bolt` and `lcd`. Their three lesson
  tests and browser checks pass unchanged; lane tier 35 of 35.

## Checks

- All 32 `tools/test-lab-*.mjs` files pass, with two new ones (`test-lab-brian-faces`, `test-lab-title-words`) and one
  added assertion (G-force's label). No assertion was loosened or removed.
- All 24 `lab-*` browser scenarios pass, including the new `lab-brian-faces`.
- Lane tier 120 of 120 and `npm run build`.
- Look (Claude): the two sheets under `docs/board/looks/lab-look/`.

## Round 10 (a Sonnet helper): the wide Braking board finished, from Claude's round 9 verdict

- `braking-board.js`: the close-up car and its pads are 1.3 times their size (`CLOSE.scale` 4.16), centred over the road
  (`CLOSE.nose` 850, floor line 312), with the weight arrows ending at the roof and the two force arrows and their
  labels re-placed between the car's parts so that nothing overlaps; text sizes unchanged. A car on its own or two
  cars sit lower (`laneY`: 490 and 470/580) so that the road has no large empty floor under it.
- `braking-classroom.js`: the free test's view keeps the close-up (`close`) where it used to set it to null, so the
  close-up car stands where the results table was. The table stays in the strip.
- Wording: the strip's hover says "80 m long" again, "past the end" is back for a stop beyond 80 m, the 10 m marks and
  second marks stop at 80 m again (`STRIP.metres` 80; the road carries on to the longest stop, about 105 m). The close-up's
  hover names the car chosen (the same words for the Falcone F42, which is the only car the other steps show).
- Proof that no word differs from integration (131947147): a scratch script played every step of the lesson, braked at
  every speed and car, drew 37,433 moments with both boards and compared every word either wrote (including the strip's
  and the hover text). Only these differ: the table's column words (YOUR TESTS, Speed, Deceleration, Sum, Tape) are now
  the strip's row words ("Your tests", "deceleration", "sum", "tape", and the speed written beside the car), as round 8
  and 9 moved the table to the strip; and the close-up's hover names the other test cars in the free test. The
  scratch script is not kept.

### Round 10 checks

- `test-lab-classroom-braking.mjs` 27 of 27 (one test added). Every `tools/test-lab*.mjs` passes.
- Lane tier 44 of 45; the one failure, `test-review-evidence`, wanted a review note for `round-9.jpg` (round 9 left none).
  `round-9-review.md` and `round-10-review.md` were added, and the test passes (see the line below).
- `npm run build` passes.
- All 24 `lab-*` browser scenarios pass (`run-browser-scenarios.mjs`, `--jobs 3`).
- Sheet: `docs/board/looks/lab-look/round-10.jpg`.

### Round 10 changed assertions (old, new, reason)

- `test-lab-classroom-braking.mjs`, mouse test: hover points for the pads and the close-up car `[430, 290]`, `[430, 180]` become
  `[655, 300]`, `[655, 200]` (round 9 had moved them from `[300, 290]`, `[300, 180]`), because the close-up car moved to the
  centre of the board and grew.
- Same file, round-numbers test: hover points `[300, 200]` (integration), `[430, 200]` (round 9) become `[655, 200]`, for the same reason.
- Added: one test that the strip hover says "80 m long", that "past the end" is drawn for a stop beyond 80 m, that the marks stop
  at 80 m, and that the free test has the close-up car on its pads.

### Round 10 removed

Nothing.


## Round 11: Fuel and Wax (a Sonnet helper): the wide board on Fuel and Ski wax, and Braking's small labels

Sheet and note: `docs/board/looks/lab-look/round-11.jpg` and `round-11-review.md`.

- `fuel-board.js`: names its size (1320 by 680, `size`) and hands the stopwatches, the speed beside each car, the free test's table
  and Brian's job's litres sentence to the page through `strip(view)`. The scene is placed on the wide board with `place`
  (a layout drawn for the usual 1000 by 680 board, scaled about a point): the tank, scale, nozzle, tap, can and the free test's car
  box stand beside the road (1.15 times, 1.05 on the free test), in the middle on their own on the Fuel load step (1.25 times,
  with a drawn pump and two spare cans), or left of the card on the weighing step; the litre step, the jugs, the questions' jugs and the Tune
  page's card are 1.25 to 1.5 times; the recap cards are 380 wide. The road (`roadOf`) is 750 wide beside the tank and 1240 on its own,
  with the cars 1.2 to 2 times their old size; the start line is as tall as the car so that it does not cross the car's name or sum;
  the photo finish, the speed graph and Brian's job's card and track are drawn to the new width. Every text is 15 or more
  (`keyCap` is a local copy at 15; the shared one writes its key at 13). New export `lanePoint(view, i)` for the tests.
- `wax-board.js`: names its size and hands the stopwatches and the free test's table to the strip. A single strip is 1180 wide at
  1.6 times, three strips are 780 wide at 1.1 times, the free test's strip is 800 wide; the free test's close-up is 720 by 240 under the
  strip; the friction sum's slope is 900 long and its bars 480 a unit; the tins are 1.25 times (`tinAt`); the thermometer and lens
  of the magnifier steps are larger; the ski menu's card is 700 wide; the recap cards are 380 wide. Every text is 15 or more.
- `braking-board.js`: every text under 15 is 15 (distance marks and "brakes on", the dial and lever headings, "set by Brian", the
  close-up's "mass carries on", "tyres slow the car", "BRAKING", the balance sentence, the energy step's labels and block numbers, the
  questions' "back", "front", "toward the front", "THE TUNE PAGE"); `keyCap` is a local copy at 15. "tyres slow" and "the car" are
  re-spaced (7 and 25 units under the floor line).
- `classroom.css` (shared, two lines): a strip table's row may wrap its value under its label (`flex-wrap`, the value pushed right
  with `margin-left: auto`), because Fuel's and Ski wax's rows are longer than Braking's and were cut off at the end when the physics
  panel is open. Where the row fits it looks as before, so Braking's table does not change.
- Tests: one test in each of the three lessons' test files that plays every step, draws it as it opens and while it plays, and
  fails if any text is smaller than 15 board units (the surface counts every scale in force); Fuel's and Ski wax's also assert the
  1320 by 680 size. Scenarios: the click on the tap and the click on the medium tin are at the wide board's places and use the
  1320 wide fit.
- Proof that no word differs from integration (da2545fff): a scratch script (not kept) played every step of each lesson, at 7 fuel
  loads on four cars, at every snow with every wax and no wax, through every race and every wrong answer, at every Braking speed
  and car, drawing 8,409 moments for Fuel, 6,336 for Ski wax and 9,477 for Braking with the old board and with the new board and
  its strip, and compared every word either wrote (the hover text is unchanged and was compared by the tests). Braking: no
  difference. Fuel and Ski wax: the only differences are the table's heading words, now written in each row of the strip's table (Fuel:
  Car, Petrol, Total mass, Acceleration, Time; Ski wax: Snow, Wax, Friction, Acceleration, Time, Against no wax), and the recap's lines breaking in
  other places because the cards are wider. The stopwatches' words ("3.27 s", "first", "100 km/h") are the same words, now in
  the strip's readings.

### Round 11 checks

- `test-lab-classroom-braking.mjs` 28 of 28, `-fuel.mjs` 24 of 24, `-wax.mjs` 24 of 24 (one test added to each). All 33
  `tools/test-lab*.mjs` pass.
- Lane tier (`run-tests.mjs --tier lane --changed --jobs 4 --keep-going`, 41 files): 40 pass; `test-repo-hygiene` failed once because the new sheet's
  name (`round-11.jpg`) is not one of the allowed sheet names, so its pattern now allows words after the round number (`tools/test-repo-hygiene.mjs`,
  one regular expression); it passes alone after that, with `test-review-evidence` (9 of 9) and `test-board` (629 checks).
- `npm run build` passes.
- All 24 `lab-*` browser scenarios passed (`run-browser-scenarios.mjs --jobs 3`) on the first commit of this round. After that only
  the three boards' geometry, `classroom.css` and the wax free test's snow name changed, so the Fuel, Ski wax and Braking scenarios were run again on the
  final code: 3 of 3 passed.
- Sheet: `docs/board/looks/lab-look/round-11.jpg` (1932 by 2332, 499 KB), eight pictures from the browser harness at 1536 by 864; note beside it.

### Round 11 changed assertions (old, new, reason)

- `test-lab-classroom-fuel.mjs`, mouse test: hover points `[180, 300]`, `[180, 500]`, `[358, 520]` (the tank, the scale, the can)
  become `[208, 311]`, `[208, 541]`, `[413, 564]`; the car buttons' clicks `(344, 640)` and `(116, 640)` become `(370, 647)` and
  `(130, 647)`; the car panel's hover `(230, 600)` becomes `(250, 605)`. The cluster beside the road is 1.15 times larger (1.05 on
  the free test) and starts at (36, 30) (40, 34).
- Same file, review-fixes test: the click on the water jug `(300, 460)` becomes `(375, 379)` and the empty space above it `(300, 260)`
  becomes `(375, 79)`; the jugs are 1.5 times larger and centred. The race card's `(700, 160)` is unchanged.
- Same file, round-numbers test: the hover on each lane at `(700, 160 + 100 i)` becomes `lanePoint(view, i)`, the middle of lane i, because
  the lanes moved and a fixed point missed the single lane of the free test.
- `test-lab-classroom-wax.mjs`: the snow tab's click and hover `(780, 30)` becomes `(1080, 30)`; the medium tin's hover `(500, 600)`
  becomes `(660, 600)`; the three tins' hovers `(330, 600)`, `(500, 600)`, `(670, 600)` become `(430, 596)`, `(660, 596)`, `(890, 596)`.
  The tabs and the tins moved to the right with the wider board.
- `tools/scenarios/lab-classroom-fuel.mjs` and `-wax.mjs`: the fit is 1320 wide instead of 1000; the click on the tap `(300, 418)` becomes
  `(347, 446)` and the click on the medium tin `(500, 600)` becomes `(660, 596)`.
- `tools/test-repo-hygiene.mjs`: the allowed sheet names `round-N.jpg` also allow words after the number (`round-11.jpg`).
- Nothing is loosened; each still checks the same thing in its new place.

### Round 11 removed

Fuel: the free test's drawn table (`freeTable`), the stopwatch plate and the km/h text beside each car, and the `RIGHT` and `WIDE`
road constants (the road's place is `roadOf`). Ski wax: the drawn table of results (`resultsTable`), the stopwatch plates and
the branch that moved a finished ski's name beyond its stopwatch, and the compact close-up's old position. Braking: the import of the
shared key cap.

## Sound

No new game event.

## Removed

`src/lab/classroom/brian-portrait.js` (the 3D render of Brian); the brushed-steel board background and the outline
helicopter and car.

## Left for later (on the card)

The older five-step lesson frame still ships with no lesson in it, because the walking room and the lesson opener
import it; three modules nothing imports (`tunnel-model.js`, `tunnel-packet.js`, `workshop-display.js`) go with it.

## Round 12: Launch and Projectile (in its own file until the merge; folded in by Claude)

Branch `worktree-agent-accf055551cfc8882` (on `integration/wasteland` e64793b1f). Sheet and review note:
`docs/board/looks/lab-look/round-12.jpg` and `round-12-review.md`.

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
  `round-N.jpg` and `look-N.jpg`; it now also takes a name with words after the number (`round-12.jpg`, the name the brief
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
