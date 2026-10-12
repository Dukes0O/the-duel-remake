---
task: DEEP-WATER
status: ready-to-merge
kind: look
flag: the-deep
player_facing: false
---

# DEEP-WATER: the water look for any zone

## What changed

- `src/deep/zone-floor.js` (new): the sea floor of any zone worked out from
  its trail (THE_DEEP 10.1). The drivable width lies exactly at the trail's
  depth (`trailHeight` for the driving code); outside it come sand swells,
  rocky lumps and banks that rise at most 55% of the depth, so the channel
  never meets the surface in a flat shelf. Kelp, seagrass, rocks and pebbles
  grow where the trail's optional `kelp`, `grass` and `rock` ask, never on
  the drivable width, repeatable from the zone id, capped per zone.
- `src/deep/underwater-scene.js` (new): `createUnderwaterScene({zone,
  quality, renderer, scene})` returns `{group, update({car, camera,
  seconds}), attachCar(object), dispose()}`. It wraps the approved look
  (light, fog, colour with depth, shafts, surface, marine snow), builds the
  ground in 48 m tiles near the camera (two per frame, primed at the start),
  scales the crops to the zone, tints the water olive under kelp, and dresses
  a car (caustics, contact shadow, headlights below 16 m). Nothing touches
  race state.
- `src/deep/waterline.js` (new): the descent overlay. The waterline slides up
  the screen as the view sinks, with a bright wobbling edge, and a burst of
  bubbles when the camera goes through. DEEP-ZONE draws it during the
  descent in the circuit's scene.
- `src/deep/sea-floor.js`, `src/deep/kelp.js`: builders accept ready
  `placements`; the floor grid is shared by the look test's single mesh and
  the zone tiles (`createFloorTiles`).
- `tools/deep-zone-look.js`, `tools/fixtures/deep-sample-zone.js`, and
  `tools/deep-look.html?zone=sample`: a 2.1 km sample loop photographed
  through the scene hook. `tools/scenarios/deep-look.mjs` takes
  `DEEP_LOOK_ZONE=sample`.
- THE_DEEP 10.1 contract (merged earlier): the scene hook takes the renderer,
  scene and camera; trail points may carry `kelp`, `grass`, `rock`.

## Evidence

- `node tools/test-deep-water.mjs`: 439 checks, under 1 s. The approved look
  test is byte for byte unchanged (floor mesh and all four placement hashes).
- Picture round one on the sample loop (High): shallows, kelp forest with
  the trail clear between stands, canopy, the deep stretch with headlights,
  across the channel. Claude's verdict: lighting 4, road readability 3.5,
  grounding 3.5, consistency 3, one fault: banks met the surface as a flat
  shelf, a hard line in the distance. Fixed with the 55% bank rule.
- Round two, same six views: the seam is gone and the far banks read as
  soft dunes. Verdict: lighting 4, road readability 3.5, grounding 3.5,
  consistency 4. Accepted for this card; zone-specific polish belongs to
  FINISH-DEEP. Sheet sent to Kyle; raw captures deleted, verdict kept here.
- No frame check: nothing is reachable yet (rule 9); FINISH-DEEP measures.

## Review

One ordinary review, changes needed, all applied:

- The look now restores the scene's background, environment and its
  intensity on dispose, so the circuit's sky comes back on surfacing.
- `attachCar` dresses the car in copies of its materials and gives back the
  originals and shadow flags on dispose; a second attach is ignored.
- Sideways offsets are positive to the left as in the game (+x heading +z);
  outside a bend the distance is the true distance, so banks do not step.
- Floor tiles build a few rows a frame inside a 2 ms budget instead of two
  whole tiles (median 6 ms, worst 22 ms before), and tiles far behind are
  freed. Kelp, seagrass, rock and pebble dispose free their instanced
  meshes. Per-frame allocations in `update` and the waterline removed.
- Contract 10.1 now names `attachCar` and the waterline overlay.

## Behavior and test changes

No existing assertion changed. New suite `tools/test-deep-water.mjs`. One of
its own checks changed during review: "kelp only where the trail asks" now
means kelp amount above zero (`!(at.kelp > 0)`) instead of under 0.05,
matching the density rule, which allows any amount above zero; one stem in
1,200 sat at 0.009.

## Removed

Nothing replaced. The look test page keeps its own fixed stretch.
