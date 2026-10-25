# LAB-FAN

## Design

Build once after all five tunnel lessons and REVERSE, for 15,000 credits. `buildFan` returns one new profile with only credits and `unlockedCars` changed. The shop uses the same function. Existing ownership, upgrades, records, unknown fields and older saves are preserved. Lab off and future Lab versions refuse writes.

The electric, single-gear car weighs 1,000 kg. Final base values: 190 mph, acceleration 9, grip 1 plus constant fan grip 1, braking 2.2. It arrives factory-maxed so later engine upgrades cannot exceed FIX-LAUNCH: native 0–60 is 2.400 s, versus Bolide 2.442 and Jesko 2.450. Its delivered top speed is 209.95 mph, below Enzo 217.685, F1 240.006 and Jesko 329.29. No other car's numbers change. Piston engine curves do not act on this electric car.

Fan grip uses LAB-TUNE's existing `tunedGrip` hook, with a constant term enabled by `lab`. No terrain, hillside, jump or Titan rules change. No fuel or wing setting is offered, saved by setTune, or applied from a forged tune. The supplied Speirling loader is registered, lazy, and retryable; loading failure never creates a substitute body.

Narrow integration plumbing follows Kyle's explicit requirements to register the loader and provide no wing/fuel settings: vehicle-assets and vehicle-sockets (new model only), earned-cars-ui (secret remains absent pending LAB-FAN-VIEW), lab-save/tune-view (setting guards), lab-shop (one atomic purchase). REVERSE animation, blueprint and build-screen wiring remain LAB-FAN-VIEW's work.

Checks chosen before code: fan rules and native driving, roster/switch isolation, lane tier --changed --jobs 4, build, combat-balance --check. Eight-car busy-view frames are a pre-release check.

## Changed assertions

These additions need Claude's written review on the card before merge. No earlier car, target band, replay pin or world signature is loosened.

- `test-vehicle-assets`: roster 13 → 14. The synchronous-model loops keep every earlier car; the new asynchronous GLB is tested in `test-lab-fan` for actual model, wheels, sockets, coalesced loads, failure and retry.
- `test-progression`: roster formula adds the Lab-built car (+1); starter ownership, six shop prices and all upgrade checks remain.
- `test-earned-cars-ui`: real and mocked inventories include the fan in AIR_ONLY_CARS; both secret cars stay absent from generic menu inventories pending their view cards. Earlier medal switch-off inventories stay exact.
- `test-course-eligibility` and `test-medals`: the list of cars earned through normal progression excludes the separately Lab-built car. No prior ownership expectation changes.
- `test-heli-cable`: adds 1,000 kg / lifts true for the new car. Every earlier mass and lift result stays exact.
- `test-combat-armor`: adds 83.04547985373998 armor for the new mass under the unchanged formula. Both clamps and all earlier values stay exact.
- `test-lab-rules`: replaces the old shop-only `lab.owned.speirling` marker with actual `unlockedCars` ownership, and adds repeat-purchase identity protection. Building changes only credits and the car list.
- `test-engine-curve`: the piston-engine fitting and manual-shift inventory remains all petrol cars. New fan tests prove the electric single gear has the same launch with engine-curve on and off, and no fuel or wing tuning.
- `test-sirena-car`: its historical pre-Sirena roster comparison excludes the later fan; Sirena stays last in its own era. Existing car data remain compared exactly; `test-lab-fan` separately compares all 13 earlier cars with d5ba2d27.
- `test-vehicle-grounding`: all earlier cars retain 5 cm clearance. Only the new fan skirt uses positive clearance, matching the already accepted LAB-FAN-ART model and `test-speirling-vehicle` (positive and below 6 cm). The body is never raised or geometry changed.
- `test-vehicle-paint` and `audit-vehicle-grounding`: preload the actual fan GLB in Node, as with the existing licensed model. Every paint, damage and wheel-grounding check now also receives the new car.

`feature-flags.js` and its switch-count assertions are unchanged: this car uses the existing dev `lab` switch.

## Results and review

- `test-lab-fan`: pass (all 32 lesson subsets, reverse gate, exact price edge, one debit including shop/reload, malformed wallet refusal, old/future saves, setting guards, constant grip at 10 and 100 km/h, earlier-car data and seeded state equality, 2.400 s launch, best braking, actual model and retry).
- Independent save/code review: no runtime or save-loss fault. Reviewer confirmed unchanged earlier-car arithmetic and terrain rules. Its stale AIR_ONLY assertion finding was fixed.
- Reviewer checks: 21 historical and 1 forged save fixture, 954 checks pass; storage budget 3.61/4 MB; police fines 225 checks pass; backup migration/quota checks pass. All memory-only.
- Build: pass (`npm.cmd run build`; PowerShell blocks npm.ps1; Vite's shared node_modules temp file needed sandbox escalation). Existing chunk-size/dynamic-import notices only.
- Lane: 130/133 passed, 3 infrastructure failures, zero not run (465.86 s, jobs 4). The three unchanged suites then passed 3/3, jobs 1: drive-through used Windows System32 tar instead of Git tar (which treated C: as a remote host); Blackiron and Tollkeeper needed sandbox access to the installed ffmpeg. No test code or assertion changed for those retries. Initial lane attempts found the missing headless GLB preload and the accepted low skirt; corrected as described above.
- Replay guards: 225 race checks across 25 cases, and 12 combat checks across four encounters pass with unchanged fingerprints. World composition: 47 exact checks across twenty events pass.
- Combat balance --check: pass, 90 baseline races and 51 policy runs (429.22 s). Wins Easy/Medium/Hard 27/17/11 of 30; CPU-hit means 3.27/5.97/4.07, all within unchanged targets.
- Browser and frame checks: not run. The secret UI is a separate card; eight-car frames remain required before live release. No real saves or live game accessed.

## Before release

Claude still needs to write the assertion review on LAB-FAN. Eight-car frames wait until player access is wired. The full tier was not run. A known separate asset gap must be closed first: `public/assets/models/wasteland/kits/mcmurtry_speirling.glb` does not exist. `armor-kit-meshes.js` requests it, and the full-only `test-armor-kit-assets` expects a fitted kit for every car. Independent review classified this as a Director-owned pre-release follow-up, outside LAB-FAN's owned files. Its test is unchanged; no substitute asset was made.

## Removed

Replaced the shop-only fan ownership path with the atomic credit-and-car transition. No asset or earlier behavior removed. No replay fingerprints regenerated.
