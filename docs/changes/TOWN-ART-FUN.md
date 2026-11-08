# TOWN-ART-FUN change note

## Changed

- Rebuilt both stalls with photo-mapped red and cream or yellow and red canvas awnings, sloping toward the road with scalloped hems.
- Replaced counter faces with each stall's photographed planks: weathered wood for hit-the-can and painted red/yellow boards for sweets. Lowered the cans and jars so they stand on their counter or shelf.
- Added a GLB read-back axis check. The hit-the-can counter kick is 0.40 m tall on Blender Z, which is exported Y; stall parts pass their footprint and contact checks.
- Round 21 sheet: 243,520 bytes. Family GLB: 4,589,632 bytes. Stall triangles: hit-the-can 1,242; sweets 1,674.

## Checks

- Blender family export: passed. The GLB read-back axis check and recipe bounds/contact checks passed.
- Imported-GLB renders: passed for front, side, rear, overhead, two three-quarter views and mayor view for both stalls. The camera uses Blender's valid local Y up axis; a same-axis track/up pair had rolled the prior comparison views and has been corrected.
- `node tools/test-blender-output.mjs`: passed, 377 checks, 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed. The report lists repository-wide size targets as advisory.
- `node tools/test-review-evidence.mjs`: 7 passed, 2 failed. One check still stats the round-20 JPG that this task replaces with round 21. The other failed because `ffmpeg` could not start (`spawnSync ffmpeg EPERM`). No assertions were changed.
- Browser and in-game checks: Claude owns these; none were run.
- Changed assertions: none.
- Race fingerprints: not applicable; no race logic changed.

## Removed

- Deleted the superseded `docs/board/looks/town-art-fun/round-20.jpg` and `round-20-review.md` as requested. Replaced the prior round 20 stall models in the family GLB; other buildings and accepted review rounds remain.
- Removed Blender's unused blue/grey patch panels and erroneous rolled-camera review setup from the stall recipe.
