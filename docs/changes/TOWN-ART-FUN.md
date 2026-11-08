# TOWN-ART-FUN change note

## Design

Built only `mud-pit`, as a 4 by 4 cell hollow earth bowl. The bowl uses a 48 by 48 grid for a sunken churned-mud floor, rising banks, and two opposite ramps. Four tyres mark the edges. A three-row plank stand is carved from its own photos, with its scaffold traced separately so it stays open underneath. Existing attractions remain unchanged.

## Changed

- Added the generated orthographic mud-pit photo set and the stand's four-view photo set with source credits in the recipe.
- Added the 9,116-triangle bowl, carved seat rows, traced stand frame, and four bank tyres to `fun.glb`.
- Added the round-23 imported-GLB comparison renders and 1600 by 2070 JPEG review sheet (197,006 bytes).
- Added per-piece world bounds and ground/contact checks. No assertion or tolerance changed.

## Checks

- Export/read-back evidence in `.qa-dist/town-art-fun-round-23-build.log`: completed. The pit bounds/contact checks printed for every piece; the pit total was 9,116 triangles. Family GLB: 5,243,804 bytes.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed, 568 checks. Existing unrelated failures: the crew browser and Blender manifests disagree on the evidence date (`2026-11-07` vs `2026-11-08`), and audio analysis could not launch ffmpeg (`spawnSync ffmpeg EPERM`). The review-JPG publication check passed. No test assertions changed.
- Lane tier and `npm run build`: not run; the card brief says art work does not run them.
- Claude should inspect the side and end comparisons for the hidden floor, the stand's three seat rows and open frame, and both three-quarter and mayor views in-game.
- Race fingerprints: not applicable; no race logic changed.

## Removed

- No earlier attraction was removed or changed. Temporary Blender renders, masks, and logs for round 23 are removed after the sheet and note are committed.
