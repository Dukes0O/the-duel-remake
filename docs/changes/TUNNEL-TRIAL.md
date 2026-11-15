# TUNNEL-TRIAL

## Incomplete

Integration was merged at b23714b22 (current integration was c88f8366974e060acaed379a3f153e395c76edec). Conflicts in the status page, ground look and scene were resolved, keeping integration's status and both the photo and tunnel rendering paths. The 100 m trial crosses the west scab scarp at a grade under .15. Both mouths meet the surface. A Titan and a Falcone drive it in both directions in the focused test.

This round added a height-aware river-bed query, car support and slope checks, height-aware collision against deck trusses and piers, and the height read for job raiders and Big Bess. With the trial switch on, a car drives under the Girder Bridge and the Pipe in both directions. The four-way drive now travels from the Wash under the bridge, up the Steps and to Tin Town. The switch is off for players. The tests check the piers stay solid below the bridge and do not block the deck.

The browser scenario is written and syntax checked but has not run. It now draws each sampled frame and requires the bridge-bed drive to leave the far side after the picture. Big Bess is drawn at her stored support height with the switch on, so she can be shown beneath a deck. It supplies a temporary refresh of both ground materials and the lining as the cylinder advances. The game scene itself still reads tubes only when it is built. Do not claim a visual, frame, save-budget, or boring-machine pass. A mover's height selection has a focused check but a complete raider or Big Bess chase under the deck has not been driven. Other actor and effect callers still need review before this can support a complete underground game.

The scenario now places the camera at the requested height before each picture. The renderer normally eases the camera vertically, so a picture taken after one frame could otherwise show the wrong view. This correction still needs Claude's browser check.

The browser scenario now also records floor samples, their span, and the greatest height error on each drive. It fails if the car crosses over the scarp instead of staying on the tube floor from mouth to mouth. This check has not been run in a browser.

Ordinary races and released courses keep the surface-only path with the trial switch off; the replay and world-composition guards passed. The terrain shader adds two vector uniforms, one radius uniform and one capsule-distance test per segment per ground fragment. There is no chunk selection or measured practical limit. The tube is an untextured cylinder; its entrances and joins have not been judged in a browser. No new game event or sound cue was added. My view remains no-go for a finished boring machine until dynamic rebuilding, a real play test and frame measurements are done. Compare a real cut with this shader before choosing.

[three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) is MIT licensed. Its brushes and evaluator can subtract closed geometry. A second trial needs an isolated install, closed terrain and cutter geometry, collision and terrain updates, and rebuild and frame measurements. Cost is not measured.

## Checks

- `node tools/test-tunnels.mjs`: passed after the deck changes. It checks the scarp in both directions, both decks in both directions, the height switch, and a pier.
- A later run of `node tools/test-tunnels.mjs` also passed with job movers stepping under both decks in both directions, carrying their ground height between steps and checking for solid obstructions. This does not replace a full chase or visual check.
- `node tools/test-everburn-easy.mjs`: all nine story jobs passed 10 of 10 on a repeat. The run was stopped during the gas routes, so the suite remains incomplete.
- A further isolated repeat again passed all nine story jobs 10 of 10; it was stopped during the first gas route. The complete suite remains unverified.
- `node tools/test-track-kits.mjs`: passed on an isolated repeat, including every circuit with kit placements.
- `node --check tools/scenarios/tunnel-trial.mjs`: passed after the frame sampling and bridge exit changes. The browser scenario was not run.
- After the camera placement correction, `node --check tools/scenarios/tunnel-trial.mjs` and `node tools/test-tunnels.mjs` passed. The browser scenario was not run.
- After adding the browser drive's floor check, `node --check tools/scenarios/tunnel-trial.mjs` and `node tools/test-tunnels.mjs` passed. The browser scenario was not run.
- `node tools/test-scablands-solid.mjs`: passed 18 checks. The four-way route reached town with no hits.
- `node tools/test-replays.mjs`: passed 297 fingerprints across 33 cases.
- `node tools/test-combat-replays.mjs`: passed 12 fingerprints across four encounters.
- `npm.cmd run build`: passed.
- A simple JSON encoding of the 100 m tube is 131 bytes, under the 2 MB ground target. This is not a town save test: no tunnel save exists yet.
- Browser scenario: written and syntax checked, not run.
- `node tools/test-world-composition.mjs`: passed 63 checks across 20 events.
- Lane tier: 220 passed, seven reported failed. Two were stopped at the 30-minute lane limit: `test-everburn-easy.mjs` and `test-track-kits.mjs`; both remain incomplete. `test-town-core.mjs` failed its 10 ms timing limit at 12.22 ms under load, then passed its one rerun with a 6.55 ms slowest tick.
- `test-circuit-eifel.mjs`, `test-review-evidence.mjs` and `test-warlord-tollkeeper.mjs` failed because FFmpeg could not start (`EPERM`); no audio changed here.
- `test-shortcut-presets.mjs` fails its source freshness check because the trial changed `Course.groundAt`: recorded `4915b2c4aa7d6f63a2d4b5883fa7395f7a99a6c9cd76f6b6f3df718f9c4264fe`, current `a23244774fb2baa6f021808d03f2272538612161df05e00bb0a81d18dc3a798d`. The saved shortcut data was not regenerated. Claude needs to re-slice the card to include that generated file and its solver verification, or direct another fix.
- A separate fresh solver comparison found all 15 saved shortcut paths unchanged. This compares the full saved shortcut records for each selectable layout, but does not make the freshness suite pass or replace its other checks.
- `npm.cmd run build`: passed after the lane run; the generated `dist` was removed.

## For Claude to run

Resolve the shortcut freshness failure and rerun the incomplete Everburn Easy suite and the three FFmpeg-dependent checks. Run `tools/scenarios/tunnel-trial.mjs` with the browser harness. Check the 100 m bore, both drives, both mouths, the inside, the ground above and the bridge bed. The scenario records draw calls, triangles and frame intervals with memory-only storage on Performance. Check that Big Bess and raiders visibly chase under the deck as well. Judge the look and measure frame time.

## Changed assertions, for Claude to review

`tools/test-scablands-solid.mjs`, four ways: the former assertion expected the bridge deck to stop the car in the bed. It now requires the car to pass beneath the bridge, reach the Steps, and reach Tin Town without falling or wrecking. This moves the expected result toward the design and does not loosen the route requirement.

## Codex decided (Claude to review)

The trial line crosses the middle of the west scab scarp, from 5 m before its foot to 95 m beyond it. The deck underside is 1.2 m below the plain-level deck. Both heights share the existing ground edit.

## Removed

The previous dead-end route assertion and return to the Wash were replaced by the through route. The earlier surface-only choice for trial car support and job movers was replaced by a height-aware query. The ordinary ground shader remains unchanged when no tunnel is supplied.

## Height callers

Changed: `sim-contacts.js` passes the car's stored support height into `course.groundAt` for support and uses it for static contacts. `sim-scablands.js` passes the actor height to the Scablands height query and tunnel floor for slope checks. `world-job.js` passes each job raider's and Big Bess's height into `scablands-movers.js`; the mover passes it to `scablandsActorHeightAt` and solid contacts. `course.js` forwards it to `scablandsActorHeightAt` and `ground-tunnels.js`. `scablands-scene.js` uses Big Bess's stored height when the switch is on.

The remaining calls below keep the surface read. Many place scenery, build courses or refer to other courses. Dynamic calls in combat, on foot, police, rivals, cameras, projectiles, placement and vehicle drawing may need their own height hint before those features can work underground. They were not all changed or proven by this trial. Fallback calls in `sim-contacts.js` read the surface only when no stored actor height is available. `vehicle-grounding.js` already offsets a vehicle by its stored support height.

**Files calling a `.groundAt` method:** `src/app.js`, `src/arena/arena-event.js`, `src/arena/arena-junk.js`, `src/arena/arena-pickups.js`, `src/arena/convoy.js`, `src/arena/modes/ambush-alley.js`, `src/arena/modes/convoy-raid.js`, `src/arena/modes/fuel-run-view.js`, `src/arena/modes/fuel-run.js`, `src/arena/venues/pit.js`, `src/armor-kit-meshes.js`, `src/arsenal/decoy-drone.js`, `src/arsenal/magnet.js`, `src/arsenal/rockets.js`, `src/bowl/bowl-course.js`, `src/bowl/bowl-view.js`, `src/camera-clearance.js`, `src/chickens.js`, `src/circuit-effects.js`, `src/circuit-hills.js`, `src/circuit-landmarks.js`, `src/circuit-water.js`, `src/city-chase-detail.js`, `src/city-decoration-placement.js`, `src/city-parking-layout.js`, `src/city-parking.js`, `src/city-skyline.js`, `src/coach-markers.js`, `src/coast-lighthouse.js`, `src/coastal-water.js`, `src/combat-actors.js`, `src/combat-armor.js`, `src/combat-effects.js`, `src/combat-pickups.js`, `src/combat-projectiles.js`, `src/combat-scene.js`, `src/convoy-prompt.js`, `src/course-set-pieces.js`, `src/course.js`, `src/crew-gear/boarding.js`, `src/crew-gear/contacts.js`, `src/crew-gear/cpu-crews.js`, `src/crew-gear/projectiles.js`, `src/crew-gear/signature.js`, `src/deep/deep-journey.js`, `src/deep/deep-ramp.js`, `src/far-terrain-surface.js`, `src/freestyle-course.js`, `src/freestyle-scene.js`, `src/game.js`, `src/harbor-detail.js`, `src/heli/heli-ground.js`, `src/hidden-road-ui.js`, `src/hidden-road.js`, `src/lessons/drive-lessons.js`, `src/mountain-surface.js`, `src/night-glows.js`, `src/npc-route.js`, `src/onfoot-camera.js`, `src/onfoot-race.js`, `src/onfoot-transition.js`, `src/onfoot-weapons.js`, `src/onfoot.js`, `src/pacific-coast-layout.js`, `src/pacific-coast.js`, `src/race-lines.js`, `src/race-structures.js`, `src/raiders.js`, `src/rally-detail.js`, `src/render3d.js`, `src/rendered-ground.js`, `src/ribbon-ground.js`, `src/road-furniture.js`, `src/scene-lighting.js`, `src/scenery-bounds.js`, `src/sim-contacts.js`, `src/sim-crash.js`, `src/sim-driving.js`, `src/sim-police.js`, `src/sim-rival.js`, `src/sim-scablands.js`, `src/snow-world.js`, `src/snowmen.js`, `src/summit-avalanche-view.js`, `src/summit-avalanche.js`, `src/summit-finish-ground.js`, `src/summit-finish-view.js`, `src/test.js`, `src/track-analysis.js`, `src/track-kits.js`, `src/track-script-course.js`, `src/track-script-scene.js`, `src/vehicle-grounding.js`, `src/vehicle-surface.js`, `src/warlords/blackiron.js`, `src/warlords/dustmonger.js`, `src/warlords/gunn.js`, `src/warlords/kettle.js`, `src/warlords/magnus.js`, `src/warlords/mirage.js`, `src/warlords/sal.js`, `src/warlords/tollkeeper.js`, `src/warlords/vultures.js`, `src/waterside-scenery.js`, `src/wildlife.js`, `src/world-surfaces.js`, `src/world.js`, `src/yeti-view.js`, `src/yeti.js`.

**Files calling the Scablands height functions:** `src/arena/modes/world-job.js`, `src/course.js`, `src/sim-scablands.js`, `src/town/view/town-map-markers.js`, `src/town/view/town-scene.js`, `src/world/regions.js`, `src/world/scablands-ground.js`, `src/world/scablands-height.js`, `src/world/scablands-movers.js`, `src/world/scablands-scene.js`, `src/world/scablands-solids.js`, `src/world/tin-town-shacks.js`.
