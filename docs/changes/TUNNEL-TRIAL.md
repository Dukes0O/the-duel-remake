# TUNNEL-TRIAL

The tunnel rules now calculate one ground-cut capsule for each open mouth, ending where the crown has one metre of cover. Closed faces do not produce a mouth cut. `node tools/test-tunnels.mjs` passed. The game renderer does not yet use these capsules; the dynamic scene, lining, camera and rewritten scenario remain to be built. No sound cue or existing assertion changed.

The tunnel rules no longer import Scablands data or read a clock. The Scablands trial site has its own file. The rules file is UTF-8 with LF line endings and no byte-order mark. `node tools/test-tunnels.mjs` and the scenario syntax check passed.

A Titan and a Falcone now drive a four-segment tube with 10, 20 and 30 degree bends in both directions in the real simulation. `node tools/test-tunnels.mjs` and `node tools/test-scablands-solid.mjs` passed. No game event or sound was added.

The low mouth moved 7 m uphill: the old bore floor rose 0.69 m above the natural ground just inside the mouth. A Titan now drives off the lip and lands in front of the mouth on open ground at both 40 and 80 mph. `node tools/test-tunnels.mjs` and `node tools/test-scablands-solid.mjs` passed, including the drives through the tunnel both ways. Drawing, the scenario and final checks remain open. No game event or sound was added.

The tunnel floor now uses the same 0.6 m step as the deck floor. Car support,
wall contact and the crown check use the selected floor, so thin covered ground
does not acquire the bore's walls or roof. The focused tunnel and Scablands
solid checks pass. Floor-selected enclosure still needs the bent drives and
scarp lip proof; drawing and the browser scenario remain unfinished. No game
event or sound was added. The crown test's starting height was corrected from
0 m to the actual 1.8 m bore floor; its roof assertions are unchanged.

The tunnel support query now chooses covered surface ground when it is within 0.6 m above the actor's feet. A focused test checks both sides of that threshold, and `node tools/test-tunnels.mjs` passed. Floor-based wall selection, the remaining enclosure driving tests and drawing still need work. No game event or sound was added.

Tunnel walls now also constrain a move ending inside a bore when its start was outside, after checking closed faces. `node tools/test-tunnels.mjs` passed. This is not yet the required floor-based enclosure. The current surface-versus-tunnel selection and scarp-mouth test need to be reconciled with the highest-floor rule; the bent driving, lip-fall and remaining enclosure checks are still needed. No game event or sound was added.

A closed cutting face now stops a crossing from outside as well as inside, without blocking a car above it. `node tools/test-tunnels.mjs` passed. The floor shape, wall selection, full enclosure tests and game drawing remain unfinished. No event or sound was added.

The tunnel rules can now check each end against a supplied surface height. An end whose floor is more than 0.3 m from that surface stops a crossing move; a matching end stays open. `node tools/test-tunnels.mjs` passed, including both cases and invalid surface data. This is only part of enclosure: callers do not yet supply the surface, and the check still uses the old round-bottom floor. The flat floor, floor-selected walls and remaining driving tests are next. No event or sound was added.

## Current round

The shortcut presets were regenerated twice and all 15 saved records are unchanged. `node tools/test-shortcut-presets.mjs` passed 241 checks. The generator does not recognize `--verify-solvers` separately; it ran the same full generation again.


The road ribbons now stay flat across the Girder Bridge and the Pipe instead of hanging down into the bed. Both slabs are 1.2 m thick and cast shadows. The existing gorge ribbon draws the bed beneath both crossings; the near and far ground shaders cut out the river there. `node tools/test-tunnels.mjs` passed, including clear-air checks at three positions under each deck. The view still needs Claude's browser check. No game event or sound was added.


A move that crosses a joint but misses the adjoining segment's height range now stops at the joint and stays inside the side walls. `node tools/test-tunnels.mjs` passed, including the new check in both directions. The rest of the tunnel enclosure remains unfinished.

A car rising inside a tunnel now meets the current bore crown and falls back. The real flight step is covered by `node tools/test-tunnels.mjs`, which passed. The new flat floor and floor-based bore selection still need to replace the trial geometry before the enclosure is complete.

Tunnel support now looks up nearby segments in a grid and reuses its projection and result objects. A 100-segment chain is checked across cell boundaries; `node tools/test-tunnels.mjs` passed. The wall handoff checks only adjacent segments, and the test exercises both directions at 99 joints. The rest of item 3 remains.

Tunnel creation now rejects a gap or height step at a joint, a radius step, and a segment with no horizontal length. `node tools/test-tunnels.mjs` passed. The flat floor, roof, closed face, grid, drawing and scenario remain to be built.

A scripted driver now takes a car from the road down the Wash and under the Girder Bridge while a job raider follows its moving position. Both remain on the bed where it is deep; `test-scablands-solid` passed all 20 checks. The test supplies the pursuit target; it does not prove a separate autonomous chase system. The tunnel enclosure and drawing work still remain.

A car now has a real input-driven check from the bank beside the Girder Bridge. It leaves the ground and lands in the bed within 100 m of the bridge, with the town switch off. `test-tunnels` and `test-scablands-solid` passed. The complete chase and the remaining tunnel and drawing work still need to be done. No game event or sound cue was added.

A real world job now walks a raider across the bed under each deck with the town switch off. The check follows its one stored height for the whole crossing and confirms it reaches the far side. `node tools/test-tunnels.mjs` passed. Big Bess now crosses each deck directly above a stationary raider in the real job update, with both actors staying on their floors. A car chase from the plain and the drive off the bank remain to be proved. No game event or sound cue was added.

The flight check now also starts a falling car below each deck while its stored support is still at bank height. The real flight step keeps it below the deck and lands it on the bed. `node tools/test-tunnels.mjs` passed. This checks the fall after leaving the bank; the drive off the bank and the complete chase and crossing proofs still remain.

Car placement now accepts an explicit floor height and clears it when none is supplied. The car support check covers both decks, and the drives under both decks now run with the town switch off. `test-tunnels` and `test-scablands-solid` pass. The bank fall, complete chase and crossing proofs remain to be added. No game event or sound cue was added.

World jobs now receive a Scablands car's actual foot height, including while airborne, instead of the deck surface above it. `test-tunnels` passes for both decks. Other courses retain their previous position calculation.

Cars rising under the Girder Bridge or the Pipe now meet the deck underside using their collision height, and a car falling from above still lands on the deck. The focused flight checks and `test-scablands-solid` pass. The four routes pass with the town switch off, and 2,000 seeded places away from the decks return the exact surface height. This covers the deck roof only: tunnel roofs, floor integration and the remaining proofs are still to do. No game event or sound cue was added.

People on foot now select the floor using their feet when walking and can be placed at a supplied height. Leaving a car uses its stored ground height. Bridge and Pipe solids use the 2.5 m contact height for people too. `test-tunnels` and `test-scablands-solid` pass. Roofs and the rest of the floor rule remain unfinished. No game event or sound cue was added.

The shared floor selector now serves car support, slope checks and job movers with the town switch off. At the blended edge of a deck, the top floor is the level deck and the lower floor is the river bed; this prevents the terrain blend from trapping a mover. Airborne car support uses its stored flight height. `test-tunnels` and `test-scablands-solid` passed. This is part of item 1, not its completion: roofs, tunnel floor selection, on-foot actors and the requested flight and chase proofs remain. No game event or sound cue was added.


Car contacts now test Scablands bridge and Pipe solids from the feet to 2.5 m above them, as job movers do. Other solids keep their existing contact envelope. `test-tunnels` and `test-scablands-solid` pass, including a check of both cases. The floor selector, roofs and remaining work below are still incomplete. No game event or sound cue was added.

Job raiders and Big Bess now pass their stored height and update it with the town switch off. Job defence and escort raiders now keep only `y`; their inherited `groundY` was stale. A real job defence wave checks this. `test-tunnels` and `test-scablands-solid` passed. The shared floor list is not yet connected: doing so exposed a steep step where the Pipe deck tapers into the bed. The new 0.6 m rule briefly selects the top floor there. The next round must fix that transition and the remaining floor, roof and tunnel rules before claiming the card is done.

The bore now has a flat support floor 0.55 radius below its centre. Its walls stop cars at that floor edge, including angled moves and segment joints. `node tools/test-tunnels.mjs` passed with the new floor and the scarp drives. Floor selection through bends and the remaining enclosure proofs are not complete. No new sound cue was added.

## Incomplete

At an overlapping bend, the tunnel query now chooses the highest reachable floor. A sloped joint test, `test-tunnels` and all 20 `test-scablands-solid` checks pass. The slow fall below and the remaining drawing and scenario work are still open. No sound cue changed.

Tunnel wall and motion queries now reuse result objects instead of allocating on each call. Callers must consume each result before the next query. `node tools/test-tunnels.mjs` and `node tools/test-scablands-solid.mjs` passed (20 checks). This does not fix the slow fall below. No assertions or sound cues changed.


Integration was merged at b23714b22 (current integration was c88f8366974e060acaed379a3f153e395c76edec). Conflicts in the status page, ground look and scene were resolved, keeping integration's status and both the photo and tunnel rendering paths. The 100 m trial crosses the west scab scarp at a grade under .15. Both mouths meet the surface. A Titan and a Falcone drive it in both directions in the focused test.

This round added a height-aware river-bed query, car support and slope checks, height-aware collision against deck trusses and piers, and the height read for job raiders and Big Bess. With the trial switch on, a car drives under the Girder Bridge and the Pipe in both directions. The four-way drive now travels from the Wash under the bridge, up the Steps and to Tin Town. The switch is off for players. The tests check the piers stay solid below the bridge and do not block the deck.

A later fix keeps the side wall solid when a move crosses a joint between connected tube segments. The focused test checks the joint in both directions. A true mouth remains open.

The browser scenario is written and syntax checked but has not run. It now draws each sampled frame and requires the bridge-bed drive to leave the far side after the picture. Big Bess is drawn at her stored support height with the switch on, so she can be shown beneath a deck. It supplies a temporary refresh of both ground materials and the lining as the cylinder advances. The game scene itself still reads tubes only when it is built. Do not claim a visual, frame, save-budget, or boring-machine pass. A mover's height selection has a focused check but a complete raider or Big Bess chase under the deck has not been driven. Other actor and effect callers still need review before this can support a complete underground game.

The scenario now places the camera at the requested height before each picture. The renderer normally eases the camera vertically, so a picture taken after one frame could otherwise show the wrong view. This correction still needs Claude's browser check.

The browser scenario now also records floor samples, their span, and the greatest height error on each drive. It fails if the car crosses over the scarp instead of staying on the tube floor from mouth to mouth. This check has not been run in a browser.

Ordinary races and released courses keep the surface-only path with the trial switch off; the replay and world-composition guards passed. The terrain shader adds two vector uniforms, one radius uniform and one capsule-distance test per segment per ground fragment. There is no chunk selection or measured practical limit. The tube is an untextured cylinder; its entrances and joins have not been judged in a browser. No new game event or sound cue was added. My view remains no-go for a finished boring machine until dynamic rebuilding, a real play test and frame measurements are done. Compare a real cut with this shader before choosing.

[three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) is MIT licensed. Its brushes and evaluator can subtract closed geometry. A second trial needs an isolated install, closed terrain and cutter geometry, collision and terrain updates, and rebuild and frame measurements. Cost is not measured.

## Checks

- `node tools/test-tunnels.mjs`: passed after the deck changes. It checks the scarp in both directions, both decks in both directions, the height switch, and a pier.
- `node tools/test-tunnels.mjs`: passed with the segment-joint wall fix, including both directions and open mouths. `npm.cmd run build` also passed after that fix.
- On the joint-fix commit, both replay suites passed again: 297 race fingerprints across 33 cases and 12 combat fingerprints across four encounters. The lane's world-composition check passed, as did its tunnel and drive-through checks.
- A new lane run on the joint-fix commit reached all 227 suites before it was stopped at the 30-minute limit: 220 passed, five failed, and two were unfinished. `test-everburn-easy.mjs` and `test-track-kits.mjs` were unfinished. The failures were shortcut freshness, the three FFmpeg-dependent suites listed below, and the town-core timing check. Town core passed its one separate rerun with a 5.28 ms slowest tick after 14.60 ms under load. The build passed again after the lane run.
- A separate Everburn repeat was stopped at the 30-minute limit. All nine story jobs and all four long-road gas cases passed 10 of 10, but the remaining cases did not finish.
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

Rerun the incomplete Everburn Easy suite and the three FFmpeg-dependent checks. Run `tools/scenarios/tunnel-trial.mjs` with the browser harness. Check the 100 m bore, both drives, both mouths, the inside, the ground above and the bridge bed. The scenario records draw calls, triangles and frame intervals with memory-only storage on Performance. Check that Big Bess and raiders visibly chase under the deck as well. Judge the look and measure frame time.

## Changed assertions, for Claude to review

Tunnel floor support for a 4 m radius changed from 4 m to 2.2 m below the centre; trial centre lines and fixture positions moved to keep their mouths on the ground. This follows the prescribed flat floor.

Tunnel wall contact for a 4 m radius and 1 m car clearance changed from 3 m to approximately 2.3406586 m from the centre. The new value is where the prescribed flat floor meets the round bore, less the car clearance. The wall checks still require contact at every tested joint.

Shortcut source fingerprint: `4915b2c4aa7d6f63a2d4b5883fa7395f7a99a6c9cd76f6b6f3df718f9c4264fe` to `a23244774fb2baa6f021808d03f2272538612161df05e00bb0a81d18dc3a798d`, because `Course.groundAt` changed; all 15 saved records are unchanged.

`test-tunnels.mjs`: at 1.2 m below the deck, the expected floor changes from deck to bed; the 0.6 m rule requires it. With the town switch off, car support changes from the deck to the bed when the car is placed in the bed; decks no longer depend on that switch. Both assertions require the specified behaviour.


`tools/test-scablands-solid.mjs`, four ways: the former assertion expected the bridge deck to stop the car in the bed. It now requires the car to pass beneath the bridge, reach the Steps, and reach Tin Town without falling or wrecking. This moves the expected result toward the design and does not loosen the route requirement.

## Codex decided (Claude to review)

The trial line crosses the middle of the west scab scarp, from 2 m beyond its foot to 102 m beyond it. The deck underside is 1.2 m below the plain-level deck. Both heights share the existing ground edit.

## Removed

The previous dead-end route assertion and return to the Wash were replaced by the through route. The earlier surface-only choice for trial car support and job movers was replaced by a height-aware query. The ordinary ground shader remains unchanged when no tunnel is supplied.

## Height callers

Changed: `sim-contacts.js` passes the car's stored support height into `course.groundAt` for support and uses it for static contacts. `sim-scablands.js` passes the actor height to the Scablands height query and tunnel floor for slope checks. `world-job.js` passes each job raider's and Big Bess's height into `scablands-movers.js`; the mover passes it to `scablandsActorHeightAt` and solid contacts. `course.js` forwards it to `scablandsActorHeightAt` and `ground-tunnels.js`. `scablands-scene.js` uses Big Bess's stored height when the switch is on.

The remaining calls below keep the surface read. Many place scenery, build courses or refer to other courses. Dynamic calls in combat, on foot, police, rivals, cameras, projectiles, placement and vehicle drawing may need their own height hint before those features can work underground. They were not all changed or proven by this trial. Fallback calls in `sim-contacts.js` read the surface only when no stored actor height is available. `vehicle-grounding.js` already offsets a vehicle by its stored support height.

**Files calling a `.groundAt` method:** `src/app.js`, `src/arena/arena-event.js`, `src/arena/arena-junk.js`, `src/arena/arena-pickups.js`, `src/arena/convoy.js`, `src/arena/modes/ambush-alley.js`, `src/arena/modes/convoy-raid.js`, `src/arena/modes/fuel-run-view.js`, `src/arena/modes/fuel-run.js`, `src/arena/venues/pit.js`, `src/armor-kit-meshes.js`, `src/arsenal/decoy-drone.js`, `src/arsenal/magnet.js`, `src/arsenal/rockets.js`, `src/bowl/bowl-course.js`, `src/bowl/bowl-view.js`, `src/camera-clearance.js`, `src/chickens.js`, `src/circuit-effects.js`, `src/circuit-hills.js`, `src/circuit-landmarks.js`, `src/circuit-water.js`, `src/city-chase-detail.js`, `src/city-decoration-placement.js`, `src/city-parking-layout.js`, `src/city-parking.js`, `src/city-skyline.js`, `src/coach-markers.js`, `src/coast-lighthouse.js`, `src/coastal-water.js`, `src/combat-actors.js`, `src/combat-armor.js`, `src/combat-effects.js`, `src/combat-pickups.js`, `src/combat-projectiles.js`, `src/combat-scene.js`, `src/convoy-prompt.js`, `src/course-set-pieces.js`, `src/course.js`, `src/crew-gear/boarding.js`, `src/crew-gear/contacts.js`, `src/crew-gear/cpu-crews.js`, `src/crew-gear/projectiles.js`, `src/crew-gear/signature.js`, `src/deep/deep-journey.js`, `src/deep/deep-ramp.js`, `src/far-terrain-surface.js`, `src/freestyle-course.js`, `src/freestyle-scene.js`, `src/game.js`, `src/harbor-detail.js`, `src/heli/heli-ground.js`, `src/hidden-road-ui.js`, `src/hidden-road.js`, `src/lessons/drive-lessons.js`, `src/mountain-surface.js`, `src/night-glows.js`, `src/npc-route.js`, `src/onfoot-camera.js`, `src/onfoot-race.js`, `src/onfoot-transition.js`, `src/onfoot-weapons.js`, `src/onfoot.js`, `src/pacific-coast-layout.js`, `src/pacific-coast.js`, `src/race-lines.js`, `src/race-structures.js`, `src/raiders.js`, `src/rally-detail.js`, `src/render3d.js`, `src/rendered-ground.js`, `src/ribbon-ground.js`, `src/road-furniture.js`, `src/scene-lighting.js`, `src/scenery-bounds.js`, `src/sim-contacts.js`, `src/sim-crash.js`, `src/sim-driving.js`, `src/sim-police.js`, `src/sim-rival.js`, `src/sim-scablands.js`, `src/snow-world.js`, `src/snowmen.js`, `src/summit-avalanche-view.js`, `src/summit-avalanche.js`, `src/summit-finish-ground.js`, `src/summit-finish-view.js`, `src/test.js`, `src/track-analysis.js`, `src/track-kits.js`, `src/track-script-course.js`, `src/track-script-scene.js`, `src/vehicle-grounding.js`, `src/vehicle-surface.js`, `src/warlords/blackiron.js`, `src/warlords/dustmonger.js`, `src/warlords/gunn.js`, `src/warlords/kettle.js`, `src/warlords/magnus.js`, `src/warlords/mirage.js`, `src/warlords/sal.js`, `src/warlords/tollkeeper.js`, `src/warlords/vultures.js`, `src/waterside-scenery.js`, `src/wildlife.js`, `src/world-surfaces.js`, `src/world.js`, `src/yeti-view.js`, `src/yeti.js`.

**Files calling the Scablands height functions:** `src/arena/modes/world-job.js`, `src/course.js`, `src/sim-scablands.js`, `src/town/view/town-map-markers.js`, `src/town/view/town-scene.js`, `src/world/regions.js`, `src/world/scablands-ground.js`, `src/world/scablands-height.js`, `src/world/scablands-movers.js`, `src/world/scablands-scene.js`, `src/world/scablands-solids.js`, `src/world/tin-town-shacks.js`.
