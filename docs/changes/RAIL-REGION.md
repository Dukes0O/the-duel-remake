# RAIL-REGION

## What changed

- Added `src/world/regions.js` with pure region lookup, ground-height and place conversion helpers. The Whites origin is world `(1500, 0)`, east of the ring road and the Scablands mesa. Its west edge meets the Scablands height; the bank rises 17 m over 500 m, then reaches a near-flat plateau.
- `branch-open` is the explicit opening mark. Course ground and scene creation receive marks as data. With no marks, the existing Scablands height path is unchanged.
- Added the Whites scene. It loads `whites.glb` only when open, takes its nine story nodes by name, and draws a near-white salt surface. Missing art is handled as a view load error.
- Added a named road-and-rail join in the region table. The road remains a named join because connecting it through the east mesa would require changing how `src/course.js` treats the ring road.
- Added view-only white fog for `salt-storm`. The renderer reads story marks and clears the fog after `rail-2-15-off-bank`. The scene names the silent-until-added cue `rail.salt-wind`.
- Added `tools/test-rail-region.mjs`. Test discovery registers it automatically.

## Design choices and remaining work

- The east origin is `(1500, 0)`. The Whites covers local coordinates from `-500` to `500` on both axes. Its bank foot and top use the section 5 coordinates.
- The off-bank story mark was named `rail-2-15-off-bank`; RAIL-JOBS-2 should use that exact id when it connects the story result to view state.
- RAIL-JOBS-2 still needs to pass `branch-open` into course and scene data, convert its `white(...)` job places with `placeToWorld`, and provide the state that starts the storm. The road join is named for that follow-up; ring-road behavior was not changed.
- The frame check waits until RAIL-JOBS-2 makes the area reachable. RAIL-FINISH owns that check.
- Claude should inspect the Whites GLB nodes, their grounding on the pale plateau, and the white fog in the storm. No browser or look check was run in this lane.

## Checks

- `node tools/test-rail-region.mjs`: passed; 3,500 closed-world samples match the prior Scablands formula, with bank, joins, place, lazy-load and storm-on/off simulation isolation checks.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean. Existing size targets remain advisory.
- `node tools/test-replays.mjs`: passed; 297 replay fingerprint checks.
- `node tools/test-world-composition.mjs`: passed; 63 immutable-feature and world-signature checks.
- `npm run build`: passed. Vite reported existing large-chunk and ineffective dynamic-import warnings.
- Lane tier, browser checks and frame check were not run, as directed for this card.
- Existing assertions were not changed. Replay fingerprints and world signatures stayed unchanged.

## Removed

Nothing was replaced or removed.
