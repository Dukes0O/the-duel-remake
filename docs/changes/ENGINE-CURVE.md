# ENGINE-CURVE: engines that pull like real ones (dev switch `engine-curve`)

Packet D2 of `docs/DRIVING_LESSONS.md` (12.1 and 12.5). Today a gear only caps speed and pull falls off above half revs in every
gear. Behind the switch the pull at the wheels is the engine's pull at those revs times the gear's multiplication, so in the manual box a
high gear at low revs is weak and shifting early costs time. It unblocks lesson 3 (the gearbox).

## What changed

- `src/engine-curve.js` (new): `enginePullShare(revs)` (35% at idle, under 55% of best below 30% revs, best from 70 to 80%, 88% of best at 100%),
  `gearMultiplication` (`(top gear's top speed / this gear's) ** power`), `enginePull` (never above the launch pull `car.accel * launch`, with a clutch-slip
  floor of 75% revs in first gear), `autoShiftGear` (up above 96% revs, down below 55% only if the revs after are at most 90%) and
  `ENGINE_FIT`, one fitted scale per car (Banshee and Bolide also a power). `tools/fit-engine-curve.mjs` refits the table (`--write`).
- `src/sim-driving.js`: when `state.engineCurve` is true the pull and the automatic shift points use the module; otherwise the original lines run.
- `src/game.js`: the switch is latched per race beside `tyre-slip`'s, never for arenas. `src/app.js` carries `engineCurve` in the race payload and
  `src/progression.js` tags personal-best keys `engine-curve:1`.
- `src/feature-flags.js`: `engine-curve` (dev). `start-preview.bat` lists it. `tools/race-field-balance.mjs` accepts it as a field flag.
- Questions and deviations from the card's wording (power 0.31, launch floor, convex rise): `docs/board/questions/ENGINE-CURVE.md`.

## Checks (Linux cloud)

- `tools/test-engine-curve.mjs` (13 of 13): the shape; gear multiplication and the traction cap; the automatic shift points; a fitted entry for every car;
  **switch off byte for byte** (fingerprint of three cars x both gearboxes, recorded on the base commit 13d23dce and equal on this branch) and no new field in
  state or best key; the latch per race and arena exclusion; automatic box within 2% of today on 0 to 60, 0 to 100, 140 and 170 mph for all 13 cars (worst fit
  error 1.5%); a lap of three circuits for two cars within 2%; a Grand Prix field (player and seven racers) within 2% at 90 s; manual shifts at 97.5% revs
  within 1% of automatic; manual shifts at 50% revs at least 5% slower from 0 to 100; top gear held from 30 to 60 mph at least twice as slow as automatic.
- `node tools/combat-balance.mjs --check` with the switch off: exit 0.
- Changed assertion (needs Claude's written review on the card): `tools/test-feature-flags.mjs` counts one more dev switch and lists `engine-curve`. Nothing loosened.
