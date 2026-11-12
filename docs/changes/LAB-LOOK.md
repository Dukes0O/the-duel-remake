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
