# TOWN-ART-MACHINES-2 — round 8

## Changed

- Generated and credited separate cab-only side, front, rear and overhead references. Replaced the mislabeled initial side reference with the correct side elevation after comparing its mask.
- Replaced the round 7 full-truck carve with a `carve_object` cab carve. Added paired box chassis rails and cross members, a lathed fuel tank, cab glazing and weld details, a rear platform and loading hopper. Kept the round 7 wheels, drum lathe, drum rollers and chute pivot.
- The cab masks intersect in a shallow shell about 0.47 m high. Added the welded shell and windows to make the cab readable; the result remains boxy and is submitted for Claude's judgment, not claimed as a pass.
- Removed the unused full-truck top reference. The three full-truck side/end views still supply wheel measurements; the isolated drum photo still supplies the drum lathe.

## Checks

- Blender model export and six comparison renders completed on Blender 4.5.13.
- `node tools/test-blender-output.mjs`: **384 checks passed, 0 failed** (complete run).
- Exported family: **3,897,688 bytes** (8 MB cap). Mixer truck: **12,196 triangles** (15,000 cap). The truck bounds and wheel-ground bounds were printed by the recipe; all six tyres have a zero-height lower bound.
- `round-8.jpg`: 231,820 bytes, below the 500 KB limit. It places each of the four photo/model views beside its paired render and includes both three-quarter poses.
- No test assertions changed. No gameplay code changed; no race fingerprints apply.
- Browser and in-game look checks were not run in this art lane. Claude should inspect the cab carve, front and overhead symmetry, wheel position under the body, and drum/chute motion on the sheet.

## Removed

- Removed `mixer-truck-top.jpg` and its credit line because the cab-only carve no longer uses it.
- Removed the static photo-carved full-truck body from the round 7 recipe; the moving drum remains only as the named lathe assembly.
