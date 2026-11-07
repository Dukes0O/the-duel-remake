# CAR-ART-LONGHAUL

The short board entry controls current state, ownership, dependencies and locks.

Original Wasteland cars, not real makes and not copies of any film or game vehicle. Part of the car line: read `docs/UNLOCK_VEHICLES.md`, `docs/EARNED_CARS.md` and `src/vehicle-sockets.js`, and look at how `tools/blender/` builds the Titan and the thief's buggy (`scablands-vehicles.py`). This card is the model only: art rounds, no handling and no game code. Wheels, sockets and collision proportions follow the existing contract so a later card can make it drivable without changing the model. Gritty, hand-welded and believable: real proportions first, then wear. Never toy-like. At most 25,000 triangles and 8 MB, with the same limits the other drivable models keep. One sheet per round, JPG at most 500 KB, front three-quarter, rear three-quarter, side, top and beside a person: `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it. At most six rounds. Look at your own sheet and fix it before you submit: one submitted sheet is one round. Model goes to `public/assets/models/wasteland/cars/<id>.glb`. One `tools/test-blender-output.mjs` entry, `docs/changes/<card>.md` with a Removed section. No Chrome, no frame timing.

## The car
`longhaul`: a six-wheeled desert truck, cab forward, big fuel tanks either side, a tool rack and spare wheels, a bull bar. Slow, heavy and hard to stop.

## Claude answers

Round 5 of 6 (Kyle's limit is six). Merged as the working model: a believable, gritty six-wheel recovery truck, with its paint, cab, tanks and rear load right. Still short of the photo: the bull bar is square rather than tubular, the tread is a little spiky and the boom is slender. Not yet wired into the game.
