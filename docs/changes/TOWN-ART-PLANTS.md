# TOWN-ART-PLANTS round 4

## Changed
- Replaced the crusher's box-built chassis, hopper and body with one measured four-photo `carve_object` table. The carved body uses the existing side, front, rear and overhead references, with measured cuts for the detached belt and trapped background.
- Kept the rising belt photo-traced. Its mask follows measured steel rails and lattice strokes, with the white studio patch removed; added ground-reaching trestles and body ties. The jaw is its own carved mesh under `crusher:jaw`, with the node origin at the measured pivot.
- Replaced the plain gravel cone material with a cone wearing a crop from the overhead gravel photo. The exported model is 1,052,184 bytes and 12,242 triangles. Materials stay at metallic 0.3 or less.
- Added the round 4 review sheet with the source side photo, exported-model side view, both three-quarter views and the mayor view on mid-grey ground.
- Updated the art readback assertion for the new body, jaw, belt, gravel and chute nodes. Added the 14,000-triangle, UV-channel and UV-range checks.

**Self scores:** silhouette 3/5; material read 3/5; construction detail 3/5; family coverage 1/5.

**Visual note:** The body is carved and no longer assembled from box parts. The belt mask removes the enclosed white background patch and leaves lattice openings. Some side texture and silhouette transitions around the belt and lower body still look rough in the renders; Claude should judge those alongside the jaw pivot and mayor view. This round covers only the crusher, as requested.

## Checks
- `node tools/test-blender-output.mjs`: passed, 330 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean. The tool reports existing size targets as advisory.
- `node tools/test-review-evidence.mjs`: 6 passed, 3 failed. One failure expects the removed `round-3.jpg` that this task explicitly required deleting. One reports an existing date mismatch (`2026-11-06` vs `2026-11-07`); one cannot spawn `ffmpeg` (`EPERM`). The review-sheet size/publication check passed.
- Blender 4.5.13 export and fresh-GLB renders completed: side photo comparison, front and rear three-quarter, and mayor view.
- Lane tier and build: not run, per the art-card instruction.
- Browser checks: not run. Claude should inspect the full round 4 sheet and GLB, especially the carved silhouette, belt openings and supports, `crusher:jaw` pivot, gravel crop, UVs and material values.
- Changed assertions: replaced obsolete required box-piece names with the carved body, jaw mesh, gravel cone and chute lip; added budget and UV checks for this exported model. These assertions check the new card contract and are not loosened.
- Race fingerprints: not applicable to this art-only change.

## Removed
- Removed the box-built chassis, hopper plates, jaw housing and engine blocks from the crusher recipe.
- Removed the previous round 3 JPG sheet after producing round 4. Kept its review note as prior-round context.
- Removed temporary Blender renders, masks and test logs from `.qa-dist` after recording results.
