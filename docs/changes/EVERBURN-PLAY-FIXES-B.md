# EVERBURN-PLAY-FIXES, part B: where things start and where the camera stands

Built by a Sonnet helper for Claude, 12 November 2026, on the card `docs/board/cards/EVERBURN-PLAY-FIXES.md` ("Part B", items 1 to
6). Part A (what the screen says and shows) is Codex's and touches other files. Switches `story-everburn` and `scablands-runs` stay off.
Pictures: `docs/board/looks/everburn-play/round-3.jpg` with `round-3-review.md`.

## What changed, item by item

1. **The camera never sits inside a big machine.** `src/world-job-camera.js` (new, pure): `machineLift` says how far up the camera must go
   when its place is inside a machine's box plus 1 m (it then stands 2 m above the machine's top); `easeMachineLift` raises it at once and
   lowers it smoothly (3.5 a second) when clear; `machineLookBlend` turns the look down to the car as it rises. `src/world/scablands-scene.js`:
   `BIG_MACHINE_BOXES` (the furnace 2.12 m each side, -4.22 to 6.18 m along, 5.06 m tall; Big Bess 1.4, -4.1 to 4.02, 3.4 m: read from the
   models' own extents, the furnace drawn at 1.5 times its stored size) and `group.userData.bigMachineBoxes()`, which gives the boxes where the
   rigs are drawn this frame. `src/render3d.js`: after the camera is placed it reads those boxes, only in a world job, only for a machine
   the job has an actor for, never in the hood view or on foot. Drawing only: it reads state and writes none; an ordinary race has no
   world job, so its camera is exactly as before.
2. **A job opens looking where the car looks.** `facingChaseView` (same module) and `src/render3d.js`: in a world job the chase and wide
   cameras stand behind the car along the car's own facing (8.7 m back, 3.65 m up, aimed 26 m ahead, as before) instead of along the oval.
   This is the camera for the whole job, not only the first frame: a camera fixed to the oval cannot show jobs 2, 5 and the escorts, whose cars
   now start across the oval's direction, and would swing at the first turn. Where the car already faced along the oval (every ordinary
   start) the two cameras are the same. In job 6 the derrick is in the first picture.
3. **Every job starts in the open.** A first step may carry `carStart: {x, z, heading}`; `initializeWorldJob` (`src/arena/modes/world-job.js`)
   puts the car there. Job 2: (582, 44), 18 m inside Tin Town's gate on open ground, 14 m from the nearest drawn thing, facing the forge
   (it started in the alley at the town's centre). Job 5: (150, 416) on the road, 150 m short of the Dead Mall, facing it (it started
   inside the mall's box); Cinder's "Leave the car outside" is her start line, so it is said at once and the mall's own line waits until
   the car is within 22 m of the valve room (more than 100 m on). Jobs 1, 3 and 6 are unchanged and were already clear.
4. **An escort starts beside what it escorts.** `escortCarStart` in `src/world/jobs/steps/escort.js`: 10 m behind her first place and 6 m
   to her right, facing along her road. Job 4 uses it as it stands. Every gas run and the battle start at the well, in whose 18 m derrick
   box she begins, so there the car starts 13 m behind her (`GAS_RUN_START_BEHIND_METRES`): at 10 m the car, or the camera behind it, is
   inside or against the box on both roads, and the card also asks for 3 m clear. 13 m is the smallest whole number that is 3 m clear on both.
5. **Job 6's raiders.** `raiderEntries`: four places a compass apart, 64 m from the well; a wave comes from the one farthest from the player's
   car (and from the player on foot): never less than 64 m, checked with the car at the well, at each place and out on the flats. Walking
   in takes 3 m a second (it was 1.5 from 27 m away: 21 s for the 62 m, about what the 18 s was). `firstWaveAfterSec: 2.4`: the first
   wave comes after Cinder's opening line (2.2 s). When the defence ends every raider of its waves, standing or down, is removed with
   its camp (`removeWaveRaiders`), so none is left at the well or fires or warns during the chase. The old entry place and its 1.5 m a
   second are gone.
6. **Job 4's result line.** `resultLine: "The gas is in Tin Town and the forge is lit."` on the job; `src/screen-arena.js` already reads
   it before its own stand-in text, so that file is untouched.

## Files

`src/world-job-camera.js` (new), `src/render3d.js`, `src/world/scablands-scene.js`, `src/arena/modes/world-job.js`,
`src/world/jobs/everburn.js`, `src/world/jobs/gas-run.js`, `src/world/jobs/steps/escort.js`, `src/world/jobs/steps/defend.js`; tests
`tools/test-everburn-play-start.mjs` (new), `tools/test-scablands-scene.mjs`, `tools/test-everburn-easy.mjs`. None of Codex's files was edited.

## Checks

- `tools/test-everburn-play-start.mjs` (new, 228 checks): the start check for all six jobs, both runs and the battle (car and camera place
  each 3 m clear of every solid and of Tin Town's drawn model and fence; start place, facing, 10/13 m behind and 6 m right); job 5's lines;
  job 4's result line; job 6's raiders (first wave at 2.43 s, 87.8 m from the car; 60 m or more with the car at eight different places; every
  wave; none left at the chase); the camera rule (inside the box plus 1 m on each side and over the top is lifted to 2 m over the top;
  1.1 m out is untouched; no machine or the other machine only: no change; up at once, down smoothly); the boxes against the real models.

  Start clearances (car / camera place, m): job 1 412.5 / 412.5; job 2 14.0 / 9.0; job 3 126.1 / 119.4; job 4 22.0 / 14.0; job 5 131.0 /
  139.7; job 6 17.3 / 26.0; long road 3.3 / 12.0; Boneyard road 4.9 / 13.4; battle 4.9 / 13.4.
- `tools/test-scablands-scene.mjs`: two blocks added (each machine's box stands at its rig and has its size; a machine not drawn gives no box).
  All its earlier assertions unchanged.
- `test-run-gas` 1116, `test-run-gas-medium` (card targets met), `test-field-battle` 792, `test-old-smoke` 650 (untouched, passes),
  `test-everburn-easy` (all nine jobs, both roads at every feud word, the battle), `test-ember-save` 117, `test-everburn-line-audit`,
  `test-scablands-job-map` 38, `test-everburn-screens-start` 9, `test-scablands-scene`: all pass.
- Browser (`everburn`, `everburn-play`, `everburn-well`, `run-gas`, `field-battle`): 5 of 5 pass, no errors.

## Changed assertions and drivers

- **`tools/test-everburn-easy.mjs`: no assertion changed; the child-pace driver's defence was changed.** With job 6's new raiders the old
  driver finished 0 of 10 (the assertion is 8 of 10): it drove at the nearest raider and crept in at 4 mph, which only worked while the
  raiders walked into its sights from beside the car. They now arrive from 64 m and stand at the well, and the car circled a raider point-blank
  (a car cannot turn on the spot) while the well fell. The driver now runs at the nearest raider, and if it ends up closer than 6 m and not
  lined up it drives off to 28 m and runs at it again. Result: job 6 finishes 10 of 10 (the old driver on the old code: 10 of 10), in 199 s in
  all (223 s before). Nothing else in the file moved. Claude decides whether to keep this driver.
- No other assertion changed. `test-old-smoke` ran untouched and passed (its full-job case sets the chase step directly, so the defence
  change does not reach it).

## The tables measured again (same seeds, 10 tries each, old code then this branch)

RUN-GAS, Medium, runs brought home out of 10 (Big Bess's lowest health on arrival in brackets). Every win count is 10 of 10 for both drivers,
before and after. The card's targets (the fighting driver wins job 4 and a Boneyard run at Raiding 8 or more, at War party 5 or more; the
driver who never fights arrives everywhere; at most 2 rests for each stretch) all hold.

| Fighting driver | Job 4 | Long: Watching, Raiding, Hunting, War party | Boneyard: Watching, Raiding, Hunting, War party |
| --- | --- | --- | --- |
| Before | 10 (89) | 10 (100), 10 (100), 10 (35), 10 (3) | 10 (35), 10 (35), 10 (3), 10 (2) |
| After | 10 (100) | 10 (100), 10 (100), 10 (100), 10 (68) | 10 (100), 10 (100), 10 (33), 10 (25) |
| Never fights, before and after | 10 (60) | 10 (100), 10 (100), 10 (35), 10 (3) | 10 (33), 10 (20), 10 (60), 10 (60) |

The fighting driver does better because the car is now with Big Bess when the first ambush comes. The driver who never fights drives
straight to Tin Town and is unchanged to the digit. Most rests in a try that arrived: fighting Boneyard Hunting 2 to 1, War party 3 to 1.

FIELD-BATTLE-ASH, the five drivers, home / won / lowest health in a won battle / seconds of cinders on her / longest battle:

| Driver | Before | After |
| --- | --- | --- |
| Easy, child-pace | 10 / 10 / 52 / n.m. / 142 s | 10 / 10 / 51 / n.m. / 142 s |
| Medium, fights | 10 / 9 / 26 (9 of 9 at 25 or more) / 11 to 21 / 194 s | 10 / 8 / 28 (8 of 8) / 12 to 22 (10 of 10 in 10 to 30) / 194 s |
| Medium, never fights | 10 / 0 / (1 on arrival) / 21 to 51 / 225 s | 10 / 0 / (1 on arrival) / 21 to 51 / 225 s |
| Hard, fights | 10 / 4 / (4 of 4 at 25 or more) / 13 to 22 / 203 s | 10 / 7 / (4 of 7 at 25 or more) / 13 to 22 / 190 s |
| Hard, never fights | 10 / 0 / (60 on arrival) / 15 to 45 / 229 s | 10 / 0 / (60 on arrival) / 15 to 45 / 229 s |

(n.m.: not measured here; `tools/test-everburn-easy.mjs` does not count cinders. The Medium and Hard rows are from a scratch copy of
`tools/test-run-gas-medium.mjs`'s two drivers run at both difficulties, deleted after; the "before" rows reproduce the card's table, so the
method is the same.)

Against the card's targets: 1 (Medium fights, cinders 10 to 30 s in at least 8 of 10) met, 10 of 10. 2 (home 10 of 10 for every Easy and
Medium driver; the one who never fights wins none) met. 3 (lowest 25 or more in at least 7 of the won) met, 8 of 8. 4 (Medium 6 to 9, Easy 8 or
more, Hard 3 to 7 won) met: 8, 10 and 7. **No target is missed.** Hard fights, 7 won, is at the top of its range (it was 4): the car now starts
with Big Bess and meets the furnace's first door sooner. Nothing was retuned.

## Left as it is, and open

- Big Bess begins inside the derrick's box, so at the start of a run or the battle the derrick stands between the car and her (round 3,
  pictures 5 and 6). The card's rule puts the car beside her; moving where she begins on the well's road is a change to the road, which this card
  does not make.
- The solid `tin-town-shell` stands at x 538 to 570, 46 m west of Tin Town's drawn model (582 to 615). It looks like an old offset. Nothing here
  depends on it (the start check also tests the drawn model), so it is left for a card.
- The chase camera now follows the car's facing in every world job (item 2). For a car steered in the Scablands the camera therefore turns with
  the car as in the Scrapdome's back view, where before it stayed on the oval.

## Removed

- `wellApproach` and `raiderEntry` (job 6's one entry place, 6 m from the car's start) and the 1.5 m a second approach: replaced by
  `raiderEntries` and 3. The code that read `raiderEntry` still reads it for a job that names one (`tools/test-world-job-mode.mjs` does).
- The child-pace driver's 4 mph creep at a raider in `tools/test-everburn-easy.mjs`: replaced by the run-in and back-off.
- Nothing from the card's table or from a saved game: no save shape, pay or line changed.
