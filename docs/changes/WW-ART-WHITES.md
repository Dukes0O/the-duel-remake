# WW-ART-WHITES

## Design

The card's salt heap has no fixed depth. Use the generated profile photo for the front silhouette and planar UV projection, then taper the rear outlines to give it volume. Set the full photo frame to 18 m wide; the heap spans about 14 m. The front sits 3.2 m from center; five outlines taper over 6.4 m of total depth. The quarter view remains subject to Claude's art judgment.

## Changed

- Replaced the symmetric radial heap with a silhouette measured from `whites-salt-heap.jpg`.
- Kept the full photo projection on the front face. The back and cut edges use the existing cracked-salt material.
- Reframed the exported-GLB side render to match the source photo's 3:1 frame and widened the quarter camera for a clearer depth view.
- Added the `ww-art-whites` output entry and checks for triangle/byte budgets, `TEXCOORD_0`, UV range and metallic caps.
- Added Blender-free `--paths-only` output planning after the new entry exposed the missing hook.
- Added the round-1 comparison sheet and visual notes.

## Checks

- Blender recipe: `blender -b --python tools/blender/rail-whites.py -- --root . --through salt-heap` - passed; 16,482 total triangles, 1,156,284 bytes.
- Blender-free plan: `python tools/blender/rail-whites.py -- --root . --through salt-heap --paths-only` - passed without writing output.
- `node tools/test-blender-output.mjs` - passed, 296 checks, 0 failed. Its first run found the missing `--paths-only` hook; the recipe now supports it.
- `node tools/test-repo-hygiene.mjs` - passed; placement is clean and size targets are advisory.
- No lane tier, build, game look or frame check: this is an art-only card, and it is not wired into gameplay.
- The exported side and quarter renders are in the comparison sheet. The quarter view awaits Claude's look judgment.

## Removed

- Removed the symmetric radial mound geometry. The photo-measured outline and projected front replace it in the same recipe and GLB.
- No texture source was removed. The existing source images and `CREDITS.md` entries remain.
