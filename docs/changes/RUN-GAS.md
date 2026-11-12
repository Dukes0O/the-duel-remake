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
- Lane tier (`--changed --jobs 4 --keep-going`): 139 passed, 0 failed. `tools/test-story-registry.mjs` (78 checks, unchanged)
  passes again, see "Follow-ups after review". `start-preview.bat` needed the new switch for `test-preview-launcher` and has it.
- `npm run build`: pass.
- Browser scenarios `run-gas` (new) and `everburn-well`: pass (3 and 2 screenshots, 0 warnings, 0 errors).

## Follow-ups after review (Claude, 11 November)

- **The Boneyard road no longer doubles back.** See "Differs from the card". Test and numbers re-recorded: length 1,252 m
  (was 1,594 m), clearance 17.1 m, marks 260, 400, 540, 690, 830, 970, 1,100 m; the Easy table is still 10 of 10 everywhere.
- **Job 4 shows real words.** `lineId` and `startLineId` are `story.ember.moss.1`; the job ends on `story.ember.auntie-solder.6`
  through the closing-line path (`closing`), held as job 3 holds for Cinder's. The won line `everburn-job-4-won` and the start id
  `everburn-job-4-start` are gone. Nothing pinned the raw ids: `test-ember-screens` and the `everburn` scenario did not name them.
  `tools/test-ember-lines.mjs` gained a check that every line job 4 names has words, that it starts on Moss's line and holds for
  Auntie Solder's. Jobs 1, 2, 3, 5 and 6 still show raw ids for their start and some other lines (QA-EVERBURN-SCREENS).
- **Layering.** `src/arena/modes/world-job.js` imported `EMBER_CAPTIONS` from `src/story/ember-lines.js`, so loading the core
  registered the Everburn's and the Ships' lines and `tools/test-story-registry.mjs` failed since WW-BOSS (10 November). It now
  reads captions through a new `captionRecord(id)` in `src/story/story-lines.js`, beside `captionText`. The Everburn's lines still
  register wherever the story runs: `main.js` imports `screen-router.js`, which imports `screen-menu.js` (imports
  `story/ember-ui.js`) and `screen-arena.js` (imports `ember-lines.js` itself). `tools/test-old-smoke.mjs`, the one test that
  read captions through the job code, now imports `ember-lines.js` (not a changed assertion). No other static import path pulls a
  story's lines into the core: a walk of the imports from `progression.js` and the story modules finds none.


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
job 4's raw rest, start and won line ids (`everburn-job-4-rest`, `everburn-job-4-start`, `everburn-job-4-won`), the Boneyard road's detour to the safe road, and its imports of the Everburn's lines in `world-job.js`.

## Changes from play on Medium (Claude, 12 November)

The card's section "What play showed, and the changes it needs": on Medium nothing could be won. Seven changes, then drivers on Medium.

- **1. Cars run raiders down.** `src/arena/modes/world-job.js` (`runDownRaiders`): in an escort's ambush a raider whose position is
  within 2.2 m of the player's car centre while the car moves at 4 m/s or more (`state.speedMph` times `DRIVE.mphToWorld`) is
  knocked down through the existing `damageRaider` (so the game counts it and shows RAIDER DOWN). `src/raiders.js`: a raider with
  an `ambushKey`, once knocked down (by the car, the crossbow, a bomb or the flamethrower), stays down for the rest of that ambush;
  every other raider, job 6's well raiders included, still gets up after 3 seconds and a car does nothing to them (checked).
- **2. Health after a rest.** After a rest Big Bess has `max(health at the start of the stretch, 60)` (`REST_HEALTH_MINIMUM` in
  `escort.js`); the new value is also her stretch-start health.
- **3. Job 4's first ambush** is at (278, 188) on her road, 186 m from the start (was (360, 270), 72 m). No ambush may stand within
  180 m of the start along the road (`AMBUSH_MIN_FROM_START_METRES`): checked for job 4, every fixed place, and every road, feud
  word and run count 0 to 199 (more than 1,000 ambushes). The Boneyard road's nearest mark is 260 m, the long road's one place is
  1,529 m along.
- **4. Big Bess's health bar** (`world-hud.js`, `world-hud.css`) is its own element at the lower left (left 35 px, bottom 78 px, 188 px
  wide), above the armour bar and below the route map, the same column the game's other bars use. It no longer sits in the middle of
  the top under the rear-view mirror. The `run-gas` scenario measures it and fails if it covers the mirror, the caption line, the
  armour bar or the route map (picture: lower left, `BIG BESS 100 / 100` above `PLAYER ARMOR`).
- **5. The flamethrower** is lent for job 4 and for every run (`lentWeapon: 'flamethrower'` on the escort step), as job 1 lends it. A
  run's car has it in slot 4 (checked in a real Duel and in the picture).
- **6. Sightings** (`furnace-sightings.js`): job 1's furnace stands at (300, -60), the caption distance stays 260 m (the lines test's
  distances moved with the furnace: 233 m is now (67, -60) and 270 m is (30, -60)). Job 4's furnace paces Big Bess 90 m to her north and
  40 m ahead of her along her direction of travel, with the same 30% to 70% rule and the same turn away north (the scene test follows).
- **7. The gate fire** (`scablands-scene.js`, only the gate-fire code): five tongues 6 to 8 m tall at x = -7, -3.5, 0, 3.5, 7 m (each 4 m
  wide, 18 m in all) centred on the gate place (575, 62); five groups of `createSparks`; 12 smoke puffs rising 30 m; the firelight pool
  from `createGroundGlowMaterial` (34 by 24 m). Shown only once the gate has burnt. No gate is built.

### Medium drivers (`tools/test-run-gas-medium.mjs`, new, beside the Easy test; 10 tries each, the run count is the try's number)

The fighting driver goes to the next ambush it has not seen yet and waits 45 m short of it on the side Big Bess comes from; when raiders
appear it drives at the nearest standing one (34 mph, 22 mph inside 12 m) and runs him down; with no raiders left it goes back to her.
The driver who never fights drives to Tin Town at 52 mph, as the Easy driver does. Targets, asserted: the fighting driver wins job 4
and a Boneyard run at Raiding 8 in 10 or better and at War party 5 in 10 or better; the driver who never fights still arrives on the long
road at Watching and Raiding; a try that arrives needs at most 3 rests. Easy's targets (8 of 10 everywhere) are unchanged.

| Medium, brought home out of 10 (lowest Big Bess health on arrival) | Job 4 | Long: Watching | Raiding | Hunting | War party | Boneyard: Watching | Raiding | Hunting | War party |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fighting driver | 10 (89) | 10 (100) | 10 (100) | 10 (35) | 10 (3) | 10 (35) | 10 (35) | 9 (27) | 7 (2) |
| Never fights | 0 | 10 (100) | 10 (100) | 10 (35) | 10 (3) | 10 (33) | 1 (20) | 0 | 0 |

Rests in a try that arrived: 0 everywhere except one for the fighting driver at the Boneyard road's Hunting and War party and one for
the driver who never fights at its Raiding. The tries that did not arrive were loops: Big Bess is worn to nothing, rests, restarts at 60
and is worn down again, 22 to 75 rests (the fighting driver, 29 at Hunting and 56 at War party; the one who never fights, 22 on job 4,
63 at Raiding, 74 at Hunting, 75 at War party). The 60 health floor does not get a player who leaves the raiders alone past two
2-raider ambushes on Medium.

| Easy (unchanged driver), out of 10 | Long: Watching | Raiding | Hunting | War party | Boneyard: Watching | Raiding | Hunting | War party | Job 4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brought home (lowest health) | 10 (100) | 10 (100) | 10 (90) | 10 (80) | 10 (89) | 10 (80) | 10 (60) | 10 (31) | 10 |

### Checks for these changes

`test-run-gas` 940 checks (53 new: running raiders down, staying down, job 6 unchanged, health after a rest, 180 m from the start, the lent
weapon); `test-everburn-easy` (job 4 and the eight runs, table above); `test-run-gas-medium` (table above; takes about eight minutes);
`test-ember-lines`, `test-old-smoke`, `test-scablands-scene`, `test-world-hud`, `test-world-job-mode`, `test-story-registry`,
`test-ember-screens`: pass. Browser scenarios `run-gas` (with the new bar check) and `everburn-well`: pass.
