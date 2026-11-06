# TOWN-WORLD second pass

## Changed

- Merged `integration/wasteland` as requested. Resolved the conflicts in the world-job mode and course imports while retaining the landed Deep, Bowl and The Dig work.
- Town collision lookup now uses 8 m world cells. Each collision query checks only the nearby cells; it does not walk the town's buildings or people. This removes the town-wide candidate scan.
- Reserved the Everburn chase route through the Boneyard and the return paths for the prospectors. These are drawn as dirt roads, so crowded towns cannot block those jobs.
- When a town layout is active, the Scablands scene dynamically loads the town instance builder and draws its roads, sites and buildings. Without a layout, that builder is not imported.
- A town gate interaction returns to the yard and opens its Scrapdome panel through the app event handler.
- Moved the Dome collider to z = -168.5 to match the town-world data and town view.
- Updated `tools/scenarios/town-world.mjs` for Claude's browser check.

## Checks

- `node tools/test-town-world.mjs`: passed, 4 tests.
- `node tools/test-everburn-easy.mjs`: passed unchanged; all nine jobs finished 10/10.
- Crowded-town proof: the unchanged Easy driver ran against a town filling every unreserved cell; all nine jobs finished 10/10 in about 35 seconds.
- `node tools/test-replays.mjs`: passed (exit 0).
- `node tools/test-world-composition.mjs`: passed (exit 0).
- `npm.cmd run build`: passed. Existing dynamic-import and large-chunk warnings remain.
- Browser scenario: Claude runs. Check the town drive start, gate prompt, interaction return to the Scrapdome panel, roads, sites and stand-in building boxes. No browser check was run in this lane.
- Race fingerprints: no replay fixture changed. `test-replays` and the unchanged Everburn Easy proof passed.
- Changed assertions: none. The building collision fixture now places its hall on the Scablands driving line so the test exercises a car's real approach to a town solid.

## Removed

- Replaced the town obstacle course-distance list with the cell index. Removed the temporary crowded-proof runners after the check. No other tests, docs, code paths, assets or tools were removed.
