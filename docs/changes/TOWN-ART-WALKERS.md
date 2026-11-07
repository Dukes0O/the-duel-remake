# TOWN-ART-WALKERS

## Changed

- Corrected each swing-leg mesh's lateral local position to cancel the pivot offset, preserving the photo-carved stance at rest.
- Kept long coats and ponchos as continuous photo-carved upper meshes to a knee-level hem; legs begin below that hem.
- Added 12-pixel reference-photo colour bleed outside each carved silhouette.
- Exported `walkers.glb` (781,920 bytes) and added the round 4 comparison sheet and review note.

## Checks

- `tools/test-blender-output.mjs`: passed, 304 checks, 0 failed.
- `tools/test-repo-hygiene.mjs`: pending.
- Blender export and empty-scene renders completed. The recipe checked all 13 figures against 450 triangles and exported the GLB under 1 MB.
- Browser and in-game look checks were not run in this lane. Claude should inspect the two-leg count from front/side/back, foot stance, pack visibility, pale edges, photo tint, coat hem artifacts, and mayor-height readability.
- Changed assertions: none. Race fingerprints: not applicable; no race code changed.

## Removed

- Removed older round 2 and round 3 sheets and review notes; round 4 replaces their evidence.
- Removed after review: temporary renders, Blender build file and check logs (not committed).
