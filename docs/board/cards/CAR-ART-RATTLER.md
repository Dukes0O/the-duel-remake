# CAR-ART-RATTLER

The short board entry controls current state, ownership, dependencies and locks.

Original Wasteland cars, not real makes and not copies of any film or game vehicle. Part of the car line: read `docs/UNLOCK_VEHICLES.md`, `docs/EARNED_CARS.md` and `src/vehicle-sockets.js`, and look at how `tools/blender/` builds the Titan and the thief's buggy (`scablands-vehicles.py`). This card is the model only: art rounds, no handling and no game code. Wheels, sockets and collision proportions follow the existing contract so a later card can make it drivable without changing the model. Gritty, hand-welded and believable: real proportions first, then wear. Never toy-like. At most 25,000 triangles and 8 MB, with the same limits the other drivable models keep. One sheet per round, JPG at most 500 KB, front three-quarter, rear three-quarter, side, top and beside a person: `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it. At most three rounds. Look at your own sheet and fix it before you submit: one submitted sheet is one round. Model goes to `public/assets/models/wasteland/cars/<id>.glb`. One `tools/test-blender-output.mjs` entry, `docs/changes/<card>.md` with a Removed section. No Chrome, no frame timing.

## The car
`rattler`: a chopped 1930s-style pickup hot rod, engine out in the open with stub exhausts, oversized rear tyres, a roll hoop, sand-blasted bare steel. Light, fast and loud. The kind of car a teenager builds.

## Claude answers

Round 6 of 6 (Kyle's limit, 5 November): **failed, not merged.** Rounds 5 and 6 gave an egg-shaped cab; round 4 had the better stance and engine. The cab is the fault: the Falcone cut-out trial fell apart and was dropped. Branch `codex/car-art-rattler` holds the recipe and rounds 4 to 6. Waits with the town trucks for the photo-to-model decision on TOWN-ART-TRUCKS-1.

Kyle, 6 November: one more try with the photo kit (`tools/blender/photo_model.py`), past the six rounds. Claude judges `round-7.jpg`.

Kyle, 6 November: one more try with the photo kit (`tools/blender/photo_model.py`), past the six rounds. Claude judges `round-7.jpg`.
