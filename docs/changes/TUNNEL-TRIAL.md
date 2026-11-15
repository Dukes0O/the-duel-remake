# TUNNEL-TRIAL

The Scablands now has floor selection for the river beds under both decks. Cars, people, job raiders and Big Bess use their feet to select a floor, and deck roofs and height-limited solids keep actors on their own level. The drawn bed is open under the bridge and Pipe. The `wasteland-town` switch still controls the trial bore. The 100 m west-scarp trial has a flat floor, side walls, crown, closed cutting faces and checked joints; a grid limits segment lookup. Nothing is saved by the trial. The scene follows tunnel revisions, cuts only the mouths and grows the lining. The camera is constrained to the car's floor. No new game event or sound cue was added.

The browser scenario uses the game scene and tunnel API, memory-only storage and Performance quality. It grows the bore in 20 steps and requests the mouth, inside, above, chase and deck views and drives. The halfway view shows the closed cutting face; there is no machine cylinder yet. Claude drove both tunnel directions successfully and saw the bore, mouths and open decks in the revised pictures.

Big Bess's position check failed because the trial treated every actor height as an absolute floor. Integration uses an offset for actors without a selected floor. The scene now uses the selected height after a mover marks it, and otherwise retains the previous offset. The existing assertion is unchanged and a new check covers a selected floor.

## Shared build merge

Merged `integration/wasteland` into this lane. Conflicts were settled as follows:

- `course.js`: kept both tunnel revisions and the realism objects' shared solid grid.
- `game.js`: passed both feature switches when creating an arena course.
- `scablands-ground-look.js`: kept both track marks and tunnel mouths, including their shader cache keys and update hooks.
- `scablands-scene.js`: kept tunnel updates and the realism objects, tracks and photographs.
- `test-scablands-solid.mjs`: kept the open river-bed route and tested it with realism both off and on.

The shared solid grid also feeds each job's grid, cars, raiders and Big Bess. Realism objects now carry their height range for collision checks. A focused check places a pole on the deck and a rock in the bed and checks both the course and job grids. The normal grounded-car contact path for other solids is unchanged. A comparison with the shared branch confirms that the ground shader text is byte-for-byte unchanged when there are no tracks or tunnels; a second check confirms both additions appear together.

## Survey Flags fix

The third flag's height is an offset from the ground, but the job compared it with the car's absolute height. The car raised that flag later, changed its route and repeatedly hit the steep river bank near (2065, -1425). This was a ground-climb hit, not a deck, post, roof or wrong floor. Exploration now compares the car's height above its selected floor with the flag's ground-relative height. The physical position still keeps the car's absolute feet height. A real-car test covers the flag and a short drive over the crossing used by the successful route.

Survey Flags and Hot Delivery each finished 10 of 10 seeds with the Easy suite's own driver, without the realism switch. The focused tunnel test and all 24 solid-ground tests passed. No existing assertion or route changed. No new sound cue is needed.

## Checks

`test-tunnels`, `test-scablands-things`, `test-scablands-solid` (24 checks), `test-scablands-scene`, and `test-scablands-size` passed. `test-replays` passed 297 fingerprints in 33 cases; `test-combat-replays` passed 12 fingerprints in four encounters. `test-shortcut-presets` passed 241 checks. `npm.cmd run build` passed with the existing chunk-size and mixed-import warnings.

Claude ran the browser scenario successfully: the bridge floor error was 0 and frame times were 18.1 to 18.2 ms. Both tunnel drives passed in the prior run. No browser was run in this lane after the shared build was brought in.

## For Claude to run

Run the lane tier and long Everburn suite at merge, as requested. The earlier lane run on commit 87f779b79 had four FFmpeg startup failures. Its Survey Flags failure is fixed and the two requested jobs now pass independently. Review the shared build in the browser. The boring machine itself is not built.

## Changed assertions, for Claude to review

The four-ways test formerly required the bridge deck to stop a car in the river bed and return it to the Boneyard Road. It now requires the car to pass below the bridge, reach the Steps and reach Tin Town. This follows the agreed route and does not loosen the requirement.

The shortcut source fingerprint moved from `4915b2c4aa7d6f63a2d4b5883fa7395f7a99a6c9cd76f6b6f3df718f9c4264fe` to `a23244774fb2baa6f021808d03f2272538612161df05e00bb0a81d18dc3a798d` when `Course.groundAt` changed. All 15 saved records remained unchanged when regenerated and compared with the solver.

The Big Bess crossing fixture now gives `y: 0` as the job offset instead of an absolute surface height; the same deck and raider assertions remain. The scenario formerly required `minCover > 1` within 5 m of the named crossing; it now counts samples with more than 4 m of cover anywhere along the crossing, and compares each step with the bed at that location. The old check measured the wrong part of the crossing.

The scenario's covered-sample requirement changed from more than 10 for both decks to at least 10 for the 7 m half-width bridge and at least 5 for the 3.6 m half-width Pipe. The narrower Pipe produces fewer samples at the same driving speed. The drive must still cross the full 70 m, select the bed at every step and meet the same floor-error and cover limits.

The new tunnel tests were adjusted to the prescribed flat floor at 0.55 radius below the centre, with walls where that floor meets the bore, and to the 0.6 m floor-selection rule. They require the specified behaviour.

## Codex decided (Claude to review)

The trial crosses the west scab scarp from just inside its foot to the high ground, with a mouth moved uphill to meet the floor cleanly. The deck underside is 1.2 m below the deck.

## Cost, limits and verdict

The trial has one segment, so each occupied 32 m grid cell holds one candidate. Support and wall queries scan that cell; motion also checks at most two neighbours and the two end faces. The separate clipping utility scans all segments without allocating. The slope query reuses its point and makes no closure per step.

The ground shader holds eight mouth capsules, each with a capsule-distance test per fragment. The cost is bounded by the number of mouths, not by the length or segment count of the bore. This has not been timed. The lining is plain rock; Claude saw the lit bore and its mouths, and a machine, its sound and persistent tunnels remain to be built. My view is no-go for a finished boring machine on this evidence; first drive and time this trial, then decide how the machine grows, saves and decorates the bore. Claude makes the verdict after seeing it.

`three-bvh-csg` is MIT licensed. A second trial would need an isolated installation, closed terrain and cutter meshes, collision and terrain updates, and rebuild and frame measurements. Its cost is unmeasured.

Ordinary released courses have no trial bore. Their replay fingerprints passed; the Scablands deck route intentionally changes where the two floors overlap. The combined shared build remains subject to Claude's browser check.

## Removed

The surface-only support for these actors and the river-bed dead-end assertion were replaced. The scenario's independent tunnel shader and lining were removed in favour of the game's own scene.

## Height callers

Changed: `sim-contacts.js` passes the car's feet for support and tunnel selection; `sim-scablands.js` passes height for slope and tunnel checks; `course.js` forwards it to the Scablands and tunnel queries; `onfoot.js` passes the person's or car's height; `world-job.js` and `scablands-movers.js` carry the job movers' height. `camera-clearance.js` uses the car's floor for its roof and side limits. The scene uses Big Bess's selected floor. `arena-event.js` accepts an explicit placement height.

Other calls below retain a surface read for course construction, scenery, other courses, effects or their existing fallback. Dynamic effects, non-job actors and other placement paths have not all been proved underground and need review before a full underground game.
**Files calling a `.groundAt` method:** `src/app.js`, `src/arena/arena-event.js`, `src/arena/arena-junk.js`, `src/arena/arena-pickups.js`, `src/arena/convoy.js`, `src/arena/modes/ambush-alley.js`, `src/arena/modes/convoy-raid.js`, `src/arena/modes/fuel-run-view.js`, `src/arena/modes/fuel-run.js`, `src/arena/venues/pit.js`, `src/armor-kit-meshes.js`, `src/arsenal/decoy-drone.js`, `src/arsenal/magnet.js`, `src/arsenal/rockets.js`, `src/bowl/bowl-course.js`, `src/bowl/bowl-view.js`, `src/camera-clearance.js`, `src/chickens.js`, `src/circuit-effects.js`, `src/circuit-hills.js`, `src/circuit-landmarks.js`, `src/circuit-water.js`, `src/city-chase-detail.js`, `src/city-decoration-placement.js`, `src/city-parking-layout.js`, `src/city-parking.js`, `src/city-skyline.js`, `src/coach-markers.js`, `src/coast-lighthouse.js`, `src/coastal-water.js`, `src/combat-actors.js`, `src/combat-armor.js`, `src/combat-effects.js`, `src/combat-pickups.js`, `src/combat-projectiles.js`, `src/combat-scene.js`, `src/convoy-prompt.js`, `src/course-set-pieces.js`, `src/course.js`, `src/crew-gear/boarding.js`, `src/crew-gear/contacts.js`, `src/crew-gear/cpu-crews.js`, `src/crew-gear/projectiles.js`, `src/crew-gear/signature.js`, `src/deep/deep-journey.js`, `src/deep/deep-ramp.js`, `src/far-terrain-surface.js`, `src/freestyle-course.js`, `src/freestyle-scene.js`, `src/game.js`, `src/harbor-detail.js`, `src/heli/heli-ground.js`, `src/hidden-road-ui.js`, `src/hidden-road.js`, `src/lessons/drive-lessons.js`, `src/mountain-surface.js`, `src/night-glows.js`, `src/npc-route.js`, `src/onfoot-camera.js`, `src/onfoot-race.js`, `src/onfoot-transition.js`, `src/onfoot-weapons.js`, `src/onfoot.js`, `src/pacific-coast-layout.js`, `src/pacific-coast.js`, `src/race-lines.js`, `src/race-structures.js`, `src/raiders.js`, `src/rally-detail.js`, `src/render3d.js`, `src/rendered-ground.js`, `src/ribbon-ground.js`, `src/road-furniture.js`, `src/scene-lighting.js`, `src/scenery-bounds.js`, `src/sim-contacts.js`, `src/sim-crash.js`, `src/sim-driving.js`, `src/sim-police.js`, `src/sim-rival.js`, `src/sim-scablands.js`, `src/snow-world.js`, `src/snowmen.js`, `src/summit-avalanche-view.js`, `src/summit-avalanche.js`, `src/summit-finish-ground.js`, `src/summit-finish-view.js`, `src/test.js`, `src/track-analysis.js`, `src/track-kits.js`, `src/track-script-course.js`, `src/track-script-scene.js`, `src/vehicle-grounding.js`, `src/vehicle-surface.js`, `src/warlords/blackiron.js`, `src/warlords/dustmonger.js`, `src/warlords/gunn.js`, `src/warlords/kettle.js`, `src/warlords/magnus.js`, `src/warlords/mirage.js`, `src/warlords/sal.js`, `src/warlords/tollkeeper.js`, `src/warlords/vultures.js`, `src/waterside-scenery.js`, `src/wildlife.js`, `src/world-surfaces.js`, `src/world.js`, `src/yeti-view.js`, `src/yeti.js`.

**Files calling the Scablands height functions:** `src/arena/modes/world-job.js`, `src/course.js`, `src/sim-scablands.js`, `src/town/view/town-map-markers.js`, `src/town/view/town-scene.js`, `src/world/regions.js`, `src/world/scablands-ground.js`, `src/world/scablands-height.js`, `src/world/scablands-movers.js`, `src/world/scablands-scene.js`, `src/world/scablands-solids.js`, `src/world/tin-town-shacks.js`.
