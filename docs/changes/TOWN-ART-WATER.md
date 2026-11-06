# TOWN-ART-WATER change note

## Design

Built the six waterworks models from the town plan and the photo reference.
The recipe uses the checked-in tin and limestone photographs to make the
shared 1K atlas, and frames close and driver-height views so the structures
read at both scales. The reservoir water remains a flat movable scoop surface.

## Review

`docs/board/looks/town-art-water/round-1.jpg` is 294,236 bytes. The revised
sheet was inspected after the rebuild. Self-review: silhouette/readability
4/5, materials 4/5, scale/site composition 3/5. The family reads as a gritty
waterworks site with distinct buildings and visible process stages. Claude
should check the driver-height view's tower framing and the treatment plant's
stage readability from above. No browser or Chrome checks were run; Claude
owns those checks.

## Checks

- `tools/test-blender-output.mjs`: passed, 239 checks.
- `tools/test-repo-hygiene.mjs`: failed because its placement rule rejects
  JPGs anywhere under `tools/`, while this card explicitly requires the tin
  and limestone source pictures under `tools/blender/`. The assertions were
  left unchanged and the recipe inputs remain in the required location.
- `tools/test-review-evidence.mjs`: 8 checks passed, 1 failed because
  `ffmpeg` could not start (`spawnSync ffmpeg EPERM`), the known environment
  failure for this suite.
- Blender 4.5.13 rebuild and eight evidence renders: passed; exported GLB is
  `public/assets/models/wasteland/town/water.glb`.
- No game code, race behavior, assertions, or fingerprints changed.

## Removed

Removed the donor import and replacement path that deleted the authored meshes
and overlaid mis-scaled donor parts. Removed no existing player assets or saves.
