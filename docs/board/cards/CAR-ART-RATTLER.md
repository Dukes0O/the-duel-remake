# CAR-ART-RATTLER

The short board entry controls current state, ownership, dependencies and locks.

Original Wasteland cars, not real makes and not copies of any film or game vehicle. Part of the car line: read `docs/UNLOCK_VEHICLES.md`, `docs/EARNED_CARS.md` and `src/vehicle-sockets.js`, and look at how `tools/blender/` builds the Titan and the thief's buggy (`scablands-vehicles.py`). This card is the model only: art rounds, no handling and no game code. Wheels, sockets and collision proportions follow the existing contract so a later card can make it drivable without changing the model. Gritty, hand-welded and believable: real proportions first, then wear. Never toy-like. At most 25,000 triangles and 8 MB, with the same limits the other drivable models keep. One sheet per round, JPG at most 500 KB, front three-quarter, rear three-quarter, side, top and beside a person: `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it. At most three rounds. Look at your own sheet and fix it before you submit: one submitted sheet is one round. Model goes to `public/assets/models/wasteland/cars/<id>.glb`. One `tools/test-blender-output.mjs` entry, `docs/changes/<card>.md` with a Removed section. No Chrome, no frame timing.

## The car
`rattler`: a chopped 1930s-style pickup hot rod, engine out in the open with stub exhausts, oversized rear tyres, a roll hoop, sand-blasted bare steel. Light, fast and loud. The kind of car a teenager builds.

## Claude answers

**Round 1: no.** It looks like a wooden toy tractor: a big square block for a cab, a flat slab roof, planks for fenders, on a dark sheet. A hot rod is all about its stance and its curves.

- **Shape:** look at a real 1930s rat-rod pickup. Low and long. A chopped curved roof with a slit windscreen. Rounded cab, not a cube. An exposed engine with real detail, in front of a narrow grille shell. Curved cycle fenders or none. A short pickup bed. Big fat rear tyres and thin front ones.
- **Material:** bare sand-blasted steel with surface rust, a little primer, real tyres from the game's own wheels. No planks, except perhaps the bed floor.
- **Sheet:** bright, subject filling the frame.

Name it `round-2.jpg` with `round-2-review.md` and remove round 1.
