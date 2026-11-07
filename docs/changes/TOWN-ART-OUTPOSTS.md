# TOWN-ART-OUTPOSTS

## Changed

- Kept Dot's Diner in the family GLB and rebuilt only the plane school for round 8.
- Set the school tube table to `round: 2.4`, `ends_split: 0`, `front_favour: 3`, and `rear_favour: 3`. The exported body is 2.480 x 2.480 x 10.998 m against table values 2.379 x 2.528 x 11.484 m; each axis is within 5%.
- Raised the school 1.6 m and added timber trestles that reach the ground and belly. Added a sloped yellow slide with red rails, a door landing and short steps from the ground.
- Moved the 3 m SCHOOL slab to the wall under the windows after the door, on both sides.
- Edited measured pane and door rectangles in derived side and roof photo copies. The original photos remain intact. Dark glass and small children's paper shapes are embedded in the GLB.
- Added the round-8 comparison sheet (182,896 bytes) and review note.

## Checks

- Blender full export, GLB re-import and eight flat-lit renders: passed. Final GLB is 2,862,904 bytes. The body bounds are within 5% of the measured table on all axes.
- `node tools/test-blender-output.mjs`: passed, 312 checks.
- `node tools/test-repo-hygiene.mjs`: passed. Existing size advisories remain; the look-directory total is above its advisory target.
- `node tools/test-review-evidence.mjs`: 7 of 9 subtests passed. Two existing issues failed: `town-art-power/round-4.jpg` lacks its matching review note, and audio analysis could not spawn `ffmpeg` (`EPERM`). No assertions were changed.
- Browser and game look checks: not run in this lane; Claude owns them. Claude should inspect the round-8 sheet for pane alignment, the sign's door clearance, trestle contacts, slide slope and ground contact, and whole-school framing from the mayor view.
- Race fingerprints: not applicable; this model is not wired into gameplay.

## Removed

- Removed `round-7.jpg` and `round-7-review.md` as requested. Kept `round-4.jpg` and its review note.
- No original school reference photo was deleted or overwritten.
