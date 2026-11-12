# RUN-GAS

Built by a Sonnet helper for Claude, 11 November 2026. New switch: `scablands-runs` (dev, off); it needs `story-everburn`. The
design is the card's (`docs/board/cards/RUN-GAS.md`, with its two sections added after the first build stopped: "Raids on an
escort" and "Pay"). This note lists what was built, the numbers, the checks and what differs from the card.

## What changed

- **The switch.** `src/feature-flags.js`: `scablands-runs`, dev. `tools/test-feature-flags.mjs` counts 54 switches (was 53) and
  lists the new one with the other dev switches.
- **The save.** `src/story/ember-save.js`: `feud` (1 to 4) and `runs` (0 or more) inside the Everburn story's own entry. Only a
  saved value is checked, so an older save reads exactly as before and loading adds neither name; a missing or damaged value
  reads as Raiding (2) and 0, and a damaged saved value is repaired to the same. New: `EMBER_FEUD_WORDS`, `EMBER_FEUD_START`,
  `EMBER_RUN_ROADS`, `emberFeud`, `emberRuns`, `emberFeudWord`, the writer `run`, and `applyArrivedRun(profile, road)`, which
  moves the feud one step (up on `boneyard`, down on `long`, within Watching and War party), adds one run and says whether
  this arrival reached War party. It refuses an unknown road, a save with the six jobs not all won, and a save from a newer
  build. Pure.
- **Raids on an escort.** `src/world/jobs/steps/escort.js`: a step may carry `ambushes` (`{id, place, count}`).
  - Within 160 m of the place Big Bess's raiders appear (a `spawnWave` request with `ambush: true`), 6 m, 6 m, 8.5 m and 8.5 m
    to the sides of the road at the place (alternate sides, so within 12 m and on both sides), through the job mode's raider
    list (`src/arena/modes/world-job.js`, `spawnAmbush`), facing the place. They are the foot raiders the well's attackers are
    (same record, same knock-down and recovery, same shooting at a car near them: the camp's own place is the zone's, so a car
    within 82 m and over 8 mph is shot at, once each, as everywhere).
  - Each raider standing within 30 m of her wears her health by 1.5 (Easy), 5 (Medium) or 7 (Hard) a second
    (`wearEscort`, from `dt`, applied the way the well's wear is). Knocked-down raiders and raiders over 30 m away do not.
  - At 0 health the existing rest runs (for `restSeconds`, 3 s on job 4 and on runs; the old rest lasted one tick) and then the
    stretch starts again: she goes back to the last place she reached with the health she had when she left it, and every
    ambush on that stretch or ahead of it has its raiders removed and comes back at 160 m. Health lost on a finished stretch
    stays lost. A restart is never an arrival.
  - Once she is 60 m past an ambush along her road, raiders still standing are removed (`clearWave`).
  - Easy: one raider fewer in every ambush, never fewer than one (`ambushRaiders`).
  - All from the job clock and positions; no randomness in the step.
- **Job 4.** Its two declared `raiders:` places are now `ambushes` of 2 raiders each (1 on Easy). Other numbers kept: 9 m a
  second, health 100. The second place moved from (500, 90) to (500, 41): the old one is 48 m from her road, out of reach of
  the 30 m that wears her, so that ambush could never have touched her. Its rest line now has words (`story.ember.moss.3`;
  the old id `everburn-job-4-rest` had none).
- **Pay.** `src/arena/arena-settlement.js` (its own commit, `RUN-GAS pay`): `arenaReward` multiplies the world-job amount by
  `definition.shares` (a whole number of at least 1; absent or anything else is 1). `base` is 80 times shares. Test in
  `tools/test-arena-settlement.mjs`.
- **The run.** `src/world/jobs/gas-run.js` (new): the two roads, the card's feud table of raids, the fixed ambush lists,
  `gasRunJob({road, feud, runs, difficulty})`, `gasRunPay(road, difficulty)` (reads the amount from `arenaReward`) and
  `isGasRun`. Big Bess is the actor `big-bess` with `renderCar: false`, drawn by the Scablands scene as in job 4. The run's
  definition carries `storyId: 'everburn'`, `run: true`, `road`, `feud`, `runs`, `shares`, `raids` (the counts for the difficulty).
- **Arrival.** `escort.js` closes a step that has `arrival` with Moss's line chosen by Bess's health (70 or more: moss.8, else
  moss.9), then any `thenLineIds`; `src/world/jobs/step-lines.js` lets a step's outcome name its closing lines
  (`closingLines`) and keeps them in the state, so the job holds for them as job 3 holds for its closing line.
- **The wall.** `src/story/ember-road.js` (`run` in the props only when the run's switch is on, the six jobs are won and the
  Everburn is available; `emberFeudSentence`), `src/story/ember-ui.js` (`gasRunRow`: GAS RUN, state OPEN, the feud's sentence,
  two buttons with their pay), `src/story/story-ui.css`.
- **Start and finish.** `src/app.js`: `gasRunAvailable()` (both switches, the Wasteland open, the six jobs won), `gasRun(road)`,
  the allowance in `startArenaEvent` for a run (the only job allowed that is not one of the six), and a branch in
  `_settleArenaResult` that calls `applyArrivedRun` and puts `result.gasRun` on the result. `src/screen-router.js`: the
  `data-ember-run` buttons, and the retry of a run. `src/screen-arena.js`: a run's result names where the Ash Men stand and
  how many runs have arrived, and offers DRIVE ANOTHER RUN.
- **HUD.** `src/world/world-hud.js`: a `BIG BESS 100 / 100` bar while an escort step has raids on her road.
- **Lines.** `src/story/ember-lines.js`: `story.ember.moss.5` to `.9` and `story.ember.auntie-solder.9`, word for word.
  None of the ids was taken. Moss.5 and .6 are the run's start lines (step `startLineId`), moss.7 the first raid of a run (said
  once per run, also after a rest), moss.8 and .9 the arrival, and Auntie Solder's line is the last of the closing lines of a
  Boneyard run that starts at Hunting (the arrival that takes the feud to War party), so it plays once.

## Numbers

| What | Value |
| --- | --- |
| Roads | long road 8 places, 1,639 m; Boneyard road 7 places, 1,252 m (the road no longer doubles back) |
| Pay | long road 1 share, Boneyard road 2; a share is 80 times the difficulty factor (Easy 80, Medium 96, Hard 112) |
| Raids, Boneyard road, Watching / Raiding / Hunting / War party | 2 / 2,2 / 2,3,2 / 3,3,4 raiders |
| Raids, long road | none / none / one of 2 / one of 3 |
| Easy | one raider fewer, never fewer than one: Boneyard 1 / 1,1 / 1,2,1 / 2,2,3; long 1 and 2 |
| Appear / wear / give up | 160 m / 30 m / 60 m past |
| Wear per raider per second | Easy 1.5, Medium 5, Hard 7 |
| Rest | 3 s (job 4 and runs) |
| Ambush places | Boneyard road: 7 fixed marks (260, 400, 540, 690, 830, 970, 1,100 m from the well), the raids' count drawn from them; long road: the one place 110 m before Tin Town |
| Tightest clearance from a solid | long road 9.1 m, Boneyard road 17.1 m |

## Differs from the card

- **The Boneyard road no longer doubles back (Claude's correction of the card, after review).** The card's table took Big Bess
  from the Boneyard west to the safe road and east again. The road now goes straight on: well, (-200, 350), (0, 370),
  (250, 415), the Boneyard, Tin Town's gate (575, 62), Tin Town. The safe road (230, 150) is not on it. Two changes keep it
  8 m from every solid: the Boneyard's place is moved 23 m east and south, from (424, 304) to (447, 308), because the planes' box
  lies just north-west of it; and Tin Town's gate brings the road in from the south of the town's box. No bend is added. Length
  1,252 m (was 1,594 m with the doubling back, and the card's table brought about 1.6 km), reason "the road no longer doubles back";
  tightest clearance 17.1 m. The ambush marks were redrawn on the new road.
- **The long road is 1.64 km, not about 1.9 km**, with the card's places as written. Kept as written. The Boneyard road is now
  about 390 m shorter than it: short and dangerous, or long and safe.
- **Job 4 ended at the safe road, not at Tin Town.** The escort counted as arrived when Big Bess *set out* for the last place of
  her road (`pathProgress` is the index of the place she is heading for). Job 4 therefore ended 417 m short of Tin Town. Now she
  has arrived when she has reached the last place (`reachedEnd`, `atDestination`), so job 4 is about 72 s long (was about 36 s).
  A run needed this or the last 400 m of the Boneyard road would never have been driven. This changes job 4's finish.
- **Her rest and restart gave nothing back.** Her health was never restored and she was never moved, because nothing could
  hurt her before. A restart now returns her to the last place she reached with the health she had when she left it; the
  state flag `rested` is cleared so she may rest again (it was never cleared). The rest lasts 3 s.
- **Easy's wins.** The child-pace driver was not taught anything: with Easy's 1.5 a second and one raider fewer it brings every
  case home 10 of 10 without fighting (see Checks). At War party on the Boneyard road, left alone, Big Bess arrives with 28
  health at the lowest of ten tries. The margin is good on Easy; on Medium the first ambush alone costs her about 58 if she is
  left alone, as the card says (about 70 for two raiders).
- **Raid sound.** An ambush appearing emits the existing `raiderWarning` event (see Sound).

## Checks

- `node tools/test-run-gas.mjs`: 902 checks (new). Raids as pure numbers (distances, Easy's one fewer, the rest and restart, the
  raid line once); raids in a real Duel on job 4 at Easy, Medium and Hard (where they stand, both sides, wear per second,
  knocked-down and far raiders do not wear her, rest, restart with her stretch health, the ambush back, raiders leave 60 m
  past, the existing raider warning once); the two roads and their places; the feud table with Easy's fewer; the same save
  gives the same places and two Boneyard runs in a row never match (300 pairs at each word); every ambush lies on its road;
  pay; both roads clear every solid by 8 m; the wall with each switch off, before job 6 and with it won; starting, arriving,
  leaving and failing in a real App; a damaged save.
- `node tools/test-ember-save.mjs`: 92 checks (53 before); `feud` and `runs` kept, repaired, older saves read as before.
- `node tools/test-everburn-easy.mjs`: all nine jobs 10 of 10 as before (job 4 with its raids included), and the new gas run
  cases below.
- `node tools/test-ember-lines.mjs`: 46 captions (40 before) and the six lines each at the moment the card gives.
- `node tools/test-arena-settlement.mjs`: 10 tests (9 before); shares.
- Also run and passing: `test-ember-screens` (23), `test-world-job-mode`, `test-feature-flags` (129; the count of switches
  is now 54), `test-world-jobs`, `test-world-hud`, `test-old-smoke` (480), `test-scablands-scene`, `test-ships-lines` (90),
  `test-town-links` (16), `test-town-world`, `test-blender-output` (397), `test-preview-launcher` (23).
- Lane tier (`--changed --jobs 4 --keep-going`): 130 passed, 1 failed. The one failure is `tools/test-story-registry.mjs`
  ("and the only lines": it finds the Everburn and Ships lines registered as well as Kogane's). It fails the same way on
  the commit before this card (`7d7135521`, checked from a copy of that commit's `src`): `flamethrower.js` imports
  `world-job.js`, which imports `ember-lines.js`, so the lines register whenever `progression.js` is loaded. Not caused by this
  work and not fixed here (a card for Claude). `start-preview.bat` needed the new switch for `test-preview-launcher` and has it.
- `npm run build`: pass.
- Browser scenarios `run-gas` (new) and `everburn-well`: pass (3 and 2 screenshots, 0 warnings, 0 errors).

### The Easy driver: gas runs brought home out of 10

The child-pace driver was not taught anything; it drives to Tin Town and does not fight. The run count is the try's number.

| Road | Watching | Raiding | Hunting | War party |
| --- | --- | --- | --- | --- |
| Long | 10 | 10 | 10 | 10 |
| Boneyard | 10 | 10 | 10 | 10 |

Big Bess's lowest health on arrival over the ten tries: long 100, 100, 90, 80; Boneyard 89, 80, 60, 31. Job 4 still 10 of 10.

## Sound

- A raid appearing: `raider.warning` (the existing event `raiderWarning`, the same cue as the roadside camps' warning; with fight
  voices on, the existing `raider.toll`). Once per ambush.
- Raiders shooting: the existing `raiderShot` cue, as everywhere raiders shoot.
- Hits on Big Bess, her rest, her arrival and the run's start: no cue. Job 4 has none, and the card says "the cues job 4 uses".
  They are captions (Moss's lines) and the health bar.

## Removed

The unread `raiders:` list on job 4 (now `ambushes`), the old escort test of "arrived when she sets out for the last place",
and job 4's raw rest line id `everburn-job-4-rest`.
