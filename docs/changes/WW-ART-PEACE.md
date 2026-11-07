# WW-ART-PEACE round 5: Sal pipe trailer

Changed `sal-pipe-trailer` only. The pickup body and other props were not
changed.

## Changes

- Kept all four vehicle photos at their authored sizes. Raised this
  candidate's maximum from 2 MiB to 3 MiB, the allowed 1 MiB increase, so the
  full-size photos fit without reducing any other prop's images.
- Built the pipe load from a sky-flooded side-photo mask and traced 1.6 m slab.
  The slab follows the real sag. Bled the dedicated side image. The top surface
  uses the overhead image at measured scale; both ends use traced, bled cut
  pipe imagery.
- Measured pickup wheel centers at (95, 302) and (314, 302), radii 47 and
  46 px. Measured trailer wheel centers at (795, 312) and (861, 312), radii
  35 and 34 px. All four lathe wheels stand on Y=0, use their own side-photo
  wheel image, and have rectangular tyre tread tiles at measured scale.
- Replaced the old horizontal tongue with two sloped tow-bar arms that overlap
  the pickup coupler and trailer crossmember.
- Replaced round 4's sheet and review with
  `docs/board/looks/ww-art-peace/round-5.jpg` and `round-5-review.md`.
  The sheet is 1600 x 397 px and 104,647 bytes.

## Checks

- Blender export, GLB import into an empty scene, and the three 1200 px or
  wider review renders: passed. Render view transform: Standard.
- `node tools/test-blender-output.mjs`: passed, 304 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; no placement faults.
- Browser and in-game look checks were not run here. Claude should review the
  side comparison, sag, cut pipe ends, wheel fit, tow connection and both
  three-quarter views. A pale edge remains on one trailer wheel in the sheet.
- No changed test assertions. The candidate maximum increased by exactly
  1 MiB; no threshold was reduced. No race fingerprints apply.

## Readback

- GLB: 2,339,944 bytes.
- Triangles: 25,444, independently counted from the GLB indices.

## Removed

- Removed round-4 sheet and review when replacing them with round 5.
- Removed the Sal-photo downscales from the export recipe.
- No other prop, model or behavior was removed.
