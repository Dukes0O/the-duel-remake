---
task: SKYLINE-FULL-GAME
status: ready-for-review
kind: release-fix
flag: nissan-skyline (already on)
player_facing: yes (the Skyline's Wasteland armor kit)
---

# The Skyline in the full game (30 October 2026)

Branch `claude/skyline-integration`, started from `ce15e4c6` (the Kogane release switch-on). Nothing is merged, pushed
or released here, and no frame timing was run.

Until the Kogane release the full test tier ran with the Skyline switched off, so every suite outside the race game
never saw the car. With the switch on, 22 suites failed. This note says, for each, whether the game was missing
something or the test was counting the old state.

## Real gaps in the game (fixed)

1. **No Wasteland armor kit for the Skyline.** Every other car has a fitted Scrapper, Raider and Warlord kit in
   `public/assets/models/wasteland/kits/<car>.glb`. The Skyline had none, so a Skyline in Wasteland armor would have had
   nothing to show. Built with the existing recipe, not by hand:
   `blender -b --python tools/blender/armor-kits.py -- --root <repo> --cars nissan_skyline_gtr_r34`
   - New file `public/assets/models/wasteland/kits/nissan_skyline_gtr_r34.glb` (854 KB, 7,749 triangles, same node names
     and painted UVs as the other kits). The other fourteen kits are untouched.
   - `tools/blender/armor-kits.py`: `nissan_skyline_gtr_r34` added last in `SIZES` (1.96 x 4.60 x 1.36, the model's own
     size; last so no other car's plates move). The shell skin is cut from the Skyline's own model file, whose body is the
     `skyline_paint` material (the one-line change to the material name test). Three small rules in `CAR_RULES`, each for
     a measured fault in the first build:
     - `ground_y: 0.0`. The Skyline's model file hangs 0.125 m above its own ground (its wheels are built in code), and the
       recipe measured the shell from the lowest point, so the Warlord shell sat 12.5 cm too low and 1,637 of its points
       lay inside the tyres. Measured from the ground, 48 points touch the tyre outline, at most 7 mm deep, which is the
       bare body's own wheel-arch edge.
     - `raider_doors`: the rear Raider door sheet started inside the rear wheel (two points, 67 mm deep). It now starts
       ahead of the wheel.
     - `shell_ratio` stays at the normal .36; it is listed only so the rule table shows the Skyline was checked.
   - Fit measured with vertex tests against the Skyline's real wheel discs and glass (scratch script in the lane's
     `.qa-dist`, not kept): Scrapper and Raider have no point in a wheel and are 17 mm and 15 mm from the glass; the
     Warlord shell is 9 mm from the glass. Not looked at in the game: the look check belongs to Claude.
   - `tools/test-blender-output.mjs`: the kit script's list of runtime files gains the Skyline's kit.
2. **Fixtures that build every car never built the Skyline.** The Skyline is loaded from a model file, like the
   Speirling, and the shared test fixtures only supplied the Speirling's. `tools/audit-vehicle-grounding.mjs` (shared by
   test-vehicle-grounding, test-vehicle-sockets, test-vehicle-crush-graphics, test-muddy-hollow-scene, test-armor-kit-fit
   and the armor-kit audit) and `tools/test-vehicle-paint.mjs` now also load the Skyline's model file. After this the
   grounding, socket, crush and paint suites check the Skyline with every other car (8,203 grounding checks across 15
   models, 3,502 paint checks across 15 cars).
3. **Pilot map: Kogane Pass was on the map exactly once, and the test counted the wrong list.** The brief expected it
   twice; it is neither. Kogane Pass reaches the map through the `DEV_PLACES` list (the way Summit Run once did), so it
   is in the pilot's map once, and the test, which counted only `PLACES`, found it zero times. No game code is wrong, and
   moving the place into `PLACES` was left alone on purpose: it would change the logbook's "visited every place" rule
   (`LOGBOOK_PLACES`), the leg table and the generated outlines, all for a saved-progress rule. See the changed
   assertion below; the check now counts over both lists, so a second copy of Kogane Pass would fail it.

## Already right in the game (no change)

- Helicopter weight: the Skyline's `mass: 1560` in `src/config.js` is what `carMassKg` reads, so the helicopter already
  has it. At 1,560 kg it is over the 1,500 kg hook, so `liftCheck` says "Needs the Lab's lift upgrade", exactly as the
  car's design note (docs/cars/nissan-skyline-gtr-r34.md 2.4) says. Only the test's table lacked the car.
- Combat armor: `maxArmorForMass(1560)` is 103.72 (100 x square root of 1560 / 1450). Only the test's table lacked it.
- Sockets, paint, sound, engine curve, garage, earned-cars list, race field, menu: already wired (grep of `src`).

## Not fixed

- **`tools/test-storage-budget.mjs` still fails: the modeled origin is 4,053,224 bytes, over the 4,000,000 budget by
  53,224.** Nothing was raised. What grew since the last green run (measured by rebuilding the model without each
  addition):
  - before the Kogane release: 3,984,026 bytes (15,974 under);
  - the three Kogane record events (Kogane Pass, Night, Reverse; 72 more leaderboard rows across the modeled eight
    players, 864 bytes each): +63,312;
  - the Skyline (one more car in each modeled profile's upgrades, paints and armor kits): +5,886.
  I looked for an honest saving and found none that does not change saved-data shape or the model:
  a leaderboard row carries its seven upgrade levels, a long event key and the player's name; the shipped code still
  reads the old shared profile and best-times keys, so the model's "old keys can coexist" part is real. Options for
  Claude, none taken: (a) the model is eight full players, each about 163 KB across profile and leaderboard, so a
  seven-player model passes with room, but that is a change to the planning scenario, not a saving; (b) trim the stored
  leaderboard row (for example, drop the all-zero upgrades object), which is a save-shape change and needs the save
  checker and Kyle; The rest of that test (which runs only after this line) has not run on the released code.

## Changed assertions

None is loosened; each moves because the Skyline or the Kogane courses are now in the released game. Every "absent or
off" case that can still be tested is kept, and says how.

| File and line | What changed | Why it is not loosened |
| --- | --- | --- |
| `tools/test-vehicle-assets.mjs:20` | car count 14 becomes 15 (name adds the Skyline) | the roster has one more car |
| `tools/test-vehicle-assets.mjs:23, 55` | the "ready at once" and "usable after a failed licensed import" loops also skip the Skyline | it loads its own model file like the Speirling (already skipped); `test-skyline-vehicle` covers its routing, load, failure and retry |
| `tools/test-combat-armor.mjs:98` | new row `nissan_skyline_gtr_r34: 103.72377109252812` | a new row for a new car, equal to 100 x square root of (1560 / 1450); the other rows and the clamps are unchanged |
| `tools/test-heli-cable.mjs:52, 61` | table row `[1560, false]`; new check that the Skyline's refusal names the Lab | a new row and a new check; the "every car has a helicopter mass" check is unchanged |
| `tools/test-arena-shove.mjs:201-206, 230-231` and `tools/test-arena-junk-shove.mjs:314-320` | every historical car group (released nine, Enzo, F1, Bolide, Sirena, Speirling) now also leaves the Skyline out, so each old fingerprint is checked against exactly the cars it was recorded with; a new "with the Skyline" group uses all fifteen cars | the old pins are untouched and still compare equal; the new pin is added, not substituted |
| `tools/replays/arena-shove-controls.json:35` | new key `solverFingerprintWithSkyline` (`f325e0f6...`) | a new pin; both suites compute the same value for all fifteen cars |
| `tools/test-titan-handling.mjs` via `tools/replays/titan-handling.json:7,21` | new fingerprint for the Skyline; the description names it | the file was re-recorded with `--record` and the diff shows only that one added line and the description; every earlier car's fingerprint is byte-identical |
| `tools/test-lab-fan.mjs:136-137` | "every earlier car has the exact same data" leaves the Skyline out of the compared set | it compares fourteen cars with the old snapshot as before; the Skyline did not exist at that snapshot, and `test-skyline-handling` holds its numbers |
| `tools/test-sirena-car.mjs:25, 64` | the "no other car changes" list and the "Sirena last" check leave the Skyline out, as they already do for the Speirling | same reason; every car in the comparison is still compared exactly |
| `tools/test-course-eligibility.mjs:45-48` | the "maxing the fleet earns every ownable car" list leaves the Skyline out; new check that maxing the fleet does not earn the Skyline | the Skyline is won only from the Kogane story; the new check is the opposite case, tested |
| `tools/test-course-eligibility.mjs:89`, `tools/test-driver-ui.mjs:54` | the stand-in menu page gains two empty functions (`insertAdjacentHTML`, `addEventListener`) | the released menu adds the Story button to the page; a stand-in without those two functions cannot take it. No assertion changed |
| `tools/test-pilot-map.mjs:60-76` | "each course is on the map once" counts over `PLACES` plus `DEV_PLACES`; the "places with more than one course" list counts over both and gains Kogane Pass with its Night and Reverse | still exactly one holder per course (a duplicate would fail); the list gains an entry |
| `tools/test-skyline-vehicle.mjs:166-183` | "dev car is unavailable in release" becomes "the released car is available in the ordinary release"; the off case is kept by forcing the switch off (`overrides`); the on cases use the ordinary flags instead of a preview address | both the on and off states are still tested |
| `tools/test-story-save.mjs:3-4, 129-143` | no preview flag asked for; the "switch off" run in a second process becomes two cases in the same process: the car in the build (grant works) and the car taken out of the car table for a moment (grant refuses, saved id dropped), restored in a `finally` | the refuse and drop cases are kept; the on case now needs no flag |
| `tools/test-story-ui.mjs:5-8, 76-78, 338-340, 440` | "the switch starts as dev and is off" becomes "on, and a forced-off switch still hides it"; the Skyline checks run in the same process instead of a second `--preview` process | the "switch off, nothing shows" section (uses a stand-in with no switches) and the forced-off check keep the off state tested |

## Tests

All from PowerShell in the lane folder, memory-only saves, no frame timing, `--jobs 4` or fewer.

By hand, each passing: test-vehicle-paint, test-vehicle-grounding, test-vehicle-sockets, test-vehicle-crush-graphics,
test-muddy-hollow-scene, test-vehicle-assets, test-armor-kit-assets, test-armor-kit-fit, test-armor-kit-authored,
test-armor-kits, test-combat-armor, test-heli-cable, test-arena-shove (133 checks), test-arena-junk-shove (78 checks),
test-titan-handling (52), test-lab-fan, test-sirena-car, test-course-eligibility (5,287), test-driver-ui (65),
test-pilot-map (316), test-story-save (68), test-story-ui (242), test-skyline-vehicle (330).

Failing: test-storage-budget (see Not fixed).

Lane tier (
ode tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going, run from PowerShell) on the final test commit: 67 passed, 0 failed, 0 not run. 
pm run build: built. The full tier was not rerun here.

## Removed

- The second-process "preview roster" runs in `tools/test-story-ui.mjs` (`--preview`) and in `tools/test-story-save.mjs`
  (the `spawnSync` run), with their imports: the Skyline is in the ordinary roster, so they ran the same thing twice.
- The two-line preview address block in each of those suites (`__DUEL_QA__`, `?flags=nissan-skyline`).
- Nothing else; no old model or kit is replaced.
