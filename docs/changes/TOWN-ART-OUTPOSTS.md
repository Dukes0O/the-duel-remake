# TOWN-ART-OUTPOSTS round 6

Replaced the plane-school source set with full-frame generated side, front, rear and overhead photos. Re-measured side landmarks and each end view on fresh 100 px grids. Updated the carve table, split SCHOOL into separate raised pieces on both walls, and rebuilt a broad photo-textured slide from the doorway to the ground. Dot's Diner's recipe and model geometry were not edited.

**Checks:** Blender 4.5.13 completed the recipe, exported and re-imported `outposts.glb` (2,322,328 bytes), then rendered eight review views. `node tools/test-blender-output.mjs`: 312 checks passed, 0 failed. `node tools/test-repo-hygiene.mjs`: passed. `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed, 2 existing failures (town-art-power lacks its matching round-4 note; ffmpeg could not start with EPERM). The side, front, rear, road, far-side and mayor views were inspected. The sheet pairs the four orthographic photos with corresponding exported-model renders and shows angled model views without photo references. Browser and in-game look checks were not run; Claude should inspect the front/rear body profile, broken wing/roof geometry in angled views, floating SCHOOL letters, and slide placement/width. No lane tier or build was run, per the art-card workflow.

The round 6 result remains visibly poor and is not claimed as a pass. Independently generated end views do not match the side/plan aircraft well; this causes the thin, fragmented fuselage and roof. The separate text pieces also float away from the walls. The slide is wider and reaches down, but its opening alignment remains uncertain. Claude judges the result.

**Changed assertions:** none.

**Race fingerprints:** not applicable; this is an unconnected art asset.

**Removed:** deleted the superseded `round-5.jpg` and `round-5-review.md`; round 4 remains. Replaced the round 5 school photos with round 6 sources. Removed temporary grid images, model renders, Blender scratch file and test logs. Dot's Diner unchanged.
