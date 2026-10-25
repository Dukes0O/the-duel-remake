---
task: LAB-TUNE
status: review
kind: feature
flag: lab-tuning
player_facing: yes
---

# Tuning: settings, wing and brake-balance hooks, fuel, stock laps, tuned-lap bonus (25 October 2026)

Card `docs/board/cards/LAB-TUNE.md`, design `docs/LAB.md` section 5 (settled points under "Settled by LAB-TUNE").
Behind `lab-tuning` (dev), and only with `lab` on. With the switch off, or every setting at 0, a race is exactly what it was.
This card held `save-shape` (the tune and stock laps are in the save); the Tune page and the result line's words are
LAB-TUNE-VIEW's.

## What it adds

- `src/lab/lab-tune.js` (new, pure): `tunedCar(car, tune)` applies section 5.1 after upgrades (a stock tune gives back the
  very same object); `tunedGrip(car, speed, brake)` is the grip the steering sees (wing push at speed, brake-balance cost
  while braking; an untuned car gives its own grip bit for bit); `normalizeTune`, `raceTune` (who gets a tune), `fuelPlan`,
  `ruleSetOf`, `bestLap`, `seedStockLaps`, `settleTunedLap`. Every number of the table is in `LAB_TUNE`.
- `src/game.js` (marked `LAB-TUNE`): `startCampaign({tune})` stores `state.tune` only when the switch is on, the tune is not
  stock and it is not a lesson run; `get car()` applies it (the cache key includes it); `_loadStage` sets `state.fuel`
  (a Grand Prix on a course with a pit lane, a petrol car); `startArenaEvent` clears both (an arena event is never tuned).
- `src/sim-driving.js` (marked): the steering uses `gripNow`; the dry engine is 40% of the acceleration (`accelerationShare`,
  next to ENGINE-CURVE's pull, which already uses the tuned `car.accel`); the tank burns with the metres driven.
- `src/pit-lane.js` (marked): a stop for a player with a tank takes 5 s longer and refills the tank; the panel counts the
  longer service. Computer cars and a car with no tank stop for 4 s, as today.
- `src/app.js` (two marked blocks, Claude's answer 4): `tune:` in the `startCampaign` call, and `_settleTunedLap` where a
  finished Time Trial settles (before the run is written to the records). `src/lab/lab-save.js`: stock laps are keyed
  `car|course` or `car|course|rules` (rule names joined by `+`), capped at 4,096, a later game's rule names kept.
- Tools: `tools/track-script-drive.mjs` gains `tune`, `mode`, `stopAfterLaps` and the `lab-tuning` and `grand-prix` flags,
  and its racing-line driver takes the grip a tuned car has at the speed the line asks for (so the wing is used); for an
  untuned car it is the same code path, so nothing else changes.

## Settled in writing (Claude answers on the card)

Fuel steps -2 to 0 are the full tank, +1 three-quarter, +2 half, +1.5% acceleration and braking per step above 0; the stop
takes 5 s longer only with a fuel setting above 0 and refills the starting load; the brake balance's cornering cost is in
the tuning's own hook (step 0 leaves the grip bit for bit); the two app blocks; stock laps seeded once from the Time Trial
records and kept by rule set (tyre-slip, engine-curve). One condition went further than the card: this card holds `save-shape`.

## No free lunch (5.2): what the test driver shows

First Time Trial lap against stock, % faster (positive) or slower (negative), on six courses (the authored circuits use the
racing-line driver, the older courses the demo driver). Pressure and the wing trade as the table says:

| Course | pressure -2 | pressure +2 | wing -2 | wing +2 |
| --- | --- | --- | --- | --- |
| Tremblant Woods | +0.72 | -0.78 | -2.85 | +1.71 |
| Harbour Lights | +0.53 | -0.74 | -2.09 | +1.35 |
| Panorama Ridge | +0.86 | -0.65 | -2.75 | +1.75 |
| Pacific Canyon | -0.27 | +0.24 | +0.97 | -1.03 |
| Harbor Highlands | -0.26 | +0.23 | +0.96 | -1.03 |
| Cloudbreak Skyway | -0.07 | +0.04 | +0.81 | -0.87 |

(A step of 1 is about half of the 2.) So the wing and pressure each win on some courses and lose on others, at every step.
On each wind-tunnel course some setting beats stock by 0.5% or more: Tremblant Woods, Panorama Ridge, Harbour Lights,
Tremblant Snow and Summit Run each by the wing at +2 (1.7, 1.7, 1.3, 3.0 and 2.7%). **No number needed to change.**
What a lap cannot show, and what stands in for it (each pinned in `tools/test-lab-tune.mjs`):

- **Brake balance.** A step moves a lap by about 0.01%: braking is a small part of a lap. So no lap claim is made; the trade
  is two numbers pulling opposite ways (stops shorter and less cornering grip while braking toward the rear, the reverse
  toward the front), and the hook is checked on the steering itself (a step at half brake changes the turn by 2.5%).
- **Springs.** A stiffer step gains smooth-road grip and a lap on the road never leaves the road, so a lap shows only the gain.
  The cost is checked on rough ground: the same verge gives a stiffer car more scrub and less traction, a softer one less.
- **Fuel.** The tank lasts what the table says (a Grand Prix on Summit Run: dry at 55% with +2, 82.5% with +1, within 4%),
  and the race takes longer than stock without a stop (293.6 s and 302.6 s against 282.8 s), because the dry engine costs
  more than the lighter car gains. The stop is checked on a real pit box: 9 s with a fuel setting, 4 s without, 4 s for a
  computer car, and the tank full again.

## Tests

`tools/test-lab-tune.mjs` (about 190 checks, about 2 minutes 45 seconds, mostly the first laps): a stock tune is the same car;
each step moves its numbers by the table's amount (every step of every setting, the wing's square law, the brake's share);
the driving code uses the tuned grip (a step of the turn at 100 mph); the tank, the dry engine, the stop; a race with the
switch off, or a stock tune, is byte for byte the race without a tune (state and result at 30 s); the lap tables above;
the bonus (paid once, the 1% edge in whole milliseconds with a scan of 87 stock laps, junk and forged laps, another car,
another course, rule sets kept apart, the switch off, a later game's Lab left alone); seeding from the records (own laps only,
each under its own rules, fills and lowers but never raises); the save (forged tunes read as 0, forged stock laps dropped,
a flood cut, a later game's rule names kept, an old Lab reading as no tune). Break-the-code checks (each made it fail, then
reverted): about 30 across the rules, the hooks, the pit, the settle and the save; the lab-tuning check inside
`settleTunedLap` is a second guard behind `recordStockLap`'s, so removing it alone changes nothing.

Save fixtures: `tools/fixtures/saves/21-lab-tune.json` (a full tune with stock laps under three rule sets and a later game's
rule name; honest, so it comes back byte for byte like the other twenty and the suites that read every historical fixture,
`test-career-backup`, `test-deep-save`, `test-grand-prix-podiums`, still pass). The old Lab without a tune or stock laps and the
forged tune and stock laps are not honest round trips, so they live in `tools/fixtures/saves-forged/lab-tune.json`, which only
`tools/test-save-fixtures.mjs` reads (roster 20 to 21 honest plus 1 forged; a fixture there names what its Lab record should read
as: `labExpected`). Nothing existing is wiped or reset.

## Changed assertions

None changed. `tools/test-save-fixtures.mjs`: the roster count 20 to 21 (a new fixture), a second folder of forged saves, and the Lab equality
accepts a forged fixture's named expectation; the 20 older fixtures are compared exactly as before.

## Independent review (pay and saves, as DEEP-LOG)

A separate reviewer probed paying twice, the 1% edge, NaN and forged values, the switches, an old save, a later game's Lab,
the credit plumbing and the stock-run neutrality. Paying was clean (once per course; junk, forged, negative, zero and
mismatched-rules laps pay nothing; credits cap). It found, and I fixed with tests that fail without the fix:

- a Lab from a later game made the finish throw (`labOf(...).stockLaps` missing): both functions now read the stock laps
  only from a version-1 Lab;
- tune and fuel leaked into an arena event started on the same race: `startArenaEvent` clears them;
- the 1% edge was float-fragile (13 of 86 exact-1% laps refused): compared in whole milliseconds, and an unpaid lap's percent
  is rounded down so 0.99% never reads as 1%;
- a tuned first run could end up as the stock lap through the records, and seeding was all or nothing: tuned runs are no
  longer written to the leaderboard (see below), only a stock run reads the records, and seeding fills missing stock laps
  and lowers ones a record beats;
- assisted laps counted: they are filtered out before settling;
- no cap on stock laps and a narrow rule-name shape: capped at 4,096 keys, names with capitals, underscores and up to
  eight parts are kept.

Left as they are, for Claude: the stock lap is not keyed by the car's upgrades or driver, so after an upgrade a tuned lap can
beat the old stock lap once per course (400 a course, once); a stock lap forged by hand pays on any real lap.
Leaderboard rows carry no engine-curve marker, so a record from an engine-curve race seeds as a plain stock lap (a faster
engine-curve lap then makes a plain tuned lap harder to pay, never easier).

## Decision to review: tuned runs are not written to the records

A tuned Time Trial is not recorded in the leaderboard (`recordFinish` is skipped; credits, personal best and the result are as
before). Reason: a record has no tune in its key, so a faster tuned lap would replace the stock record and be read back as a
stock lap, and the stock laps could never be trusted. If you want tuned records, give the key a tune and the records separate.

## Checks

Run once in the cloud (Linux, no graphics) on the branch merged with current `integration/wasteland` (ENGINE-CURVE,
DEEP-SIRENA-VIEW and PERF-GROUND-ROWS were in it; two merge conflicts in `game.js` and `app.js`, both signature or argument
lines, resolved by keeping both sides):

- `npm run build`: passes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` (476 suites): the lane run found three suites my
  first fixture broke (`test-career-backup`, `test-deep-save`, `test-grand-prix-podiums` read every historical fixture and need
  exact bytes: fixed above, all three pass now). The rest of the failures are the usual laptop-only or already-failing suites:
  `test-course-kit` (asserts `win32`), `test-earned-cars-ui`, `test-drive-through`, `test-full-check`, `test-medals`,
  `test-salt-flats`, `test-salt-flats-art`, `test-p4-kits`, `test-tanker-valve-source`, `test-vesper-art`,
  `test-compact-binaries` and `test-lab-radio` (same on a clean `integration/wasteland`). The replay and world-signature
  guards pass with fingerprints unchanged.
- `tools/test-lab-tune.mjs`: 215 checks, about 3 minutes of CPU. After the fixture fix I reran `test-save-fixtures` (21 + 1),
  the three suites above, `test-arena-settlement`, `test-repo-hygiene`, `test-board`, `test-lab-rules`, `test-heli-mode`
  and `test-feature-flags`: all pass.
- Combat balance: not run (nothing in the combat rules changed; a car with no tune is the same object).
- Windows-only or laptop-only, not run here: `test-course-kit`, `test-earned-cars-ui`, `test-medals`, `test-drive-through`,
  `test-full-check`, `test-salt-flats`, `test-salt-flats-art`; browser scenarios and frame checks (nothing is drawn yet).

## Not done here

- The Tune page and the tuned-lap result line (LAB-TUNE-VIEW); the fuel gauge and the empty-tank sound (`car.sputter` is
  LAB-RADIO's; nothing plays yet).
- Windows-only suites could not run here (see Checks).

## Removed

Nothing.
