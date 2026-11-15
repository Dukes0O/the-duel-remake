# TUNNEL-TRIAL

The Scablands now has floor selection for the river beds under both decks. Cars, people, job raiders and Big Bess use their feet to select a floor, and deck roofs and height-limited solids keep actors on their own level. The drawn bed is open under the bridge and Pipe. The `wasteland-town` switch still controls the trial bore. The 100 m west-scarp trial has a flat floor, side walls, crown, closed cutting faces and checked joints; a grid limits segment lookup. Nothing is saved by the trial. The scene follows tunnel revisions, cuts only the mouths and grows the lining. The camera is constrained to the car's floor. No new game event or sound cue was added.

The browser scenario uses the game scene and tunnel API, memory-only storage and Performance quality. It grows the bore in 20 steps and requests the mouth, inside, above, chase and deck views and drives. The halfway view shows the closed cutting face; there is no machine cylinder yet. Claude drove both tunnel directions successfully and measured 18.1 to 18.5 ms p95. The pictures were obscured by the interface. The revised scenario hides it and moves the inspection cameras; Claude must judge the new pictures.

Big Bess's position check failed because the trial treated every actor height as an absolute floor. Integration uses an offset for actors without a selected floor. The scene now uses the selected height after a mover marks it, and otherwise retains the previous offset. The existing assertion is unchanged and a new check covers a selected floor.

## Checks

The scenario passes `node --check`. A Node-only stub ran the scenario through both tunnel drives and both deck crossings and parsed all 62 evaluated scripts; all passed. It did not run the browser.

`test-tunnels`, `test-scablands-solid` (20 checks), `test-scablands-size`, `test-scablands-scene`, `test-old-smoke`, `test-everburn-play-start`, `test-ember-pot`, `test-replays`, `test-combat-replays`, `test-shortcut-presets`, and `node --check tools/scenarios/tunnel-trial.mjs` passed. The replay checks retained 297 race fingerprints in 33 cases and 12 combat fingerprints in four encounters. A 100 m tube takes 131 bytes in the simple JSON check, below the 2 MB ground budget; a tunnel save is not implemented.

On commit 87f779b79, the lane tier ran 258 suites: 253 passed and five failed. Eifel, review evidence, Blackiron and Tollkeeper failed because FFmpeg could not start. The long Everburn Easy suite was accidentally included despite the instruction to leave it for Claude: Survey Flags finished 0 of 10, below its required 8 of 10. Its cause and whether integration already has the failure are unverified. `npm.cmd run build` passed with the existing Vite large-chunk and mixed-import warnings.

Integration c88f83669 is an ancestor of this branch, and its status page is unchanged. The lane check found a non-Scablands contact regression; restricting the new calculation to the Scablands fixed it, and the core, tunnel and solid checks passed again. The final lane and build results are above.

## For Claude to run

Run the revised browser scenario and judge the pictures and frame times. Investigate the Survey Flags failure and run the four FFmpeg-dependent suites at merge. Do not treat the lane as fully green until the Survey Flags failure is understood. The visible appearance is not yet proven, and no boring machine is built.

The Node reproduction of the scenario drive printed feet and bed heights at every step for both decks. Both cars stayed on the bed within 3e-12 m. The scenario measured cover at the named crossing centre, although the line passed beneath the bridge earlier; it now checks the actual selected bed and requires covered samples along the drive. The Pipe drive also reached the far side. Big Bess now starts on the top floor plus the job offset; flight support, slope and camera use the same feet height. The 21 solid-ground checks and tunnel checks passed. The revised scenario and all 67 evaluated scripts parse in Node; the browser was not run.

## Changed assertions, for Claude to review

The four-ways test formerly required the bridge deck to stop a car in the river bed and return it to the Boneyard Road. It now requires the car to pass below the bridge, reach the Steps and reach Tin Town. This follows the agreed route and does not loosen the requirement.

The shortcut source fingerprint moved from `4915b2c4aa7d6f63a2d4b5883fa7395f7a99a6c9cd76f6b6f3df718f9c4264fe` to `a23244774fb2baa6f021808d03f2272538612161df05e00bb0a81d18dc3a798d` when `Course.groundAt` changed. All 15 saved records remained unchanged when regenerated and compared with the solver.

The Big Bess crossing fixture now gives `y: 0` as the job offset instead of an absolute surface height; the same deck and raider assertions remain. The scenario formerly required `minCover > 1` within 5 m of the named crossing; it now requires over 10 samples with more than 4 m of cover anywhere along the crossing, and compares each step with the bed at that location. The old check measured the wrong part of the crossing.

The new tunnel tests were adjusted to the prescribed flat floor at 0.55 radius below the centre, with walls where that floor meets the bore, and to the 0.6 m floor-selection rule. They require the specified behaviour.

## Codex decided (Claude to review)

The trial crosses the west scab scarp from just inside its foot to the high ground, with a mouth moved uphill to meet the floor cleanly. The deck underside is 1.2 m below the deck.

## Cost, limits and verdict

The trial has one segment, so each occupied 32 m grid cell holds one candidate. Support and wall queries scan that cell; motion also checks at most two neighbours and the two end faces. The separate clipping utility scans all segments without allocating. The slope query reuses its point and makes no closure per step.

The ground shader holds eight mouth capsules, each with a capsule-distance test per fragment. The cost is bounded by the number of mouths, not by the length or segment count of the bore. This has not been timed. The lining is plain rock, the cutting face and openings have not been judged in the browser, and a machine, its sound and persistent tunnels remain to be built. My view is no-go for a finished boring machine on this evidence; first drive and time this trial, then decide how the machine grows, saves and decorates the bore. Claude makes the verdict after seeing it.

`three-bvh-csg` is MIT licensed. A second trial would need an isolated installation, closed terrain and cutter meshes, collision and terrain updates, and rebuild and frame measurements. Its cost is unmeasured.

Ordinary released courses have no trial bore. Their replay fingerprints passed; the Scablands deck route intentionally changes where the two floors overlap. The player-visible results remain subject to Claude's browser check.

## Removed

The surface-only support for these actors and the river-bed dead-end assertion were replaced. The scenario's independent tunnel shader and lining were removed in favour of the game's own scene.

## Height callers

Changed: `sim-contacts.js` passes the car's feet for support and tunnel selection; `sim-scablands.js` passes height for slope and tunnel checks; `course.js` forwards it to the Scablands and tunnel queries; `onfoot.js` passes the person's or car's height; `world-job.js` and `scablands-movers.js` carry the job movers' height. `camera-clearance.js` uses the car's floor for its roof and side limits. The scene uses Big Bess's selected floor. `arena-event.js` accepts an explicit placement height.

Other calls below retain a surface read for course construction, scenery, other courses, effects or their existing fallback. Dynamic effects, non-job actors and other placement paths have not all been proved underground and need review before a full underground game.
**Files calling a `.groundAt` method:** `src/app.js`, `src/arena/arena-event.js`, `src/arena/arena-junk.js`, `src/arena/arena-pickups.js`, `src/arena/convoy.js`, `src/arena/modes/ambush-alley.js`, `src/arena/modes/convoy-raid.js`, `src/arena/modes/fuel-run-view.js`, `src/arena/modes/fuel-run.js`, `src/arena/venues/pit.js`, `src/armor-kit-meshes.js`, `src/arsenal/decoy-drone.js`, `src/arsenal/magnet.js`, `src/arsenal/rockets.js`, `src/bowl/bowl-course.js`, `src/bowl/bowl-view.js`, `src/camera-clearance.js`, `src/chickens.js`, `src/circuit-effects.js`, `src/circuit-hills.js`, `src/circuit-landmarks.js`, `src/circuit-water.js`, `src/city-chase-detail.js`, `src/city-decoration-placement.js`, `src/city-parking-layout.js`, `src/city-parking.js`, `src/city-skyline.js`, `src/coach-markers.js`, `src/coast-lighthouse.js`, `src/coastal-water.js`, `src/combat-actors.js`, `src/combat-armor.js`, `src/combat-effects.js`, `src/combat-pickups.js`, `src/combat-projectiles.js`, `src/combat-scene.js`, `src/convoy-prompt.js`, `src/course-set-pieces.js`, `src/course.js`, `src/crew-gear/boarding.js`, `src/crew-gear/contacts.js`, `src/crew-gear/cpu-crews.js`, `src/crew-gear/projectiles.js`, `src/crew-gear/signature.js`, `src/deep/deep-journey.js`, `src/deep/deep-ramp.js`, `src/far-terrain-surface.js`, `src/freestyle-course.js`, `src/freestyle-scene.js`, `src/game.js`, `src/harbor-detail.js`, `src/heli/heli-ground.js`, `src/hidden-road-ui.js`, `src/hidden-road.js`, `src/lessons/drive-lessons.js`, `src/mountain-surface.js`, `src/night-glows.js`, `src/npc-route.js`, `src/onfoot-camera.js`, `src/onfoot-race.js`, `src/onfoot-transition.js`, `src/onfoot-weapons.js`, `src/onfoot.js`, `src/pacific-coast-layout.js`, `src/pacific-coast.js`, `src/race-lines.js`, `src/race-structures.js`, `src/raiders.js`, `src/rally-detail.js`, `src/render3d.js`, `src/rendered-ground.js`, `src/ribbon-ground.js`, `src/road-furniture.js`, `src/scene-lighting.js`, `src/scenery-bounds.js`, `src/sim-contacts.js`, `src/sim-crash.js`, `src/sim-driving.js`, `src/sim-police.js`, `src/sim-rival.js`, `src/sim-scablands.js`, `src/snow-world.js`, `src/snowmen.js`, `src/summit-avalanche-view.js`, `src/summit-avalanche.js`, `src/summit-finish-ground.js`, `src/summit-finish-view.js`, `src/test.js`, `src/track-analysis.js`, `src/track-kits.js`, `src/track-script-course.js`, `src/track-script-scene.js`, `src/vehicle-grounding.js`, `src/vehicle-surface.js`, `src/warlords/blackiron.js`, `src/warlords/dustmonger.js`, `src/warlords/gunn.js`, `src/warlords/kettle.js`, `src/warlords/magnus.js`, `src/warlords/mirage.js`, `src/warlords/sal.js`, `src/warlords/tollkeeper.js`, `src/warlords/vultures.js`, `src/waterside-scenery.js`, `src/wildlife.js`, `src/world-surfaces.js`, `src/world.js`, `src/yeti-view.js`, `src/yeti.js`.

**Files calling the Scablands height functions:** `src/arena/modes/world-job.js`, `src/course.js`, `src/sim-scablands.js`, `src/town/view/town-map-markers.js`, `src/town/view/town-scene.js`, `src/world/regions.js`, `src/world/scablands-ground.js`, `src/world/scablands-height.js`, `src/world/scablands-movers.js`, `src/world/scablands-scene.js`, `src/world/scablands-solids.js`, `src/world/tin-town-shacks.js`.
