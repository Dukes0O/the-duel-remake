# DEEP-ROCKS-PUSH

Seabed rocks no longer stop the car or reset it. Small rocks bounce the car off. Large rocks slide away under the push. Card: `docs/board/cards/DEEP-ROCKS-PUSH.md`.

## Cause

`stopAtDeepRock` set the speed to zero on any rock touch. It then moved the car to `course.nearest(...)` of the contact point. The Deep's course is a chain of 8 m trail segments, and on the open sea floor the nearest trail point can be a joint between two segments. The car's place is stored as distance along the trail plus a sideways offset, and at a joint that pair does not describe the contact point any more. The car jumped to somewhere else: Kyle's "weird course reset".

## What was built

- `src/deep/deep-rocks.js`
  - `driveIntoDeepRocks(duel, start, dt)` replaces `stopAtDeepRock`. It looks at every rock the drive step ran into (up to four per step).
  - Small rock, or a rock that cannot be pushed: the car steps out along the contact normal by the overlap plus 3 cm. The part of the speed pointing into the rock is taken away, but never more than 30% of the speed the touch began with. The car swings round toward the way it now slides, at most 9 rad/s, so the view does not snap.
  - Large rock: the car is not moved. The rock slides away along the contact normal by the overlap plus 3 cm and comes to rest on the floor at its new place, at its own height above the floor (`floorHeight + size * 0.12`). The car's speed is held to a share of the speed the touch began with. The share is 85% for a rock just over the line and 50% for the biggest rock. The speed never drops below 6 mph, so the car can always drive on.
  - The car is moved only by the push-out. A small helper turns a world step into the car's two numbers (`state.s`, `state.lateral`) by walking the trail frame. It never calls `course.nearest`, so there is no snap. The car keeps facing the same way in the world.
  - A touch is one "episode": speeds are measured against the speed when the touch began and the episode ends after 0.15 s with no contact. This stops the loss from compounding frame after frame at 120 Hz.
  - No damage, no wreck, no scrape sound, no race contact event: the function touches only `s`, `lateral`, `headingError`, `speedMph` and the rocks.
  - `deepRocks(zone, floor)` now also marks each rock `pushable`. `deepGoalPoints(zone)` lists everything the player looks for.
- `src/deep/deep-journey.js`: the call site, and the run's rocks are rebuilt from the zone seed when the dive starts (the moment the zone course takes over), so each dive begins with the seed layout. `initializeDeepJourney` no longer builds them early.
- `src/deep/sea-floor.js`: `createRocks` keeps where each instance lives and gets `follow(runRocks)`. It compares each rock with what is drawn and rewrites only the instances that moved. It returns how many moved.
- `src/deep/underwater-scene.js`, `src/deep/deep-ui.js`: the view hands the run's rocks to the scene each frame; the scene calls `follow`. The scene still builds its first picture from the seed, so the drawing is right before anything moves.

## Size line

Small is a rock size under 1.0 (radius in metres, about 1.8 m across). In the real layout the sizes run from 0.35 to 2.95 with a median of about 0.9, so the line leaves about 51% of the 420 rocks small (211 to 216 on the three routes) and the rest large. The largest sizes are about 2.9 m radius.

## What rides on rocks

Nothing is tied to a rock object. Pearls, sea life spots, Sirena finds and the chart cells are laid out from the trail (trail point plus a sideways offset, or the trail's own look numbers), never from `rockPlacements`. The "on a rock at the lip" pearl is only a description of rocky ground. Rocks are never placed on the drivable width, and I checked the real layout: on all three routes no rock comes within 2 m of any of the 16 goal points. Hints are on the surface, not in the Deep.

To keep it that way, `deepRocks` makes any rock that lies within its size plus 2 m of a goal a bounce rock, whatever its size. It can never be slid over a goal. A test builds such a rock and checks it. A pushed large rock moves only because the car is pushing it, and the car can push it away again, so a goal stays reachable.

## Tests and results

New or replaced tests in existing files (no new test machinery):

- `tools/test-deep-explorer.mjs`
  - Every one of 420 rocks on three routes: forward, reverse and overlap contact still work. A realistic 0.25 m drive step ending 0.15 m inside each rock keeps the car rolling (at least half speed, never zero), never calls `course.nearest`, and moves the car or the rock by under 0.5 m. A small rock keeps at least 70% of 60 mph and stays put. A large rock slides by the overlap, rests on the floor, and the car keeps exactly the pushing share of its speed.
  - Native drives in the real dive on a nearly straight stretch: a glance at a small rock keeps at least 69% of speed, the rock stays put and the car drives on; a large rock slides more than 1 m ahead of the car, the car never falls under 6 mph and keeps travelling; no step jumps more than the allowed amount; no crash, scrape, roadside, boundary or recovery event; no damage or health change.
  - Rock places repeat exactly from the same inputs, a new dive starts from the seed layout and rock places are not in the race state.
  - Goals: none lies near a rock, and a rock lying on a goal is the bounce kind.
- `tools/test-deep-look-zone.mjs`: `follow` redraws only the moved instances, puts them in the right place, leaves other meshes alone and ignores a different layout.

Results: `test-deep-explorer` 12/12, `test-deep-look-zone` 451 checks. Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4`): 157 passed, 0 failed, 0 not run. `npm run build`: passed (build output deleted afterwards). The other `test-deep-*` suites I ran by hand (look, zone, life, sirena, story, map, log) also pass.

## Changed assertions

In `tools/test-deep-explorer.mjs`, the test "every placed rock is solid: forward, reverse, tunnelling and overlap; contacts cannot damage the car" is replaced, as it pinned the old stop-dead behaviour. Removed assertions:

- `stopAtDeepRock` leaves `speedMph` at exactly 0 (for every rock).
- a native drive at 60 mph ends with `speedMph` 0 and `state.s` short of the rock centre.

Kept: contact in both directions, overlap, the kelp-has-no-solids check, no damage, no wreck. Nothing was loosened: the rule changed (Kyle, 27 October 2026), and the new tests check the new rule more closely (speed kept, rock moved, no snap).

## Replay and signatures

No race code was touched. The Deep is not a race, so replay fingerprints and world signatures are untouched; the lane tier guards confirm it (below).

## Open

- Rocks do not push each other. A pushed large rock can slide through another rock; the next touch deals with that one on its own.
- A large rock pushed to the edge of the sea floor's ground stops moving and bounces the car instead.
- Head-on into a small rock the car pivots for about a fifth of a second before it slides on. If it feels abrupt, the turn rate `TURN_RATE` is one number.
- No frame check was run (no new drawing cost beyond moved instances).

## Removed

- `stopAtDeepRock` (stop dead and snap to the nearest trail point).
- The two stop-dead assertions listed above.
- The early rock layout in `initializeDeepJourney` (now built when the dive starts).

## Claude's review (27 October 2026, night)

Matches the card: no snap (course.nearest never called, test enforces it), small bounce keeps 70% or more, large rocks slide and settle, no damage or race event, rebuilt each dive, goals safe (none within 2 m of a rock, and a safety net keeps such rocks fixed). Changed assertions approved: the two removed speed-zero assertions pinned the stop-dead behaviour Kyle asked to remove; the new tests check the new rule. Verdict: merge. Follow-up: DEEP-TRAIL-JOINTS (a car far beside the trail jumps at the 8 m segment joints; may be part of the resets Kyle saw).
