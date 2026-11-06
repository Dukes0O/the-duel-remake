# TOWN-ART-FOOD

## Changed

- Added the town food Blender recipe and `food.glb` with all 12 named plots.
  The soup kitchen is the focal building; the recipe also models the
  greenhouse, goat pen, chicken run, three stalls, three shopfronts, canteen
  and market hall.
- Added four credited 512 px food material pictures. The exported GLB embeds
  its pictures as separate 256 px JPEGs.
- Added per-building geometry, texture, UV and metallic checks to
  `tools/test-blender-output.mjs`.
- Submitted the round 1 comparison sheet for Claude's review.

## Checks

- Blender 4.5.13 LTS: exported the GLB, imported it into an empty scene and
  rendered soup-kitchen and family views. The render log has no errors.
- `node tools/test-blender-output.mjs`: passed, 267 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs`: passed. Existing size targets are
  advisory; the new sheet is 167,439 bytes.
- `node tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The audio
  evidence subtest could not start `ffmpeg` (`EPERM`). One same-state rerun
  had the same result. The sheet publication subtest passed.
- Browser check: Claude runs the art look check. No browser or frame check was
  run in this art lane.
- The model is 1,757,980 bytes and has 25,680 triangles across the family.
  All 12 plot budgets pass. Embedded images total 589,824 pixels.
- Race fingerprints: none changed; no race code changed.

## Changed assertions

No existing assertions changed. Added a check for each plot's name, parent,
triangle limit, picture coordinates, texture budget and metallic value.

## Removed

Removed the temporary Blender log, renders and sheet-building script from
the lane after recording their results. No prior asset or source was replaced.

## Claude should review

Please judge the soup-kitchen proportions and materials beside the photo,
then check whether the roof, three market goods and FOOD, TOOLS and FIX-IT
signs read at town and driver distances. The round sheet is
`docs/board/looks/town-art-food/round-1.jpg`.
