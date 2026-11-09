# TOWN-ART-MACHINES-2 — change note

## Changed

- Round 16 photo references and a photo-carved pipe truck with a separate empty-bed carve, built chassis and tyres, five named pipe cylinders, and a work pose that rolls four pipes onto the ground.
- Added the round 16 image credit and the two photo-carve lessons found during this round to `docs/ART_LINE.md`.
- Added the six-view comparison sheet and review note.
- Mixer and crane geometry stayed unchanged.

## Checks

- Blender 4.5.13 candidate export, bounds/contact output and imported-model renders completed.
- `node tools/test-blender-output.mjs`: 389 checks, 0 failed on the final family GLB.
- No lane tier, build, browser check or look test was run. Claude should review the six sheet panels, especially the cab/crane seams, the frame rails, and the work-pose pipe separation.
- No assertions changed. No race fingerprints apply.

## Removed

- Removed obsolete block geometry for the pipe truck.
- Removed `machines2-pipe-truck-views.jpg` and its credit line after replacement references were wired into the recipe.
