# DEEP-TRAIL-JOINTS

A car far from the trail no longer jumps sideways when it crosses a joint in the trail. Card: `docs/board/cards/DEEP-TRAIL-JOINTS.md`.

## Cause

The Deep stores the car's place as two numbers: distance along the trail (`s`) and distance across it (`lateral`). The trail is a chain of straight segments, 8 m long on the Kelp Coast. The old conversion to a world point used the direction of whichever segment `s` was on. When `s` crossed a joint, the "sideways" direction turned all at once, so a car `L` metres to the side moved by about `L` times the bend angle in one frame, with no travel at all. The reverse conversion (`course.nearest`) had the same fault at the outside of a bend: the answer it gave did not land on the point it was asked about. That is the second source of the "weird course resets" Kyle saw underwater (the rock snap was the first).

## Fix

- New `src/deep/zone-frame.js`. The sideways direction now turns smoothly over 4 m either side of every joint (a smooth blend between the two segment directions), so the world point of any `(s, lateral)` is continuous. The trail line itself is not changed.
- `nearest` is now the exact opposite of `worldAt`. It finds the `s` where the world point lies straight across from the trail point, and keeps the answer nearest the car's last `s`, so the car follows one branch around the inside of a sharp bend.
- `src/deep/deep-journey.js`: the Deep's course (`zoneCourse`) uses this frame for `worldAt`, `groundAt`, `at` (heading) and `nearest`.
- `src/deep/deep-rocks.js`: `shiftCar` (the rock push-out from DEEP-ROCKS-PUSH) now asks the course for the frame place of the pushed-out point instead of walking the old frame step by step. The old walk assumed the old frame and would have drifted in a turning one. The car still moves only by the push-out distance and keeps facing the same way in the world.
- Not touched: `floor.pointAt` and `floor.frameAt` (they place the kelp, rocks, seagrass and pebbles, so changing them would move the scenery and the layout hashes), the ground height, the places, the goals, the sea life, the chart. Races and the surface course are not touched.

## Numbers

Trail of the Kelp Coast, route seed 1989: 379 segments, 76 joints with a bend over 0.1 rad, the sharpest 2.18 rad (125 degrees) and the next 0.68 rad.

- Car 35 m to the side of the sharpest bend: the old frame jumps the car 62 m in one frame at the joint. The new frame: none.
- Native drive, 30 mph, straight in the world past four bends (the three sharpest and one gentler), 35 m to each side, 8 drives of 180 steps, 20 joint crossings: the largest world step minus the car's own travel is below zero (the car slows a little inside each step), against a 5 mm allowance in the test.
- Exactness: 30,400 points around the bends (to 70 m from each joint, both sides): `worldAt(nearest(point))` returns the point within 1e-11 m in every case. The test checks 400 of them to 1e-6 m.

## Tests

In `tools/test-deep-explorer.mjs`:

- New: "driving far beside a bending trail never moves the car in the world beyond its own travel". It fails on the old frame ("joint 0, lateral -35: world step at frame 90") and passes on the new one. It also checks that the old frame would have jumped more than 20 m at those bends (so the stretch is a real test), that the drives cross at least 8 joints, that the car keeps driving, and that `nearest` undoes `worldAt` around the bends.
- Rock tests: the stand-in course in the rock test now has an exact `nearest` (identity between world and frame) instead of one that throws.

Results: `test-deep-explorer` 13/13. The other Deep suites (zone, look-zone, life, sirena, story, map, ramp) pass by hand. Lane tier (`--tier lane --changed --jobs 4`): 156 passed, 0 failed, 0 not run. `npm run build`: passed (output deleted).

## Changed assertions

One edit, in the DEEP-ROCKS-PUSH rock test of `tools/test-deep-explorer.mjs`: the stand-in course's `nearest` no longer throws "a rock never snaps the car to the course". The rock push-out now uses `nearest` on purpose, and `nearest` is now an exact inverse, so a call to it can no longer move the car anywhere but the pushed-out point. The checks that matter stay: the car moves (or the rock moves) by under 0.5 m, a pushed rock leaves the car where it is, speeds are kept, nothing is damaged. Nothing was loosened.

## Replay and signatures

No race code, surface course or scenery layout was touched. The lane tier guards (replay fingerprints, world signatures) are part of the gate below.

## Open

- Inside a sharp bend, a point farther from the trail than the bend's radius can be reached by two values of `s`. The car follows the one nearest its last `s`, so its world position stays continuous, but its `s` can change quickly there. Only the world position is used for the picture, the ground and the goals.
- The turn length (4 m each side, `RAMP`) is one number in `zone-frame.js`.
- Other Deep zones (Wreck Reef, Night Harbour) will use the same frame when they are installed.

## Removed

- The old segment-only `worldAt`, `at` heading and `nearest` of the Deep's course.
- The step-by-step frame walk in `shiftCar`.
- The throwing `nearest` in the rock test's stand-in course.

## Claude's review (27 October 2026, night)

Cause right and measured (a 62 m one-frame jump 35 m out at the 125 degree bend). The frame turns smoothly over 4 m at each joint and nearest is the exact inverse of worldAt; scenery placement untouched; races untouched, guards passed. Changed assertion approved: the rock test's throwing nearest becomes an exact identity, because the push-out now uses nearest by design and nearest can only return the pushed point; the jump, speed and no-damage bounds stay. Verdict: merge and release.
