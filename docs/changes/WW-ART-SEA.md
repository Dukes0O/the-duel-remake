# WW-ART-SEA change note

## Changed

- Reworked the new gear casting as a traced 15-degree annular wedge from `sea-gear-section.jpg`, repeated 24 times around a 7 m wheel. Added a generated dead-on six-spoke hub photo, traced slab spokes with open gaps, and a closed lathe boss. The old wheel keeps its rotten face; its lathe hub now has a cap face.
- Raised the harbour wall to 6 m by 3 m with a proud, paler coping box and six large lathe rings on staples. Kept the photographed weed on its lower face and the in-memory repeat blend.
- Set the causeway bank to a 4 m rise and 8 m top width, with 1.74 m rail gauge and proud rails, sleepers and the in-memory repeat blend.
- Replaced round 1 evidence with the 1600 px wide round 2 sheet and review note. Added credit for the generated hub reference.

## Checks

- Blender export: passed. GLB readback: 19,112 expanded scene triangles (8,992 unique mesh triangles), 2,655,764 bytes; 32 nodes, 8 meshes.
- `node tools/test-blender-output.mjs`: passed, 308 checks, 0 failed. The first run failed the 3 MiB size budget at 4,086,904 bytes; scaling the generated hub photo in memory reduced the GLB, and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- Browser checks: not run in this lane. Claude should review the wall's 20 m car-height view, all repeated joins, and the gear section/hub shots.
- Changed assertions: none. Race fingerprints: not applicable; art-only card.

## Removed

- Removed `round-1.jpg` and `round-1-review.md`, replaced by round 2 evidence.
- Removed this run's temporary Blender renders, inspection scripts and logs under `.qa-dist/`; preserved the lane's `.qa-dist/task.md` brief.
