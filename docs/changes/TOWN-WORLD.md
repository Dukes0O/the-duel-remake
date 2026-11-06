# TOWN-WORLD second pass

## Changed

- Merged `integration/wasteland` as requested. Resolved the conflicts in the world-job mode and course imports while retaining the landed Deep, Bowl and The Dig work.
- Town collision lookup now uses 8 m world cells. Each collision query checks only the nearby cells; it does not walk the town's buildings or people. This removes the town-wide candidate scan.
- Reserved the Everburn chase route through the Boneyard and the return paths for the prospectors. These are drawn as dirt roads, so crowded towns cannot block those jobs.
- When a town layout is active, the Scablands scene dynamically loads the town instance builder and draws its roads, sites and buildings. Without a layout, that builder is not imported.
- A town gate interaction returns to the yard and opens its Scrapdome panel through the app event handler.
- Moved the Dome collider to z = -168.5 to match the town-world data and town view.
- Updated `tools/scenarios/town-world.mjs` for Claude's browser check.
- Replay collision now takes its layout from the active world-job definition. The process-wide Scablands layout still supplies road ground, but cannot select replay solids.
- Town solids are indexed in every 8 m cell their footprint covers, padded by 3 m (the largest car collision radius). A query deduplicates solids and preserves stable id order, so lookup work depends on nearby cells and candidates rather than town size.
- Fixed the town browser scenario to write its report through `node:fs/promises` and the runner's `context.outputDir`. It now captures the town, gate prompt and Scrapdome panel.

## Checks

- `node tools/test-town-world.mjs`: passed, 5 tests, including job-layout isolation and a wide building whose centre cell is outside the query neighbourhood.
- `node tools/test-everburn-easy.mjs`: passed unchanged; all nine jobs finished 10/10.
- Crowded-town proof: the unchanged Easy driver ran against a town filling every unreserved cell; all nine jobs finished 10/10 in about 35 seconds.
- `node tools/test-replays.mjs`: passed (exit 0).
- `node tools/test-world-composition.mjs`: passed (exit 0).
- `npm.cmd run build`: passed. Existing dynamic-import and large-chunk warnings remain.
- `node tools/run-browser-scenarios.mjs --scenarios town-world --jobs 1`: two attempts failed before any scenario step or screenshot because the Chrome DevTools connection closed. An earlier archived run records the fixed `context.writeFile` error from before this change. Claude should run the scenario and inspect `town-world-town`, `town-world-gate-prompt` and `town-world-scrapdome-panel`; confirm buildings and roads are drawn, the Dome prompt is visible, and the Scrapdome panel opens.
- Race fingerprints: no replay fixture changed. `test-replays` and the unchanged Everburn Easy proof passed.
- Changed assertions: none weakened. Added a regression assertion that one wide solid is returned once at its footprint edge while a different active global layout contains no such solid.

## Removed

- Replaced the town obstacle course-distance list with the cell index. Removed the temporary crowded-proof runners after the check. No other tests, docs, code paths, assets or tools were removed.
- Removed the scenario's unsupported `context.writeFile` call.
