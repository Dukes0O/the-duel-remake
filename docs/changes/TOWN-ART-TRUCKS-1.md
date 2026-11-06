# TOWN-ART-TRUCKS-1, round 7

## Changed

- Merged current `integration/wasteland` at `e0fe3c95c`; resolved the Blender output test conflict by retaining integration checks and restoring this card's truck checks. `node --check tools/test-blender-output.mjs` passed.
- Rebuilt only `fire-truck` from four generated dead-on photos with `Photo.sky(grey=26)`, `trace`, `slab`, `box` and `lathe`. The measured rectangles and widths live in the recipe. The other three truck builders remain as before.
- Added four source photos, credits, round 7 comparison sheet and review. The final family GLB is 3,999,832 bytes (about 3.81 MiB); the sheet is 155,819 bytes. Triangle counts: fire 8,107; tanker 11,173; supply 9,119; tow 8,973.
- The builder does not judge this a visual pass: the direct views are readable, while wheels are pale and the three-quarter views show separated flat pieces. Claude should judge before further truck work.

## Checks

- `node --check tools/test-blender-output.mjs` - passed after conflict resolution and after the card check update.
- `node tools/test-blender-output.mjs` - passed, 280 checks and 0 failures. The first run found a scratch-path mismatch and a metallic value rounded above 0.3; both were fixed before the passing run.
- `node tools/test-repo-hygiene.mjs` - passed. It reported existing advisory size targets only.
- Blender recipe - passed; exported the GLB, imported it into an empty scene, used the Standard view transform, and rendered all eight review views.
- Lane tier and build - not run, per the art-card instructions.
- Browser checks - not run. Claude should inspect all four direct photo comparisons, both three-quarter views, mayor-height view, driver-height view at 20 m, wheel grounding, the cab shell, the ladder and the cannon pivot.
- Changed assertions: updated the family size ceiling from 3 MB to the task's 8 MB. Replaced the four-paint-image assumption with checks for four measured fire-engine views and the three remaining trucks' separate photo materials. Added TEXCOORD_0 range, metallic, named part and per-truck triangle checks. The source recipe caps metallic at 0.29 to avoid a 0.3 float rounding over the limit. These changes match the approved family budget and keep every triangle and UV bound intact.
- Race fingerprints: not applicable; simulation code did not change.

## Removed

- Removed the round 6 sheet and review note as requested.
- No truck id or prior model builder was removed.
