# TOWN-ART-OUTPOSTS round 5

Added `plane-school` from generated orthographic references, carved its fuselage through `carve_object`, and added its slide as a separate photo-textured mesh. Kept Dot's Diner in the family GLB without changing its recipe. Added source credits and a note to `docs/ART_LINE.md` about generated photo-board panels having different scales. Raised the family triangle ceiling by 7,000 to 21,000 and added per-building checks at 14,000 each.

**Checks:** Blender 4.5 recipe run completed and exported/read back the 1.92 MB GLB. Read-back measurements: 17,368 family triangles; diner 10,364; school 7,004. `node tools/test-blender-output.mjs`: 312 checks passed, 0 failed. `node tools/test-repo-hygiene.mjs`: passed. `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed; unrelated failures: an existing missing `town-art-power/round-4-review.md`, and `spawnSync ffmpeg EPERM`. The 50 px photo grids were inspected; the clean side and overhead views align to their original fuselage landmarks after plan-view scale normalization. No browser or game look check is run in this lane.

**Claude look checks:** inspect the seven model views in `round-5.jpg`, especially school end textures, the tail roof gap, slide projection, windscreen joins, and lettering on both sides. For road, far-side and mayor views, the sheet labels the nearest orthographic photo reference; this round did not generate matching oblique photos. The model's end views remain visibly rough and are not claimed as a pass.

**Changed assertions:** added named school body/slide checks, per-building triangle limits, and a summed family ceiling. Existing assertions and tolerances were not loosened.

**Race fingerprints:** not applicable; this is an unconnected art asset.

**Removed:** none.
