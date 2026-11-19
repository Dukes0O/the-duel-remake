# TOWN-VEHICLES

**What changed.** The fire truck, flatbed, supply truck, water tanker and tow rig can be driven in a World Job that names one (`job.vehicle`), only while `wasteland-town` is on. They are rows in `src/town/content/work-vehicles.js`, shaped as MACHINE-CORE machines, with real masses, engines and tanks (sources on the file) and wheelbases measured from `trucks-1.glb`. `src/town/work-vehicles.js` turns a row and its load into what driving reads: pull from power over mass, a lower top speed and longer stop when loaded, and steering held to each truck's real turning circle. It also gives the haul and fire jobs their sums (load, unload, fill, pump at 1,000 litres a minute). Hooks: two reads in `src/game.js` (the `car` getter and `_vehicleSpec`), and three in `src/arena/modes/world-job.js`. Space rings the fire truck's bell (event `townBell`, sound cue `town.bell`) and never fires nitro; while a line waits for the player, Space moves it on instead.

**Checks**, on `9fbd37436` with `integration/wasteland` (`00382d70b`) in: `node --test tools/test-town-vehicles.mjs` 9 of 9 (drives, stops, turns from one 8 m road into another, no tighter than its circle, weight felt, bell, repeatable). Lane tier (`--changed --jobs 4`): 62 of 62 passed, among them `test-replays`, `test-world-composition`, `test-everburn-job1` and `test-world-job-mode`; five long suites were left to the night as the tier prints them. `npm run build`: passed. One independent review: a crash on an unregistered audio cue, Space skipping lines, and a steering check that could not fail were real and are cured; a gamepad value equal to the scaled one is accepted as rare.

**Fingerprints.** No replay fingerprint or world signature moved (the lane's replay and world-signature guards). A job without `vehicle` reads the garage car exactly as before.

**Changed assertions:** none.

**Removed:** nothing; no older job or screen is replaced. Not on this card: the truck's picture (the renderer draws only `CARS` models), its engine sound, and the bell's bank row (TOWN-FIRE-JOB names `town.bell`).
