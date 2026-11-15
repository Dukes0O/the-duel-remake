# TUNNEL-TRIAL

## Incomplete

Integration was merged at b23714b22. Conflicts in the status page, ground look and scene were resolved, keeping integration's status and both the photo and tunnel rendering paths. The 100 m trial crosses the west scab scarp at a grade under .15. Both mouths meet the surface. A Titan and a Falcone drive it in both directions in the focused test.

This round added a height-aware river-bed query, car support and slope checks, height-aware collision against deck trusses and piers, and the height read for job raiders and Big Bess. With the trial switch on, a car drives under the Girder Bridge and the Pipe in both directions. The four-way drive now travels from the Wash under the bridge, up the Steps and to Tin Town. The switch is off for players. The tests check the piers stay solid below the bridge and do not block the deck.

The browser scenario is not written. In particular, the scene reads tubes only when it is built, so a scenario that shows the cylinder boring must arrange a real update to both ground materials and the lining. Do not claim a visual, frame, save-budget, or boring-machine pass. A mover's height selection has a focused check but a complete raider or Big Bess chase under the deck has not been driven. The full caller inventory remains to be completed.

The terrain shader adds two vector uniforms, one radius uniform and one capsule-distance test per segment per ground fragment. There is no chunk selection or measured practical limit. The tube is an untextured cylinder; its entrances and joins have not been judged in a browser. No new game event or sound cue was added. My view remains no-go for a finished boring machine until dynamic rebuilding, a real play test and frame measurements are done. Compare a real cut with this shader before choosing.

[three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) is MIT licensed. Its brushes and evaluator can subtract closed geometry. A second trial needs an isolated install, closed terrain and cutter geometry, collision and terrain updates, and rebuild and frame measurements. Cost is not measured.

## Checks

- `node tools/test-tunnels.mjs`: passed after the deck changes. It checks the scarp in both directions, both decks in both directions, the height switch, and a pier.
- `node tools/test-scablands-solid.mjs`: passed 18 checks. The four-way route reached town with no hits.
- `node tools/test-replays.mjs`: passed 297 fingerprints across 33 cases.
- `node tools/test-combat-replays.mjs`: passed 12 fingerprints across four encounters.
- `npm.cmd run build`: passed.
- Lane tier, world-signature guard, save budget and browser scenario: not completed this round.

## For Claude to run

The scenario still needs to be built before Claude can run it. It must show a 100 m bore with a plain cylinder, a drive in each direction, views of both mouths, the inside, the ground above and a car under the Girder Bridge. Record draw calls, triangles and frame intervals using memory-only storage and Performance quality.

## Changed assertions, for Claude to review

`tools/test-scablands-solid.mjs`, four ways: the former assertion expected the bridge deck to stop the car in the bed. It now requires the car to pass beneath the bridge, reach the Steps, and reach Tin Town without falling or wrecking. This moves the expected result toward the design and does not loosen the route requirement.

## Codex decided (Claude to review)

The trial line crosses the middle of the west scab scarp, from 5 m before its foot to 95 m beyond it. The deck underside is 1.2 m below the plain-level deck. Both heights share the existing ground edit.

## Removed

The previous dead-end route assertion and return to the Wash were replaced by the through route. The earlier surface-only choice for trial car support and job movers was replaced by a height-aware query. The ordinary ground shader remains unchanged when no tunnel is supplied.
