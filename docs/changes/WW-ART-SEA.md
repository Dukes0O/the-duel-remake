# WW-ART-SEA change note

## Changed

- Reworked the new gear casting as a traced 15-degree annular wedge from `sea-gear-section.jpg`, repeated 24 times around a 7 m wheel. Added a generated dead-on six-spoke hub photo, traced slab spokes with open gaps, and a closed lathe boss. The old wheel keeps its rotten face; its lathe hub now has a cap face.
- Raised the harbour wall to 6 m by 3 m with a proud, paler coping box and six large lathe rings on staples. Kept the photographed weed on its lower face and the in-memory repeat blend.
- Set the causeway bank to a 4 m rise and 8 m top width, with 1.74 m rail gauge and proud rails, sleepers and the in-memory repeat blend.
- Added the 8 m by 6 m harbour gate frame with two separately named leaves at their outer hinge pivots. The steel and rivets use a dead-on generated photo; shut and open poses are shown in exported-model renders. The wall and causeway pieces that passed in round 2 were left unchanged.
- Added one 8 m wide stone ramp through a 20 m wall segment. The opening is real; its stone deck slopes 1.8 m toward the seaward side, with matching masonry, the same 3 m thickness and a pale raised course. No passed round 2 geometry was changed.
- Added a 4 m wide, 1.6 m crown stone railway arch with a real through-opening, dark inner barrel, daylight view and rails at `z = +/-0.87 m`. It keeps the 6 m wall height, 3 m thickness and raised stone course.
- Replaced round 1 evidence with the 1600 px wide round 2 sheet and review note. Added credit for the generated hub reference.

## Round 2 checks

- Blender export: passed. GLB readback: 19,112 expanded scene triangles (8,992 unique mesh triangles), 2,655,764 bytes; 32 nodes, 8 meshes.
- `node tools/test-blender-output.mjs`: passed, 308 checks, 0 failed. The first run failed the 3 MiB size budget at 4,086,904 bytes; scaling the generated hub photo in memory reduced the GLB, and the rerun passed.
- `node tools/test-repo-hygiene.mjs`: passed. Size targets are advisory.
- Browser checks: not run in the lane. Claude reviewed the round 2 looks.
- Changed assertions: none. Race fingerprints: not applicable; art-only card.

## Round 3 checks

- Blender export: passed. Read back from the final GLB: 20,544 expanded scene triangles (9,984 unique mesh triangles), 2,890,648 bytes; 43 nodes and 18 meshes.
- `node tools/test-blender-output.mjs`: passed, 308 checks and 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed placement; size targets are advisory.
- Browser checks: not run in this lane. Claude should review the gate's shut and open poses and pivots, the wall joins in each three-quarter view, the ramp slope, and the arch opening and rail gauge.
- Changed assertions: none. Race fingerprints: not applicable; art-only card.

## Round 4 work

- Point 1: gave the gate and ramp coping the same dam gatehouse stone photo and UV scale as the harbour wall coping. Both remain at y = 5.55–6 m for a continuous top course.
- Point 2: the gate leaf mesh origins are already on their outer hinge lines; changed the open pose to a 90-degree swing about the vertical hinge axis, toward seaward, so both leaves remain visible against the frame sides.
- Point 3: replaced the ramp's lintelled frame with an open-sky passage between two 6 m high, 3 m thick, 16 m long wall sections, leaving an 8 m clear width. Added one 16 m slope from 1.5 m landward to ground at the seaward end; the inner walls retain the photographed lower weed band.
- Point 4: preserved the arch photo and ring while blending only the upper stone's outer 5% toward the harbour wall photo at both ends. Raised the arch sleepers and rails to the causeway's 4.18–4.55 m track level.
- Point 3 follow-up: added the same dam-stone coping course at y = 5.55–6 m to both ramp walls so they meet the harbour wall's full six-metre height.
- Render follow-up: added a three-quarter open-gate view and kept the ramp shot to its two ramp walls; distant wall copies intersected the ramp and obscured its shape.
- Camera follow-up: moved the ramp's car-height three-quarter view to the landward approach so the cobbled slope reads between the walls.
- Export follow-up: scaled packed photos to 700 px maximum so the expanded ramp detail stays within the card's 3 MiB GLB budget.
- Budget check follow-up: the first rebuilt GLB remained 3,225,140 bytes because several recipe photos were not in the scaling list. The recipe now scales every packed photo to 640 px maximum.
- Coping follow-up: matched each gate and ramp coping face's UV span to the shorter piece length and the wall coping's stone density, so the texture reads as stone instead of a pale, over-tiled strip.
- Arch follow-up: raised the opening floor to the causeway's 4 m deck, added the embankment base below it, and lifted the dark inner barrel to the same opening. The 1.6 m arch clear height now admits the aligned 4.36–4.55 m rails.
- Arch view follow-up: removed crossing wall copies from the isolated three-quarter review camera so the aligned rails, dark inner barrel and daylight opening stay visible.

## Removed

- Round 1's sheet and note were removed in round 2. This task kept round 2 evidence and the passed wall and causeway art.
- Deleted this task's Blender renders, comparison images and test logs under `.qa-dist/ww-art-sea/`; preserved `.qa-dist/task.md`.
- Round 4 replaced round 3's sheet and review note. Its temporary render images, montage helper and test logs were deleted from `.qa-dist/ww-art-sea/` after review.

## Round 4 checks

- Blender export and empty-scene Standard renders: passed. Final GLB readback: 20,556 scene-node triangles (9,996 unique mesh triangles), 2,181,244 bytes; 44 nodes and 19 meshes.
- `node tools/test-blender-output.mjs`: passed, 308 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed placement; size targets are advisory.
- Browser and look verdict: Claude's review is requested in `docs/board/looks/ww-art-sea/round-4-review.md`; browser checks were not run in the lane.
- Changed assertions: none. Race fingerprints: not applicable; art-only card.

## Round 2, finished by Claude

The old gear's hub wears its own picture; the whole wheel is 24 slices sharing one mesh, around spokes that reach the rim; the recipe renders its own shots. Verdict in `docs/board/looks/ww-art-sea/round-2-review.md`. Removed: `sea-old-gear-rim.jpg`, no longer used, and round 1's sheet and note.

## Merged so far

Gate on 43ffa060: lane tier 46 of 47 and build passed. The one failure, `test-review-evidence`, names `docs/board/looks/town-art-power/round-4.jpg`, another card's sheet with no review note, not this card. The card stays open for the iron mule's gear, the works camp, the big magnet, Mrs Vane and the water front.

## WW-ART-SEA point 1: wagon photos

- Added matched side, end and overhead reference photos for one empty, weathered flat wagon. The side view anchors the two companion views. Credited in the sea texture folder.
- Removed: none.

## WW-ART-SEA point 2: measured wagon layout

- Measured all three generated views with `tools/photo_grid.py` and saved the grids under `.evidence/` for review.
- The wagon follows the Mule recipe in commit `146ede6f`: 1.66 m rail gauge (rails at x = +/-0.83 m) and 0.80 m coupling height. Side measurements place the 7 m deck at x = -3.5 to +3.5 m, y = 1.12 m, and its two visible wheel centres near x = -2.44 and +2.09 m, y = 0.34 m, radius 0.34 m; each axle has wheels at z = +/-0.83 m. The measurement comment is in the sea recipe.
- The named source file is absent from this branch working tree; its lane commit is readable in Git history. No source file was copied or changed.
- Removed: none.

## WW-ART-SEA point 3: empty iron-mule-gear

- Added the `iron-mule-gear` root with a photo-textured deck, two traced side frames, end beams, four lathe-turned wheels, buffers and coupling stems at the measured 0.80 m height and 1.66 m gauge.
- Blender export and its Standard-view empty-scene side, end and quarter renders completed. The first look found the far wheels were offset inboard; the second export corrects the outward-facing wheel stations. That fault and fix are now in `docs/ART_LINE.md`.
- Removed: none.

## WW-ART-SEA point 4: overloaded wagon

- Reused the existing `gear-section` mesh and its material as four linked instances. They form a high stack with the top casting tilted. Added two interlinked iron tie-downs that pass over the load and sag slightly between their deck-edge anchors. The loaded side sills bow downward by 0.11 m.
- The first loaded render showed the shared mesh instances offset on Blender's wrong up axis. Corrected the translation to the Z-up Blender transform and recorded the fault in `docs/ART_LINE.md`.
- Added a render-only length of track at the Mule's 1.66 m gauge for the two loaded quarter views. It is not included in the exported wagon model.
- Blender export and Standard-view empty-scene renders completed. Looked at all four wagon views; the load now rests on the deck, and the sheet uses empty side/end views beside the photos plus both loaded track views.
- Removed: none.

## WW-ART-SEA point 5: final look and checks

- Rendered side and end views from the exported GLB in an empty Standard-view scene beside their matching photos. Rendered two full-wagon quarter views from about 20 m at car height, with a render-only rail segment at the Mule gauge. Looked at all five render files. The final sheet is edge-to-edge, 1600 px wide, and below 500 KB.
- Review note records the visible end-photo mismatch: its wheel faces point at the camera, unlike the correct edge-on wheel orientation in the model. The source was not overwritten.
- Final GLB readback: 32,228 expanded scene triangles (19,908 unique mesh triangles; 11,672 in `iron-mule-gear`), 2,937,916 bytes. Tightened the candidate GLB `maxBytes` from 3 MiB to the measured 2,937,916 bytes; the limit is now the exact committed asset size.
- `node tools/test-blender-output.mjs`: first run failed the Blender-free `--paths-only` assertion because `mathutils.Vector` was imported before the Blender-only guard. Moved it below the guard; rerun passed, 316 checks and 0 failed. No assertion logic was loosened.
- `node tools/test-repo-hygiene.mjs`: passed file placement; reported size targets as advisory.
- Browser checks: not run in this lane; Claude owns browser and look review. Race fingerprints: not applicable, art-only change.
- Removed: temporary photo grids, render PNGs and test logs under `.evidence/` and `.qa-dist/`; preserved `.qa-dist/task.md`.

## The Mule's gear wagon, rebuilt by Claude

`iron-mule-gear` is 6.8 m long on the Mule's 1.66 m gauge, with couplings at 0.80 m. The frame is one traced picture on each side. Six castings stand in two rows and a seventh lies on top, all sharing the `gear-section` mesh. The check in `tools/test-blender-output.mjs` now builds through `iron-mule-gear`, and the file's limit is 3.4 MB, because the wagon adds three photos.

### Removed

The primitive spoked wheels, the bent side sills and the tall column of castings.

## WW-ART-SEA works-camp

- Added `works-camp` to `public/assets/models/wasteland/scablands/sea-camp.glb`, built by `tools/blender/sea-camp.py`. The model has one root, two differently turned huts sharing one carved hut mesh, a long kitchen, linked traced ladders and stilt frames, and a traced washing line. The floors stand 3 m above ground. Dark flood marks and weed sit at the timber feet. Nine generated, measured source photos are credited in the scablands texture folder.
- Final GLB readback: 15,942 triangles across unique mesh definitions (31,088 for all placed instances) and 998,376 bytes. The candidate budget check counts the unique GLB mesh definitions. The review sheet is `docs/board/looks/ww-art-sea/round-6.jpg` (1600 × 800, 162,170 bytes).
- `tools/test-blender-output.mjs`: passed, 320 checks and 0 failures. `tools/test-repo-hygiene.mjs`: passed; reported size targets are advisory.
- Blender exported and reimported the GLB, then rendered the side comparison and two full-camp views with the Standard view transform. Browser checks were not run in this art lane; Claude should review the hut/photo comparison and both camp views in the sheet.
- Changed assertions: none. Race fingerprints: not applicable; this is model-only art.
- Visual verdict: yes, the tall braced legs, old tide marks, weed, ladders and laundry make the camp look prepared for the water.

### Removed

The 320-byte export proof from step 1 was replaced by the completed camp model. No other built asset was removed or changed.

## WW-ART-SEA point 4: Mrs Vane

- Added the `mrs-vane` root to `public/assets/models/wasteland/scablands/mrs-vane.glb`, built by `tools/blender/sea-vane.py`. It uses the walkers' `upper`, `leg-l` and `leg-r` carved pieces, with the matching leg pivots `mrs-vane:leg-l` and `mrs-vane:leg-r`; the coat remains one closed skirt above the hem. Added the separate front-photo slab `mrs-vane:envelope` and named gloves.
- The leg pivots sit at x = -0.095 m and +0.095 m, y = 0 m, at the measured 0.267 m coat hem. Foot readback passed: world ground z = -0.007 m for both soles; world x = -0.082 m and +0.073 m against photo centres -0.044 m and +0.044 m, within the recipe's 0.07 m tolerance.
- Blender export and GLB readback passed: 8,748 triangles and 389,108 bytes. The exported model stays below the 9,000-triangle and 1.5 MB candidate limits.
- The recipe now supports the test suite's Blender-free `--paths-only` mode. The first Blender output suite run found this omission (321 checks, one failure); after adding it, the rerun passed (324 checks, zero failures). No test assertions changed.
- Removed: the unfinished earlier model export was replaced with the final `mrs-vane.glb`; the broken round-7 sheet was replaced by the final comparison sheet. No other built asset was changed.

## WW-ART-SEA point 5: look and checks

- Rendered front, side and back comparisons beside their photos at matching orthographic cameras, plus a face close-up, a three-quarter view from about 6 m at car height and a size comparison beside `walker-a`. All shots came from the exported model in an empty Standard-view scene. I inspected the renders and built the edge-to-edge `docs/board/looks/ww-art-sea/round-7.jpg` sheet (1600 x 1500, under 500 KB).
- The front-facing surfaces select the front reference photo with the walker-style `carve_hull` method. I tried a targeted UV override for the face, saw it make the close view worse, and removed it. The face is legible and calm, though the head outline remains faceted; the white coat is smooth and heavy, and the shallow envelope slab projects away from the coat in profile. These are called out for Claude's look review.
- `node tools/test-blender-output.mjs`: passed, 324 checks and 0 failures on rerun. `node tools/test-repo-hygiene.mjs`: passed placement; size targets are advisory.
- Browser checks and browser look review: not run in this lane. Claude should review the face, profile envelope placement, coat silhouette and crew scale from the round-7 sheet.
- Changed assertions: none. Race fingerprints: not applicable; model-only art.
- Removed: this continuation's Blender renders and logs under `.qa-dist/ww-art-sea/` were removed after making the sheet and recording results. `.qa-dist/task.md` was preserved.

## Mrs Vane, finished by Claude

`mrs-vane` lives in `mrs-vane.glb`: pieces `upper`, `leg-l` and `leg-r`, with leg pivots `mrs-vane:leg-l` and `mrs-vane:leg-r`, and `mrs-vane:envelope`. Her right side wears the side photo too, and her face reads from the front photo only.

### Removed

The first photo set, `sea-mrs-vane-{front,side,back,top}.jpg`, which nothing loads: the recipe uses the corrected `sea-mrs-vane-coat-*` set.
