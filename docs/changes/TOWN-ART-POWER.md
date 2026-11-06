# TOWN-ART-POWER change note

## Changed

- Added `tools/blender/town-power.py`, a rebuildable recipe for the first card asset: `windmill`, with a separate `windmill:rotor` node. Reused the existing town material pictures and `town_base.py` geometry/export helpers.
- Exported `public/assets/models/wasteland/town/power.glb` and rendered the comparison views from the exported GLB imported into a fresh Blender scene.
- Added the `town-power` output entry and focused GLB assertions to `tools/test-blender-output.mjs`.
- Submitted one compressed comparison sheet at `docs/board/looks/town-art-power/round-1.jpg` (under 500 KB) with scores and review note beside it.

## Checks

- Blender 4.5.13 build and GLB re-import: completed; rendered driver-height and 45-degree mayor views. The final GLB passed the 1,800-triangle and 3 MB candidate limits; exported metallic factors are at or below 0.28.
- `node tools/test-blender-output.mjs`: 275 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; placement clean. Existing repository size targets remain advisory.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed on both runs. The unrelated audio-analysis test could not spawn `ffmpeg` (`spawnSync ffmpeg EPERM`); JPG publication checks passed. No assertions were changed.
- Browser and game look checks: not run here; Claude should inspect the comparison sheet, especially hub-to-blade integration, photo likeness and roof-view readability.
- No race simulation changed; replay fingerprints not applicable.
- No assertions were weakened.

## Scope and review

This is the one-piece first round requested by the card instructions. Generator, solar rack, fuel depot and power pole are not included yet. My self-review scores are 2/5 photo likeness, 2/5 materials, 3/5 shape and 3/5 construction. The gap is recorded in the round note; Claude should judge whether this is adequate to continue with the next card asset.

## Removed

- No tracked runtime asset, recipe or test was replaced. Temporary renders, generated reference copy, Blend scene and Blender logs were removed after creating the comparison sheet.
