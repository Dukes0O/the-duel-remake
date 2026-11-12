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


## Sound

No new game event.

## Removed

`src/lab/classroom/brian-portrait.js` (the 3D render of Brian); the brushed-steel board background and the outline
helicopter and car.

## Left for later (on the card)

The older five-step lesson frame still ships with no lesson in it, because the walking room and the lesson opener
import it; three modules nothing imports (`tunnel-model.js`, `tunnel-packet.js`, `workshop-display.js`) go with it.
