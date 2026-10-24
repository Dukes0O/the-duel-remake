# FIX-LAUNCH

Status: ready for review, with one known failure written below. Branch
`cloud/fix-launch`, built in a cloud session (Claude), nothing run on Windows or
in a real browser.

Kyle finds the cars hard to drive. Claude found 0 to 60 mph took 1.1 to 1.9 s,
two to three times a real supercar. This card brings it to the settled targets
(fastest car 2.4 to 2.8 s, slowest stock car 3.6 to 4.2 s, every top speed and
the order unchanged).

## What changed

- `DRIVE.accelScale` 5.2 to **2.5**; `BOOST.accelMphPerSec` 42 to **20.2** (same factor).
  The `accelFactor` curve is untouched. One number cannot meet both ends alone:
  the 959-S is 1.81 times slower than the Jesko at any scale, the targets allow
  1.75. A curve change that closes the gap reorders Titan, Dusthawk and Viper
  (they sit 0.02 to 0.1 s apart), so the Jesko base `accel` was cut instead
  (Claude approved, card "Claude answers").
- Jesko `accel` 10.8 to **9.9**. Bugatti Bolide (arrived by merge, was the fastest at
  2.21 s) `accel` 10.5 to **9.5**. No other per-car value changed.
- **Arenas keep the old launch**: `DRIVE.arenaAccelScale` 5.2 and
  `BOOST.arenaAccelMphPerSec` 42, chosen by `launchScale(course)` / `boostLaunch(course)`
  when `course.def.arena` is true (player in `sim-driving.js`, arena CPUs in
  `arena-pilot.js`). Arena jumps, shoves and balance are exactly as before.
- **CPU launch per level**: `CPU_DIFFICULTY.<level>.launch` 1, 1.3, 1.6 times the
  player launch (`sim-rival.js`, `npc-route.js`). Without it Medium and Hard fall
  behind at the gentler launch and miss their win-rate bands. The CPU launch stays
  well below the old one.
- Checkpoint Rush (Timberline) Easy gate extension 10 to **12 s**: at 10 s the Easy
  crash-recovery run times out at gate 4; 11 s still fails, 12 s wins with 42 s spare
  (Claude approved: Easy must stay winnable after a crash). Shortcut presets
  regenerated (`node tools/generate-shortcut-presets.mjs`; the course data changed).
- New test `tools/test-launch.mjs` (written first; it failed on the old numbers with
  "fastest 0 to 60 is 1.075 s"): 0 to 60 through the real `_drive` step, flat road,
  full throttle, Casual gearbox, engine level 0 for stock cars and 3 for factory-maxed
  cars; checks both target ends, the acceleration order and the top speeds.

## 0 to 60 mph, seconds (flat road, full throttle, Casual gearbox)

| Car | Old | New |
|---|---|---|
| Falcone F42 | 1.77 | 3.68 |
| Stuttgart 959-S | 1.95 | 4.07 |
| Falcone Heritage | 1.77 | 3.68 |
| Aurora GTR | 1.66 | 3.46 |
| Dusthawk Rally | 1.59 | 3.32 |
| Banshee Muscle | 1.45 | 3.01 |
| Viper Prototype | 1.53 | 3.19 |
| Titan Monster | 1.69 | 3.53 |
| Koenigsegg Jesko Absolut | 1.07 | 2.45 |
| Ferrari Enzo | 1.26 | 2.63 |
| McLaren F1 | 1.30 | 2.72 |
| Bugatti Bolide | 1.06 | 2.44 |

Order, fastest first, unchanged: Bolide, Jesko, Enzo, F1, Banshee, Viper, Dusthawk,
Aurora, Titan, Falcone F42 (= Heritage), 959-S. Top speeds are untouched.

## Summit Run hillside check (decisions.md "Keep these")

Scripted run before (base) and after: a car placed on the hillside 54 m below the
Ledge (Summit Run, s 11300), full throttle, steering back toward the road; and one
35 m out at 20 mph. It still drives the hillside and gets back up onto the course
in every case; it takes about 1 to 2 s longer. The Titan 60 m out does not get back up before
or after (game over on the hillside in both), unchanged; 35 m out it does.

| Car | Start | Before | After |
|---|---|---|---|
| falcone_f42 | Ledge, 60 m out, 30 mph | back after 3.5 s | back after 4.3 s |
| falcone_f42 | Ledge, 60 m out, standing | back after 4.0 s | back after 5.6 s |
| falcone_f42 | Ledge, 35 m out, 20 mph | back after 2.7 s | back after 3.6 s |
| stuttgart_959s | Ledge, 60 m out, 30 mph | back after 3.5 s | back after 4.4 s |
| stuttgart_959s | Ledge, 60 m out, standing | back after 4.1 s | back after 5.9 s |
| stuttgart_959s | Ledge, 35 m out, 20 mph | back after 2.8 s | back after 3.8 s |
| koenigsegg_jesko | Ledge, 60 m out, 30 mph | back after 2.8 s | back after 3.5 s |
| koenigsegg_jesko | Ledge, 60 m out, standing | back after 3.1 s | back after 4.3 s |
| koenigsegg_jesko | Ledge, 35 m out, 20 mph | back after 2.2 s | back after 2.9 s |
| titan_monster | Ledge, 60 m out, 30 mph | did not return | did not return |
| titan_monster | Ledge, 60 m out, standing | did not return | did not return |
| titan_monster | Ledge, 35 m out, 20 mph | back after 2.4 s | back after 3.3 s |

## Re-recorded (reason: the launch moved every race; nothing else)

Replay fingerprints and pinned hashes, old to new (first 10 characters), 148 in all.
`tools/test-replays.mjs --record` and `tools/test-combat-replays.mjs --record` for
their own files; the rest swapped from each test's own "actual vs expected" output.
- `tools/replays/arena-fuel-run-controls.json` (3): cc93330532 -> b664ee9621; 0616b40744 -> 754ac4539f; a0bdaa4270 -> 9210ea0c5d
- `tools/replays/arena-shove-controls.json` (10): 0b436000b7 -> db1e0b0587; dabed00f98 -> 62d840f085; efbb8f2a08 -> 76efe7fecf; 40df1b0a8a -> e31302f5da; 30502a5392 -> 72f8c0563b; 6dddffd048 -> c0f570e8a3; e06a6bda32 -> e5940fbb1b; 8d9de9253e -> d792a0f568; 6c3d666730 -> fe342370c0; 81fb2cba58 -> a40e2019fa
- `tools/replays/arena-steering-controls.json` (20): 0b436000b7 -> db1e0b0587; 1342654b0b -> b826ea00c0; dabed00f98 -> 62d840f085; 20c07d53e1 -> 45162752e4; efbb8f2a08 -> 76efe7fecf; b888948e4e -> 2ecb6ce598; 40df1b0a8a -> e31302f5da; 7c5412eea5 -> c51bafbd16; 30502a5392 -> 72f8c0563b; 2304da288d -> 5ab69cda8c; 6dddffd048 -> c0f570e8a3; fb1cdde971 -> e945e937cb; e06a6bda32 -> e5940fbb1b; 5474e5b631 -> a421ace237; 8d9de9253e -> d792a0f568; b70b8790d5 -> fc9dce2348; 6c3d666730 -> fe342370c0; c13e5830e4 -> 547dcceed4; 81fb2cba58 -> a40e2019fa; 4a102b9674 -> 64c4a54236
- `tools/replays/combat-fingerprints.json` (12): 64b9997ad3 -> f521244407; 64b9997ad3 -> f521244407; 64b9997ad3 -> f521244407; f6c532d4d3 -> 359ad38a48; f6c532d4d3 -> 359ad38a48; f6c532d4d3 -> 359ad38a48; 411886f3bf -> 01062bf33d; 411886f3bf -> 01062bf33d; 411886f3bf -> 01062bf33d; 82ff15ef5a -> 16b00411a0; 82ff15ef5a -> 16b00411a0; 82ff15ef5a -> 16b00411a0
- `tools/replays/courses/ardennes-forest.json` (3): 5f4ddce78e -> b109ea49d7; 5f4ddce78e -> b109ea49d7; 5f4ddce78e -> b109ea49d7
- `tools/replays/courses/harbour-lights.json` (3): 7f6d204890 -> 4039265df7; 7f6d204890 -> 4039265df7; 7f6d204890 -> 4039265df7
- `tools/replays/courses/panorama-ridge.json` (3): 95277c25eb -> d6e8deff4b; 95277c25eb -> d6e8deff4b; 95277c25eb -> d6e8deff4b
- `tools/replays/courses/summit-run.json` (3): 29eb3db742 -> 912f7bea7f; 29eb3db742 -> 912f7bea7f; 29eb3db742 -> 912f7bea7f
- `tools/replays/courses/summit-time-attack.json` (3): e06505a8f7 -> 651215310c; e06505a8f7 -> 651215310c; e06505a8f7 -> 651215310c
- `tools/replays/courses/tremblant-snow.json` (3): 6e986962fd -> 9b7767fe8b; 6e986962fd -> 9b7767fe8b; 6e986962fd -> 9b7767fe8b
- `tools/replays/courses/tremblant-woods.json` (3): abc47f32dd -> dad12f5df4; abc47f32dd -> dad12f5df4; abc47f32dd -> dad12f5df4
- `tools/replays/expected-fingerprints.json` (48): d33ea7edbf -> 11705701cc; d33ea7edbf -> 11705701cc; d33ea7edbf -> 11705701cc; 004e2b34e6 -> 7e757aca27; 004e2b34e6 -> 7e757aca27; 004e2b34e6 -> 7e757aca27; 93e12639a9 -> b0cc148921; 93e12639a9 -> b0cc148921; 93e12639a9 -> b0cc148921; 94383d457b -> 2855f830ac; 94383d457b -> 2855f830ac; 94383d457b -> 2855f830ac; ba02ffceda -> 807034ebce; ba02ffceda -> 807034ebce; ba02ffceda -> 807034ebce; a233011d43 -> 63bbadfa36; a233011d43 -> 63bbadfa36; a233011d43 -> 63bbadfa36; 327af83fea -> 3e155f4a5d; 327af83fea -> 3e155f4a5d; 327af83fea -> 3e155f4a5d; 58535e5a13 -> 8caa0b5857; 58535e5a13 -> 8caa0b5857; 58535e5a13 -> 8caa0b5857; 664fa1f675 -> c0f199a094; 664fa1f675 -> c0f199a094; 664fa1f675 -> c0f199a094; 560f995aac -> 3bf50fe4b3; 560f995aac -> 3bf50fe4b3; 560f995aac -> 3bf50fe4b3; 4fdced0726 -> ded9069111; 4fdced0726 -> ded9069111; 4fdced0726 -> ded9069111; a3f669f8e0 -> bb20a42935; a3f669f8e0 -> bb20a42935; a3f669f8e0 -> bb20a42935; ccb07e59e4 -> 5e490d2077; ccb07e59e4 -> 5e490d2077; ccb07e59e4 -> 5e490d2077; 3cd67df9d4 -> 892eec87ec; 3cd67df9d4 -> 892eec87ec; 3cd67df9d4 -> 892eec87ec; e1cb6c6cc8 -> e6013f3b7a; e1cb6c6cc8 -> e6013f3b7a; e1cb6c6cc8 -> e6013f3b7a; 7d5e3c22c7 -> 82f1bde193; 7d5e3c22c7 -> 82f1bde193; 7d5e3c22c7 -> 82f1bde193
- `tools/replays/hidden-road-ordinary.json` (3): 6fc633efb4 -> d32a333cb2; b9a80a0d53 -> b5d9b253cd; b442df2e03 -> 2770ec858b
- `tools/replays/onfoot-hints.json` (5): c174f02745 -> ed09ad8833; c03db7495d -> 799e04e5f5; 775c511535 -> 39f4f61a74; c174f02745 -> ed09ad8833; bd67c75d3e -> df008bc641
- `tools/replays/salt-flats-controls.json` (1): b55182cbc6 -> 0a2d24ac92
- `tools/replays/titan-handling.json` (11): 4e21858b0a -> 78c0bc576a; 48e3771f58 -> a767969702; 70a0a47844 -> c174b2226e; f37807c821 -> 8b5e9f2352; 8d8ed28972 -> 08e0b04246; 9c4ae4e389 -> b5b2026a9d; 6f2922e0f7 -> 04cd5f1d86; 43e1bec178 -> 6a7d3f14bc; 4457557cc9 -> 7dd46f02a5; fbebcadee8 -> bf07e2721a; d7f483c569 -> 74b0a837c5
- `tools/replays/tyre-slip.json` (3): f6c550aada -> 2ee55acc57; 09c796063d -> a16fd545a6; 09c796063d -> a16fd545a6
- `tools/replays/warlord-format-ordinary.json` (3): 04548ba7a7 -> 86b46e2618; b080b14b58 -> 0b8de1858c; 108d30f0ed -> 4450d83345
- `tools/test-combat-projectiles.mjs` (3): 1a7f0be659 -> 78bc49b802; 1a7f0be659 -> 78bc49b802; 9453a92c42 -> d3bd8faae2
- `tools/test-race-field.mjs` (3): eb0598fddc -> b75e713ab4; e047afb2d5 -> 70733cc0ac; 60f430f2b0 -> 453ce39347
- `tools/test-tyre-slip.mjs` (2): 89f3e6debd -> a859147409; 542b283978 -> a40eba9bba

Combat replays: `staggered-cpu-attack-turns` start gaps 540/565/590 to 520/540/560 and
`expect.hits` 1 to 2 (at the stronger CPU launch the three cars drove out of range
of their turns; Claude approved). Pinned hash of `expected-fingerprints.json`
inside `salt-flats-controls.json` follows its re-record.

Lap times from the test driver (Medium, one rival), old to new, for the circuits in
`tools/test-circuit-layouts.mjs`:

| Circuit | Old laps | New laps |
|---|---|---|
| tremblant-woods | 1:24.63 1:22.08 1:22.08 | 1:30.89 1:26.17 1:26.17 |
| tremblant-woods-reverse-test | 1:26.14 1:24.01 1:23.96 | 1:33.21 1:29.29 1:29.30 |
| tremblant-snow | 1:36.98 1:34.54 1:34.54 | 1:41.59 1:37.13 1:37.13 |
| harbour-lights | 1:25.86 1:22.99 1:22.99 1:22.99 | 1:31.60 1:26.22 1:26.22 1:26.22 |
| harbour-lights-reverse-test | 1:25.58 1:22.99 1:22.99 1:22.99 | 1:30.64 1:26.13 1:26.13 1:26.13 |
| panorama-ridge | 1:34.97 1:33.21 1:33.21 | 1:41.47 1:37.62 1:37.62 |
| panorama-ridge-reverse-test | 1:34.66 1:32.95 1:32.95 | 1:39.94 1:36.99 1:36.99 |
| ardennes-forest | 2:31.92 2:29.15 | 2:41.11 2:36.24 |
| ardennes-forest-reverse-test | 2:31.86 2:29.17 | 2:40.92 2:36.38 |
| panorama-ridge-night | 1:34.97 1:33.21 1:33.21 | 1:41.47 1:37.62 1:37.62 |
| panorama-ridge-night-reverse-test | 1:34.66 1:32.95 1:32.95 | 1:39.94 1:36.99 1:36.99 |
| harbour-lights-dusk | 1:25.86 1:22.99 1:22.99 1:22.99 | 1:31.60 1:26.22 1:26.22 1:26.22 |
| harbour-lights-dusk-reverse-test | 1:25.58 1:22.99 1:22.99 1:22.99 | 1:30.64 1:26.13 1:26.13 1:26.13 |
| panorama-ridge-reverse | 1:34.76 1:32.97 1:32.98 | 1:40.78 1:36.92 1:36.92 |
| panorama-ridge-reverse-reverse-test | 1:34.66 1:32.89 1:32.89 | 1:40.78 1:36.92 1:36.92 |
| harbour-lights-reverse | 1:25.58 1:22.99 1:22.99 1:22.99 | 1:30.64 1:26.13 1:26.13 1:26.13 |
| harbour-lights-reverse-reverse-test | 1:25.58 1:22.99 1:22.99 1:22.99 | 1:30.64 1:26.13 1:26.13 1:26.13 |
| tremblant-woods-reverse | 1:23.92 1:21.71 1:21.71 | 1:29.38 1:25.56 1:25.56 |
| tremblant-woods-reverse-reverse-test | 1:23.92 1:21.71 1:21.71 | 1:29.38 1:25.56 1:25.56 |

Course replay files (`tools/replays/courses/*.json`) moved with the same hashes.
There is no committed reference-lap data to re-record (`tools/build-reference-laps.mjs`
builds it on demand).

## Changed assertions (Claude has approved each on the card)

- `test-checkpoint-rush.mjs`: Easy extension 10 to 12.
- `test-checkpoint-recovery.mjs`: seed 2009 to 2064 (the test picks the first seed in
  its range that misses exactly one gate; none in 1989-2029 does now; 2049 then 2064
  after the CPU launch moved).
- `test-circuit-layouts.mjs`: lap sanity bound 150 s to 165 s (Ardennes now 2:36 to 2:41).
- `test-race-field.mjs`: "Easy field is the slower half" to within 1 percent of the
  player (the F42 is now the slowest road car; intent unchanged: the Easy field is no
  faster than the slowest road car); launch check 3 s to 5 s run; CPU nitro push
  38.22 to 18.382 (same formula, BOOST scaled); three racecraft-off state hashes.
- `test-city-parking-gameplay.mjs`: each event driven with its required car (the
  Banshee for the Neon Drift Trial) instead of the default Falcone, which no longer
  makes Hard's 110 s limit.
- `test-drift-integration.mjs`: Medium drift credit tier 50 to 0 (score 6030 against
  a 5000 target is 1.21 times, under the 1.25 tier; Easy unchanged at 60).
- `test-prepared-surface.mjs`: nitro speed gain over 2 s greater than 45 to 22 (boost halved).
- `test-reverse.mjs`: forward pedal run 1 s to 2 s before "faster than 20 mph".
- `test-jump-height.mjs`: ramp replay 1560 to 1700 ticks (the Titan lands 1.8 s later).
- `test-offroad-physics.mjs`: Titan and Falcone reach the rock in 3 s, not 2.
- `test-crew-gear.mjs`: Cannon shove compared with the target's body on the tick
  before the hit, not its standing start (the old launch happened to cancel the gap).
- `src/test.js`: CPU-level progress measured over 20 s, not 10.
- `test-npc-route.mjs`: seed 1989 to 1990 (1989 now meets oncoming traffic on Ridge Rally, Hard).
- `test-cpu-combat.mjs`: seed 1989 to 1990 for its two-race hit means (every seed 1990-2009
  passes all three bands).
- `test-bolide-vehicle.mjs`: Bolide accel 10.5 to 9.5.

## Checks

Run once on this branch after merging `origin/integration/wasteland`
(0310e507 onward), in a Linux cloud container:

- `node tools/test-launch.mjs`: 3/3 (fails on the old numbers).
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`): 423
  suites, 401 passed, 22 failed. Of the 22: 8 fail on the untouched base too, so are not
  from this change (course-kit, earned-cars-ui, full-check, drive-through, medals,
  salt-flats-art, salt-flats; vesper-art needs a real Blender). The rest were re-recorded or fixed afterwards, and the affected suites
  were run again by name, 37/37 passing (replays, combat replays, arena pit, steering,
  shove, titan handling, tyre-slip, on-foot hints, crash switch, shortcut presets,
  board, hygiene, core, cpu-combat, race-field, checkpoint recovery, and the fingerprint
  suites). Not rerun as a whole tier (docs and re-records only since).
- Two lane failures remain by design and are listed below.
- `npm run build`: passes.
- Combat balance `node tools/combat-balance.mjs --check`, targets unchanged:
  player win rate Easy 90, Medium about 57 to 63, Hard 37 percent (bands 80-95,
  45-65, 20-40); CPU hits Easy 3.3, Medium 6, Hard 4.1 (bands 1-4, 4-9, 4-10).
  Old base: 87, 63, 27. Exits 1 on the known failure below.
- Not run here (needs a real browser or GPU): browser scenarios, frame check, look checks.

## Known failures (decisions in the card file; cards raised)

1. **Combat balance `--check` exits 1: one Hard race (seed 1993) does not complete.**
   At about 189 mph the scripted demo driver rear-ends a rival raiders had just
   slowed, is knocked 38 m off the road and is boxed in by scenery; it steers at the
   road, into the wall, for the 600 s cap. It also distorts the ufo-max/hard time
   gain (65 s). A person reverses and drives round. Other Hard seeds do the same at
   other CPU launches (1999, 2001, 2004, 2015). Claude's decision: merge with this
   written down; card **DEMO-DRIVER-UNSTUCK** fixes the driver; no seeds dropped, no
   measure changed; **the next release waits for that card.**
2. **`tools/test-drift-trial.mjs`, dev `tyre-slip` Pro recovery fixture:** the drift
   score collapses (142 against 4828) and the run times out. Released rules pass
   (152 checks). Not tuned here; card **TYRE-SLIP-DRIFT-RETUNE**.
3. **`tools/test-campaigns.mjs` shard 8/8, Hard Midnight Chase:** "remains winnable after
   three recoverable major crashes" and "within the recovery budget". Base wins at
   145.8 s against the 150 s limit with one police catch. At the gentler launch each
   crash recovers more slowly: three police catches and the limit is missed even at
   180 s (200 s wins). A design call (chase limit and catch budget), not a number I
   should slip in; see `docs/board/questions/FIX-LAUNCH.md`.

## Removed

Nothing removed. The old values (`accelScale` 5.2, `accelMphPerSec` 42) live on as the
arena values.
