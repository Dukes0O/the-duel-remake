# TOWN-ART-FUN change note

## Changed

Built only the 4x3 drive-in. Its billboard frame uses traced, slabbed front,
rear and side photographs with open bracing; `drive-in:screen` is a separate
emissive piece. Ten cars use traced side-photo silhouettes extruded into two
rows facing the screen. Added four credited 1024-pixel-or-smaller orthographic
reference JPGs, the exported family model and the round-10 comparison sheet.
Earlier buildings and earlier sheets remain unchanged.

## Checks and review

- Blender 4.5 build and imported-GLB review renders completed. Bounds printed
  for all 15 drive-in meshes; every piece is within the footprint and grounded
  or touching another piece.
- First `node tools/test-blender-output.mjs` run: 377 checks, 1 failure. The
  drive-in was 14,016 triangles, 16 over its 14,000 limit. Removing the tiny
  bevel from the flat screen face kept the panel flat and reduced the count.
- Rerun `node tools/test-blender-output.mjs`: **377 checks, 0 failures**.
- Browser checks were not run in this art lane. Claude should assess the
  round-10 sheet, especially the amber emissive face versus its patchwork
  reference, the open truss silhouette, car spacing/facing and above view.
- Changed assertions: none. Race fingerprints: not applicable to this art
  change.

## Removed

Replaced the drive-in's box screen panels and box-built cars with the traced
frame and wreck meshes. No previously accepted building or review sheet was
removed.
