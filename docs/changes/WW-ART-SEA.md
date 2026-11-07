# WW-ART-SEA change note

## Changed

- Reworked the new gear casting as a traced 15-degree annular wedge from `sea-gear-section.jpg`, repeated 24 times around a 7 m wheel. Added a generated dead-on six-spoke hub photo, traced slab spokes with open gaps, and a closed lathe boss. The old wheel keeps its rotten face; its lathe hub now has a cap face.
- Raised the harbour wall to 6 m by 3 m with a proud, paler coping box and six large lathe rings on staples. Kept the photographed weed on its lower face and the in-memory repeat blend.
- Set the causeway bank to a 4 m rise and 8 m top width, with 1.74 m rail gauge and proud rails, sleepers and the in-memory repeat blend.
- Added the 8 m by 6 m harbour gate frame with two separately named leaves at their outer hinge pivots. The steel and rivets use a dead-on generated photo; shut and open poses are shown in the recipe's exported-model renders. The wall and causeway pieces that passed in round 2 were left unchanged.
- Added one 8 m wide stone ramp through a 20 m wall segment. The opening is real; its stone deck slopes 1.8 m toward the seaward side, with matching masonry, the same 3 m thickness and a pale raised course. No passed round 2 geometry was changed.
- Added a 4 m wide, 1.6 m crown stone railway arch with a real through-opening, dark inner barrel, daylight view and rails at `z = ±0.87 m`. It keeps the 6 m wall height, 3 m thickness and raised stone course.
- Replaced round 1 evidence with the 1600 px wide round 2 sheet and review note. Added credit for the generated hub reference.

## Round 2 checks

- Blender export: passed. GLB readback: 19,112 expanded scene triangles (8,992 unique mesh triangles), 2,655,764 bytes; 32 nodes, 8 meshes.
- `node tools/test-blender-output.mjs`: passed, 308 checks, 0 failed. The first run failed the 3 MiB size budget at 4,086,904 bytes; scaling the generated hub photo in memory reduced the GLB, and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- Browser checks: not run in the lane. Claude reviewed the round 2 looks.
- Changed assertions: none. Race fingerprints: not applicable; art-only card.

## Removed

- Removed `round-1.jpg` and `round-1-review.md`, replaced by round 2 evidence. No round 2 evidence or passed asset was changed in this step.

## Round 3 checks

- Blender export: passed for all three additions. The current GLB is 2,890,648 bytes; final triangle readback and named test results follow after the evidence sheet is made.
- `node tools/test-blender-output.mjs` and `node tools/test-repo-hygiene.mjs`: not run yet; both are scheduled after all three pieces are in the GLB.
- Browser checks: not run in this lane. Claude should review the gate's shut and open views, its pivots and stone frame, along with the ramp and arch once they are finished.
- Changed assertions: none. Race fingerprints: not applicable; art-only card.

## Round 3 removed

- No files or assets were removed. Round 2 evidence and its passed wall and causeway art remain in place.

## Round 2, finished by Claude

The old gear's hub wears its own picture; the whole wheel is 24 slices sharing one mesh, around spokes that reach the rim; the recipe renders its own shots. Verdict in `docs/board/looks/ww-art-sea/round-2-review.md`. Removed: `sea-old-gear-rim.jpg`, no longer used, and round 1's sheet and note.
